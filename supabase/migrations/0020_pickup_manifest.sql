-- The device manifest behind a pickup request (S25).
--
-- pickup_requests carries a count and a set of categories, which is what the
-- form asks for. The camera produces something different and more valuable: a
-- row per device, with the serial or asset tag when one was legible.
--
-- That distinction is the whole point for a hospital. "42 devices, computers
-- and monitors" is a booking; "this drive, serial ABC123, was collected" is
-- the record a compliance officer needs when asked what happened to it.
create table pickup_request_items (
  id           uuid primary key default gen_random_uuid(),
  request_id   uuid not null references pickup_requests(id) on delete cascade,
  category     device_category_enum not null,
  make         text,
  model        text,
  -- Nullable: plenty of devices have no legible tag, and a manifest that only
  -- accepted identified ones would quietly omit the rest.
  serial       text,
  -- 0-100, as returned by the model. Kept so a disputed line can be judged on
  -- what the scan actually claimed rather than on the value it was rounded to.
  confidence   smallint check (confidence between 0 and 100),
  -- Whether a human corrected or entered this line. A manifest that cannot
  -- distinguish "the camera said so" from "a person typed it" is not evidence.
  source       text not null default 'scan' check (source in ('scan', 'manual')),
  created_at   timestamptz not null default now()
);

create index pickup_request_items_request_idx on pickup_request_items (request_id);

alter table pickup_request_items enable row level security;

-- Follows the request it belongs to rather than restating who may see it:
-- req_read (0008) already answers that, and two copies of the rule would drift.
create policy request_items_read on pickup_request_items for select using (
  exists (select 1 from pickup_requests r where r.id = request_id)
);

create policy request_items_insert on pickup_request_items for insert with check (
  exists (
    select 1 from pickup_requests r
     where r.id = request_id
       and r.created_by = auth.uid()
       and r.org_id in (select org_id from organization_members where user_id = auth.uid())
  )
);

-- A booking wizard writes the whole manifest at once, and a request with half
-- its devices recorded is worse than one with none -- the count would say 40
-- and the manifest 12, with nothing to say which is right.
create or replace function add_pickup_request_items(
  p_request_id uuid,
  p_items      jsonb
) returns integer language plpgsql security definer set search_path = public as $$
declare v_count integer;
begin
  if not exists (
    select 1 from pickup_requests r
     where r.id = p_request_id
       and (r.created_by = auth.uid()
            or has_role('org_admin', r.org_id)
            or has_role('org_owner', r.org_id))
  ) then
    raise exception 'Not authorised to add items to this request' using errcode = '42501';
  end if;

  insert into pickup_request_items (request_id, category, make, model, serial, confidence, source)
  select p_request_id,
         (item ->> 'category')::device_category_enum,
         nullif(item ->> 'make', ''),
         nullif(item ->> 'model', ''),
         nullif(item ->> 'serial', ''),
         (item ->> 'confidence')::smallint,
         coalesce(nullif(item ->> 'source', ''), 'scan')
    from jsonb_array_elements(p_items) as item;

  get diagnostics v_count = row_count;

  insert into audit_events (actor_id, entity_type, entity_id, action, payload_json)
  values (auth.uid(), 'pickup_request', p_request_id, 'pickup_request.manifest_added',
          jsonb_build_object('items', v_count));

  return v_count;
end;
$$;
