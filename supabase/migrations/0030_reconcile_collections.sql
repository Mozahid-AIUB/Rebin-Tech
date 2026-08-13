-- Compare what came off the dock against what was quoted, and hold the money
-- when they disagree.
--
-- The leak: `advance_job` has always demanded a count before a job could be
-- marked collected, written it to `actual_units`, and put it in the audit log.
-- Nothing ever compared it to anything. `my_agent_summary` sums
-- `quotes.total_cents` for every collected job, so a vendor who scanned ten
-- laptops and had seven on the dock was still owed for ten. The number the
-- agent typed was recorded and ignored.
--
-- Flagged, not repriced. `actual_units` is one total and a quote is many lines
-- at different rates -- "three short" does not say which three, and no
-- arithmetic recovers it. Repricing on a guess would be the same mistake in
-- the other direction: instead of overpaying silently it would underpay
-- silently. A person decides, and the money waits.
--
-- Free pickups do not reconcile. An organization's booked count and its actual
-- count differ on most collections and always have -- that is why the actual
-- one is recorded -- but nobody is paid either number, so a difference is
-- information rather than a problem.

alter table job_assignments
  -- Snapshotted at collection rather than joined at read time, for the same
  -- reason quote_items copies its prices: the quote is the record of what was
  -- agreed, and a later edit must not rewrite what the agent was sent for.
  add column expected_units integer,
  add column reconciliation text not null default 'not_required'
    check (reconciliation in ('not_required', 'matched', 'mismatch', 'resolved')),
  add column resolved_by uuid references profiles(id),
  add column resolved_at timestamptz,
  add column resolution_note text;

comment on column job_assignments.reconciliation is
  'not_required: a free pickup, nothing is owed. matched: the count agreed '
  'with the quote. mismatch: it did not, and the payout is held. resolved: a '
  'human settled it and the payout is released.';

-- Rebuilt to set the three new columns when a collection is finished.
-- Everything above that line is unchanged from 0026.
create or replace function advance_job(
  p_job_id       uuid,
  p_status       job_status_enum,
  p_actual_units integer default null,
  p_notes        text default null
) returns void language plpgsql security definer set search_path = public as $$
declare
  v_job      job_assignments%rowtype;
  v_legal    job_status_enum[];
  v_expected integer;
  v_state    text;
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

  -- Only a paid collection has something to reconcile against.
  if p_status = 'collected' and v_job.quote_id is not null then
    select coalesce(sum(quantity), 0) into v_expected
      from quote_items where quote_id = v_job.quote_id;
    v_state := case when p_actual_units = v_expected then 'matched' else 'mismatch' end;
  else
    v_expected := null;
    v_state := v_job.reconciliation;
  end if;

  update job_assignments
     set status         = p_status,
         arrived_at     = case when p_status = 'on_site'   then now() else arrived_at end,
         collected_at   = case when p_status = 'collected' then now() else collected_at end,
         actual_units   = coalesce(p_actual_units, actual_units),
         notes          = coalesce(nullif(p_notes, ''), notes),
         expected_units = coalesce(v_expected, expected_units),
         reconciliation = v_state
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
          jsonb_build_object(
            'job_id', p_job_id,
            'actual_units', p_actual_units,
            'expected_units', v_expected,
            'reconciliation', v_state));
end;
$$;

/**
 * Settles a collection whose count did not match its quote.
 *
 * Platform staff only, and deliberately not the agent who reported the gap:
 * a discrepancy someone can wave away themselves is not a control, and the
 * agent is the one person with a reason to want it gone. Until an admin screen
 * exists this is called from the SQL editor, which is also why the note is
 * required rather than optional -- six weeks later the only thing anyone will
 * have is that sentence.
 */
create or replace function resolve_collection_units(p_job_id uuid, p_note text)
returns void language plpgsql security definer set search_path = public as $$
declare v_job job_assignments%rowtype;
begin
  if not is_platform_staff() then
    raise exception 'Only platform staff can settle a collection discrepancy'
      using errcode = '42501';
  end if;
  if coalesce(nullif(trim(p_note), ''), null) is null then
    raise exception 'Say why the counts differed' using errcode = '22023';
  end if;

  select * into v_job from job_assignments where id = p_job_id;
  if v_job.id is null then
    raise exception 'No such job: %', p_job_id using errcode = 'P0002';
  end if;
  if v_job.reconciliation <> 'mismatch' then
    raise exception 'That collection has nothing outstanding' using errcode = '22023';
  end if;

  update job_assignments
     set reconciliation  = 'resolved',
         resolved_by     = auth.uid(),
         resolved_at     = now(),
         resolution_note = trim(p_note)
   where id = p_job_id;

  insert into audit_events (actor_id, entity_type, entity_id, action, payload_json)
  values (auth.uid(), 'quote', v_job.quote_id, 'job.units_resolved',
          jsonb_build_object(
            'job_id', p_job_id,
            'expected_units', v_job.expected_units,
            'actual_units', v_job.actual_units,
            'note', trim(p_note)));
end;
$$;

grant execute on function resolve_collection_units(uuid, text) to authenticated;

-- The payable total now skips anything still under question. Dropped first:
-- `create or replace` refuses to change the row type OUT parameters define,
-- and this keeps the same shape but is rewritten below anyway.
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
    -- A collection whose count is unexplained is not money anyone can count
    -- on. It reappears here the moment someone settles it.
    coalesce(sum(q.total_cents) filter (
      where a.status = 'collected' and a.reconciliation <> 'mismatch'
    ), 0)
  from job_assignments a
  left join quotes q on q.id = a.quote_id
  where a.agent_id = auth.uid();
$$;
