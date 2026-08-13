-- Tell the vendor what came off their own dock.
--
-- 0030 compares the collected count against the quote and holds the payout
-- when the two disagree. Three parties can see that flag: the agent who typed
-- the number, the office that has to settle it, and -- through
-- `my_agent_summary` -- the agent again, as a total that quietly shrank. The
-- business whose money is being held could see none of it. Their screen showed
-- an accepted offer, "we'll be in touch about payment", and then nothing, for
-- as long as it took someone to notice. Silence is the worst available answer
-- to "where is my money": it is indistinguishable from the platform hoping the
-- question goes away.
--
-- A function rather than a policy the client selects through. The RLS on
-- job_assignments (0026) already admits the owning business, so a direct
-- select would work -- and would hand the vendor `agent_id` and `notes`, the
-- driver's own running commentary, written for dispatch and never for the
-- customer. This returns the outcome and nothing else, so widening what the
-- office records about a job cannot widen what the vendor reads.

create or replace function quote_collection(p_quote_id uuid)
returns table (
  status          job_status_enum,
  collected_at    timestamptz,
  expected_units  integer,
  actual_units    integer,
  reconciliation  text,
  resolution_note text
) language plpgsql stable security definer set search_path = public as $$
declare v_business uuid;
begin
  select business_id into v_business from quotes where id = p_quote_id;
  if v_business is null then
    raise exception 'No such quote: %', p_quote_id using errcode = 'P0002';
  end if;
  -- The same three-way test `quotes_read` applies, restated because security
  -- definer turns RLS off: without it this function would report any
  -- business's collection to any signed-in caller who guessed a quote id.
  --
  -- The assigned agent is in the list because the agent's job screen loads
  -- this quote too. Excluding them would hide nothing -- they typed the count
  -- and can read their own job row -- and would only break the screen they
  -- work the job from.
  if not (
    is_business_member(v_business)
    or is_platform_staff()
    or is_assigned_agent_for_quote(p_quote_id)
  ) then
    raise exception 'Only a member of this business can see its collections'
      using errcode = '42501';
  end if;

  return query
    select a.status, a.collected_at, a.expected_units, a.actual_units,
           a.reconciliation, a.resolution_note
      from job_assignments a
     -- A cancelled job is an agent who did not come. The partial unique index
     -- in 0026 permits a cancelled row and a live one against the same quote,
     -- so without this the vendor is told about a visit that never happened --
     -- or gets two rows and a screen that has to pick.
     where a.quote_id = p_quote_id
       and a.status <> 'cancelled';
end;
$$;

grant execute on function quote_collection(uuid) to authenticated;
