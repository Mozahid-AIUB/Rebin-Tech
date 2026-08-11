-- Job assignments: which agent is collecting which pickup.
--
-- pickup_requests could already be advanced to 'dispatched' (0016), but
-- nothing recorded who was dispatched. So no agent could be shown their work,
-- no customer could be told who was coming, and no request could reach
-- 'completed' -- which is why the organization's "devices recycled" and the
-- whole certificate flow have been waiting on this table.

create type job_status_enum as enum ('claimed', 'en_route', 'on_site', 'collected', 'cancelled');

create table job_assignments (
  id           uuid primary key default gen_random_uuid(),
  request_id   uuid not null references pickup_requests(id) on delete cascade,
  agent_id     uuid not null references profiles(id),
  status       job_status_enum not null default 'claimed',
  claimed_at   timestamptz not null default now(),
  arrived_at   timestamptz,
  collected_at timestamptz,
  -- What the agent actually found, which is frequently not what was booked:
  -- an org that said 40 devices and had 52 is the normal case, not an error.
  actual_units integer check (actual_units >= 0),
  notes        text,
  created_at   timestamptz not null default now()
);

-- One live assignment per request. Two agents driving to the same dock is the
-- failure this index exists to make impossible; a cancelled one may sit
-- alongside the reassignment that replaced it.
create unique index job_assignments_one_active
  on job_assignments (request_id)
  where status <> 'cancelled';

create index job_assignments_agent_idx on job_assignments (agent_id, claimed_at desc);

alter table job_assignments enable row level security;

-- These two helpers exist to break a cycle, not to save typing. The request
-- policy needs to know about assignments and the assignment policy needs to
-- know about requests; written as plain subqueries each one re-enters the
-- other's policy and Postgres aborts with "infinite recursion detected".
-- Reading through a security definer function skips the second policy check,
-- which is what makes the pair terminate.

/** Does the caller own, or administer the org behind, this request. */
create or replace function owns_request(p_request_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from pickup_requests r
     where r.id = p_request_id
       and (r.created_by = auth.uid()
            or has_role('org_admin'::role_enum, r.org_id)
            or has_role('org_owner'::role_enum, r.org_id))
  );
$$;

/** Is the caller the agent currently assigned to this request. */
create or replace function is_assigned_agent(p_request_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from job_assignments a
     where a.request_id = p_request_id
       and a.agent_id = auth.uid()
       and a.status <> 'cancelled'
  );
$$;

-- An agent sees their own work; ops sees all of it; the customer sees who is
-- coming to their dock.
create policy job_assignments_read on job_assignments for select using (
  agent_id = auth.uid()
  or is_platform_staff()
  or owns_request(request_id)
);

-- req_read (0008) predates assignments, so it admits the customer and ops and
-- nobody else. An agent could therefore be sent to a dock and be unable to
-- read the request telling them what to collect. Replaced rather than added
-- to, because Postgres ORs multiple policies and leaving two named policies
-- covering the same table makes the real rule harder to find.
drop policy if exists req_read on pickup_requests;
create policy req_read on pickup_requests for select using (
  created_by = auth.uid()
  -- Casts spelled out: inside a policy the enum literals resolve as text and
  -- the whole expression fails with "argument of OR must be type boolean".
  or has_role('org_admin'::role_enum, org_id)
  or has_role('org_owner'::role_enum, org_id)
  or has_role('platform_ops'::role_enum)
  or has_role('platform_support'::role_enum)
  -- The agent holding the live assignment, and only while they hold it.
  or is_assigned_agent(id)
);

/** Anyone actively working as a field agent. */
create or replace function is_field_agent()
returns boolean language sql stable security definer set search_path = public as $$
  select has_role('field_agent') or has_role('field_lead');
$$;

/**
 * Work an agent can pick up: scheduled pickups nobody has claimed.
 *
 * Matched on the request's state rather than on distance. Routing by service
 * area needs geocoded addresses, and matching on a ZIP string would quietly
 * hide jobs one street over -- worse than showing an agent everything while
 * the board is small.
 */
create or replace function list_available_jobs()
returns table (
  request_id   uuid,
  org_name     text,
  city         text,
  state        char(2),
  unit_count   integer,
  categories   device_category_enum[],
  window_start timestamptz,
  window_end   timestamptz,
  timezone     text
) language plpgsql stable security definer set search_path = public as $$
begin
  if not (is_field_agent() or is_platform_staff()) then
    raise exception 'Only field agents can see the job board' using errcode = '42501';
  end if;

  return query
    select r.id, o.name, o.city, o.state, r.unit_count, r.categories,
           r.window_start, r.window_end, r.timezone
      from pickup_requests r
      join organizations o on o.id = r.org_id
     where r.status = 'scheduled'
       and not exists (
         select 1 from job_assignments a
          where a.request_id = r.id and a.status <> 'cancelled'
       )
     order by r.window_start;
end;
$$;

/** The agent's own jobs, with everything the dispatch list shows. */
create or replace function list_my_jobs()
returns table (
  id           uuid,
  request_id   uuid,
  status       job_status_enum,
  org_name     text,
  street       text,
  city         text,
  state        char(2),
  zip          text,
  unit_count   integer,
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
    select a.id, a.request_id, a.status, o.name,
           -- The dock address the customer typed wins over the org's
           -- registered street: a hospital's mailing address is often not
           -- the loading bay.
           coalesce(nullif(r.dock_address, ''), o.street),
           o.city, o.state, o.zip, r.unit_count,
           r.window_start, r.window_end, r.timezone, a.claimed_at, a.collected_at
      from job_assignments a
      join pickup_requests r on r.id = a.request_id
      join organizations o   on o.id = r.org_id
     where a.agent_id = auth.uid()
     order by a.claimed_at desc;
end;
$$;

/**
 * Claims a job for the calling agent and dispatches the request.
 *
 * The unique index above is what actually prevents two agents taking the same
 * job; the check here exists to turn that collision into a sentence the agent
 * can read rather than a constraint violation.
 */
create or replace function claim_job(p_request_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_status request_status_enum;
  v_job    uuid;
begin
  if not is_field_agent() then
    raise exception 'Only field agents can claim jobs' using errcode = '42501';
  end if;

  select status into v_status from pickup_requests where id = p_request_id;
  if v_status is null then
    raise exception 'No such pickup request: %', p_request_id using errcode = 'P0002';
  end if;
  if v_status <> 'scheduled' then
    raise exception 'A % pickup is not on the job board', v_status using errcode = '22023';
  end if;
  if exists (select 1 from job_assignments where request_id = p_request_id and status <> 'cancelled') then
    raise exception 'Another agent already took this job' using errcode = '23505';
  end if;

  insert into job_assignments (request_id, agent_id)
  values (p_request_id, auth.uid())
  returning id into v_job;

  -- The customer's view moves with the agent's: 'dispatched' is what the
  -- request detail screen shows once somebody is coming.
  update pickup_requests set status = 'dispatched' where id = p_request_id;

  insert into audit_events (actor_id, entity_type, entity_id, action, payload_json)
  values (auth.uid(), 'pickup_request', p_request_id, 'job.claimed',
          jsonb_build_object('job_id', v_job));

  return v_job;
end;
$$;

/**
 * Moves a job along, and the customer's request with it.
 *
 * One function rather than start/arrive/finish, because the interesting part
 * is the same in each: which transitions are legal, and what the request
 * should say while the agent is at that stage.
 */
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
  -- Counted, not assumed: the count is what the certificate and any later
  -- dispute rest on, so finishing a job without one is refused.
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

  update pickup_requests
     set status = case p_status
                    when 'en_route'  then 'in_transit'::request_status_enum
                    when 'on_site'   then 'in_transit'::request_status_enum
                    when 'collected' then 'completed'::request_status_enum
                    -- A cancelled assignment returns the job to the board
                    -- rather than cancelling the customer's pickup: the org
                    -- still wants their devices gone.
                    when 'cancelled' then 'scheduled'::request_status_enum
                    else status
                  end
   where id = v_job.request_id;

  insert into audit_events (actor_id, entity_type, entity_id, action, payload_json)
  values (auth.uid(), 'pickup_request', v_job.request_id, 'job.' || p_status,
          jsonb_build_object('job_id', p_job_id, 'actual_units', p_actual_units));
end;
$$;

/** What an agent has done: jobs completed and devices collected. */
create or replace function my_agent_summary()
returns table (jobs_completed bigint, devices_collected bigint, jobs_active bigint)
language sql stable security definer set search_path = public as $$
  select
    count(*) filter (where status = 'collected'),
    coalesce(sum(actual_units) filter (where status = 'collected'), 0),
    count(*) filter (where status in ('claimed', 'en_route', 'on_site'))
  from job_assignments
  where agent_id = auth.uid();
$$;
