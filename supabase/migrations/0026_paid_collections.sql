-- One job board for both sides of the business.
--
-- An agent could only ever be sent to an organization. A vendor who accepted a
-- $370 offer had nobody coming for the stock, so the paid side of the product
-- stopped at "accepted" -- an agreement with no way to fulfil it.
--
-- The plan's answer for businesses is an EasyPost label the vendor ships
-- against, and that still arrives. But shipping is not always the right
-- answer: a repair shop with a pallet of monitors cannot put it in a courier
-- bag, and a collection is what they actually need. The same van already
-- driving to a hospital can stop there.
--
-- So a job now hangs off either a pickup request or an accepted quote, never
-- both. That is the honest shape -- the two are genuinely different errands
-- (one is free and only counted, the other is bought and paid for) that share
-- a driver, a van and a day.

alter table job_assignments
  add column quote_id uuid references quotes(id) on delete cascade;

-- request_id was mandatory when a job could only be a pickup.
alter table job_assignments alter column request_id drop not null;

-- Exactly one of the two, never zero and never both. Without this a job could
-- point at nothing and still look valid in every join.
alter table job_assignments
  add constraint job_assignments_one_subject check (
    (request_id is not null and quote_id is null)
    or (request_id is null and quote_id is not null)
  );

-- Matches the request-side index: one live job per quote, so two agents cannot
-- both drive to the same shop.
create unique index job_assignments_one_active_quote
  on job_assignments (quote_id)
  where quote_id is not null and status <> 'cancelled';

create index job_assignments_quote_idx on job_assignments (quote_id);

/** Does the caller own, or work for, the business behind this quote. */
create or replace function owns_quote(p_quote_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from quotes q
     where q.id = p_quote_id
       and is_business_member(q.business_id)
  );
$$;

/** Is the caller the agent currently assigned to this quote. */
create or replace function is_assigned_agent_for_quote(p_quote_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from job_assignments a
     where a.quote_id = p_quote_id
       and a.agent_id = auth.uid()
       and a.status <> 'cancelled'
  );
$$;

-- The vendor sees who is coming for their stock, the same way an organization
-- sees who is coming to their dock.
drop policy if exists job_assignments_read on job_assignments;
create policy job_assignments_read on job_assignments for select using (
  agent_id = auth.uid()
  or is_platform_staff()
  or (request_id is not null and owns_request(request_id))
  or (quote_id is not null and owns_quote(quote_id))
);

-- And the agent has to be able to read the quote they are collecting against,
-- for the same reason they must be able to read the request: otherwise they
-- are sent to an address with no idea what they are picking up.
drop policy if exists quotes_read on quotes;
create policy quotes_read on quotes for select using (
  is_business_member(business_id)
  or is_platform_staff()
  or is_assigned_agent_for_quote(id)
);

drop policy if exists quote_items_read on quote_items;
create policy quote_items_read on quote_items for select using (
  exists (select 1 from quotes q where q.id = quote_id)
);

-- ---------------------------------------------------------------------------
-- The board, now covering both errands.
-- ---------------------------------------------------------------------------
drop function if exists list_available_jobs();
create or replace function list_available_jobs()
returns table (
  kind         text,
  subject_id   uuid,
  account_name text,
  street       text,
  city         text,
  state        char(2),
  unit_count   integer,
  -- Null for a free collection. Present, and worth showing prominently, for a
  -- paid one: an agent choosing between two jobs is choosing between two
  -- errands of different weight and value.
  payout_cents integer,
  window_start timestamptz,
  window_end   timestamptz,
  timezone     text
) language plpgsql stable security definer set search_path = public as $$
begin
  if not (is_field_agent() or is_platform_staff()) then
    raise exception 'Only field agents can see the job board' using errcode = '42501';
  end if;

  return query
    -- Free collections: a scheduled pickup nobody has claimed.
    select 'pickup'::text, r.id, o.name,
           coalesce(nullif(r.dock_address, ''), o.street),
           o.city, o.state, r.unit_count, null::integer,
           r.window_start, r.window_end, r.timezone
      from pickup_requests r
      join organizations o on o.id = r.org_id
     where r.status = 'scheduled'
       and not exists (
         select 1 from job_assignments a
          where a.request_id = r.id and a.status <> 'cancelled'
       )

    union all

    -- Paid collections: an accepted quote nobody has been sent for. No window,
    -- because a vendor agrees a price rather than booking a slot -- the agent
    -- calls to arrange a time.
    select 'collection'::text, q.id, b.name,
           b.street, b.city, b.state,
           (select coalesce(sum(i.quantity), 0)::integer from quote_items i where i.quote_id = q.id),
           q.total_cents,
           null::timestamptz, null::timestamptz, 'America/New_York'::text
      from quotes q
      join businesses b on b.id = q.business_id
     where q.status = 'accepted'
       and not exists (
         select 1 from job_assignments a
          where a.quote_id = q.id and a.status <> 'cancelled'
       )

     order by window_start nulls last;
end;
$$;

drop function if exists list_my_jobs();
create or replace function list_my_jobs()
returns table (
  id           uuid,
  kind         text,
  subject_id   uuid,
  status       job_status_enum,
  account_name text,
  street       text,
  city         text,
  state        char(2),
  zip          text,
  unit_count   integer,
  payout_cents integer,
  window_start timestamptz,
  window_end   timestamptz,
  timezone     text,
  claimed_at   timestamptz,
  collected_at timestamptz
) language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'Sign in to see your jobs' using errcode = '42501';
  end if;

  return query
    select a.id, 'pickup'::text, r.id, a.status, o.name,
           coalesce(nullif(r.dock_address, ''), o.street),
           o.city, o.state, o.zip, r.unit_count, null::integer,
           r.window_start, r.window_end, r.timezone, a.claimed_at, a.collected_at
      from job_assignments a
      join pickup_requests r on r.id = a.request_id
      join organizations o   on o.id = r.org_id
     where a.agent_id = auth.uid()

    union all

    select a.id, 'collection'::text, q.id, a.status, b.name,
           b.street, b.city, b.state, b.zip,
           (select coalesce(sum(i.quantity), 0)::integer from quote_items i where i.quote_id = q.id),
           q.total_cents,
           null::timestamptz, null::timestamptz, 'America/New_York'::text,
           a.claimed_at, a.collected_at
      from job_assignments a
      join quotes q     on q.id = a.quote_id
      join businesses b on b.id = q.business_id
     where a.agent_id = auth.uid()

     order by claimed_at desc;
end;
$$;

-- ---------------------------------------------------------------------------
-- Claiming and finishing, for either kind.
-- ---------------------------------------------------------------------------
create or replace function claim_collection(p_quote_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_status quote_status_enum;
  v_job    uuid;
begin
  if not is_field_agent() then
    raise exception 'Only field agents can claim jobs' using errcode = '42501';
  end if;

  select status into v_status from quotes where id = p_quote_id;
  if v_status is null then
    raise exception 'No such quote: %', p_quote_id using errcode = 'P0002';
  end if;
  -- Only an accepted offer is a job. An open one is still the vendor's to
  -- decide, and collecting against it would be taking stock nobody agreed to
  -- sell.
  if v_status <> 'accepted' then
    raise exception 'A % quote is not on the job board', v_status using errcode = '22023';
  end if;
  if exists (select 1 from job_assignments where quote_id = p_quote_id and status <> 'cancelled') then
    raise exception 'Another agent already took this job' using errcode = '23505';
  end if;

  insert into job_assignments (quote_id, agent_id) values (p_quote_id, auth.uid())
  returning id into v_job;

  insert into audit_events (actor_id, entity_type, entity_id, action, payload_json)
  values (auth.uid(), 'quote', p_quote_id, 'collection.claimed',
          jsonb_build_object('job_id', v_job));

  return v_job;
end;
$$;

-- advance_job assumed every job had a request to move alongside it. A
-- collection has a quote instead, and a quote has no 'in_transit' -- what
-- changes for the vendor is only that the stock is gone and payment is due.
create or replace function advance_job(
  p_job_id       uuid,
  p_status       job_status_enum,
  p_actual_units integer default null,
  p_notes        text default null
) returns void language plpgsql security definer set search_path = public as $$
declare
  v_job   job_assignments%rowtype;
  v_legal job_status_enum[];
begin
  select * into v_job from job_assignments where id = p_job_id;
  if v_job.id is null then
    raise exception 'No such job: %', p_job_id using errcode = 'P0002';
  end if;
  if v_job.agent_id <> auth.uid() and not is_platform_staff() then
    raise exception 'This job belongs to another agent' using errcode = '42501';
  end if;

  v_legal := case v_job.status
    when 'claimed'   then array['en_route', 'cancelled']::job_status_enum[]
    when 'en_route'  then array['on_site', 'cancelled']::job_status_enum[]
    when 'on_site'   then array['collected', 'cancelled']::job_status_enum[]
    else array[]::job_status_enum[]
  end;
  if not (p_status = any (v_legal)) then
    raise exception 'A % job cannot move to %', v_job.status, p_status using errcode = '22023';
  end if;
  if p_status = 'collected' and p_actual_units is null then
    raise exception 'Record how many devices you collected' using errcode = '22023';
  end if;

  update job_assignments
     set status       = p_status,
         arrived_at   = case when p_status = 'on_site'   then now() else arrived_at end,
         collected_at = case when p_status = 'collected' then now() else collected_at end,
         actual_units = coalesce(p_actual_units, actual_units),
         notes        = coalesce(nullif(p_notes, ''), notes)
   where id = p_job_id;

  if v_job.request_id is not null then
    update pickup_requests
       set status = case p_status
                      when 'en_route'  then 'in_transit'::request_status_enum
                      when 'on_site'   then 'in_transit'::request_status_enum
                      when 'collected' then 'completed'::request_status_enum
                      when 'cancelled' then 'scheduled'::request_status_enum
                      else status
                    end
     where id = v_job.request_id;
  end if;

  insert into audit_events (actor_id, entity_type, entity_id, action, payload_json)
  values (auth.uid(),
          case when v_job.request_id is not null then 'pickup_request' else 'quote' end,
          coalesce(v_job.request_id, v_job.quote_id),
          'job.' || p_status,
          jsonb_build_object('job_id', p_job_id, 'actual_units', p_actual_units));
end;
$$;

-- Devices collected now spans both kinds of errand, and adds what a paid
-- collection was worth -- the closest thing to earnings that exists until a
-- rate table does.
-- Dropped first: the return type gains a column, and `create or replace`
-- refuses to change the row type OUT parameters define.
drop function if exists my_agent_summary();
create or replace function my_agent_summary()
returns table (
  jobs_completed    bigint,
  devices_collected bigint,
  jobs_active       bigint,
  collected_value_cents bigint
) language sql stable security definer set search_path = public as $$
  select
    count(*) filter (where a.status = 'collected'),
    coalesce(sum(a.actual_units) filter (where a.status = 'collected'), 0),
    count(*) filter (where a.status in ('claimed', 'en_route', 'on_site')),
    coalesce(sum(q.total_cents) filter (where a.status = 'collected'), 0)
  from job_assignments a
  left join quotes q on q.id = a.quote_id
  where a.agent_id = auth.uid();
$$;
