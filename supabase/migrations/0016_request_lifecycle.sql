-- Pickup request lifecycle: the transitions S29 needs.
--
-- pickup_requests had INSERT and SELECT policies and nothing else, so a
-- request was immutable from the moment it was booked -- no cancel, no
-- reschedule, and no path to any status past 'pending'.
--
-- Same reasoning as 0015: RPCs, not an UPDATE policy. A policy that let the
-- client write `status` would let an organization mark its own pickup
-- 'completed' and mint a recycling certificate for devices nobody collected.
-- Which transitions are legal is a business rule, so it lives in a function.

/** Can this caller act on the request -- its author, or an admin of its org. */
create or replace function can_manage_request(p_request_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from pickup_requests r
     where r.id = p_request_id
       and (
         r.created_by = auth.uid()
         or has_role('org_admin', r.org_id)
         or has_role('org_owner', r.org_id)
       )
  );
$$;

-- Cancellable only before an agent is on the way. Once dispatched, someone is
-- already driving to the dock; that is a support call, not a button.
create or replace function cancel_pickup_request(p_request_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_status request_status_enum;
begin
  select status into v_status from pickup_requests where id = p_request_id;
  if v_status is null then
    raise exception 'No such pickup request: %', p_request_id using errcode = 'P0002';
  end if;
  if not (can_manage_request(p_request_id) or is_platform_staff()) then
    raise exception 'Not authorised to cancel this request' using errcode = '42501';
  end if;
  if v_status not in ('pending', 'under_review', 'scheduled') then
    raise exception 'A % pickup can no longer be cancelled', v_status
      using errcode = '22023';
  end if;

  update pickup_requests set status = 'cancelled' where id = p_request_id;

  insert into audit_events (actor_id, entity_type, entity_id, action, payload_json)
  values (auth.uid(), 'pickup_request', p_request_id, 'pickup_request.cancelled',
          jsonb_build_object('from', v_status));
end;
$$;

create or replace function reschedule_pickup_request(
  p_request_id  uuid,
  p_window_start timestamptz,
  p_window_end   timestamptz
) returns void language plpgsql security definer set search_path = public as $$
declare v_status request_status_enum;
begin
  select status into v_status from pickup_requests where id = p_request_id;
  if v_status is null then
    raise exception 'No such pickup request: %', p_request_id using errcode = 'P0002';
  end if;
  if not (can_manage_request(p_request_id) or is_platform_staff()) then
    raise exception 'Not authorised to reschedule this request' using errcode = '42501';
  end if;
  if v_status not in ('pending', 'under_review', 'scheduled') then
    raise exception 'A % pickup can no longer be rescheduled', v_status
      using errcode = '22023';
  end if;
  if p_window_end <= p_window_start then
    raise exception 'The pickup window must end after it starts' using errcode = '22023';
  end if;

  update pickup_requests
     set window_start = p_window_start,
         window_end   = p_window_end,
         -- Back to the queue: a moved date needs re-scheduling, and leaving it
         -- 'scheduled' would claim a slot that no longer exists.
         status = case when v_status = 'scheduled' then 'pending' else v_status end
   where id = p_request_id;

  insert into audit_events (actor_id, entity_type, entity_id, action, payload_json)
  values (auth.uid(), 'pickup_request', p_request_id, 'pickup_request.rescheduled',
          jsonb_build_object('window_start', p_window_start, 'window_end', p_window_end));
end;
$$;

-- Forward movement through the pipeline is operations' job, not the
-- customer's. Separate from the two above precisely because the caller is
-- different -- the org books and cancels; the platform dispatches.
create or replace function advance_pickup_request(
  p_request_id uuid,
  p_status     request_status_enum
) returns void language plpgsql security definer set search_path = public as $$
declare
  v_status request_status_enum;
  v_legal  request_status_enum[];
begin
  if not is_platform_staff() then
    raise exception 'Only platform staff can move a request through the pipeline'
      using errcode = '42501';
  end if;

  select status into v_status from pickup_requests where id = p_request_id;
  if v_status is null then
    raise exception 'No such pickup request: %', p_request_id using errcode = 'P0002';
  end if;

  -- One step at a time. Without this a request could jump straight to
  -- 'completed', which is the state a recycling certificate is issued from.
  -- Each branch casts on its own: a bare array[...] literal is text[], and
  -- CASE resolves its result type from the first branch, so a single cast on
  -- the whole expression fails with "could not convert type text[]".
  v_legal := case v_status
    when 'pending'      then array['under_review', 'cancelled']::request_status_enum[]
    when 'under_review' then array['scheduled', 'cancelled']::request_status_enum[]
    when 'scheduled'    then array['dispatched', 'cancelled']::request_status_enum[]
    when 'dispatched'   then array['in_transit', 'cancelled']::request_status_enum[]
    when 'in_transit'   then array['completed']::request_status_enum[]
    else array[]::request_status_enum[]
  end;

  if not (p_status = any (v_legal)) then
    raise exception 'Cannot move a % request to %', v_status, p_status
      using errcode = '22023';
  end if;

  update pickup_requests set status = p_status where id = p_request_id;

  insert into audit_events (actor_id, entity_type, entity_id, action, payload_json)
  values (auth.uid(), 'pickup_request', p_request_id, 'pickup_request.status_changed',
          jsonb_build_object('from', v_status, 'to', p_status));
end;
$$;
