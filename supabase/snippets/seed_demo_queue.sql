-- Fill the console's two queues with something to work on.
--
-- The database is healthy but idle: every account has already been approved,
-- and no organization has filed a pickup. Both queues are therefore correctly
-- empty, which proves the console reads them and proves nothing else. This
-- gives an operator work to do so the actions can be exercised end to end.
--
-- Safe to re-run: every insert is keyed on a name and skipped if it exists.
--
-- Demo data only. Everything it creates carries the 'demo' marker in the
-- address or name, and the tear-down at the bottom of this file removes it.

-- ---------------------------------------------------------------- accounts

-- Two accounts left pending, so the approval queue has both kinds in it.
insert into organizations (name, org_type, street, city, state, zip, facility_timezone, dock_access, status)
select 'Northgate Community College (demo)', 'university', '4120 Northgate Ave', 'Columbus', 'OH', '43215',
       'America/New_York', true, 'pending_verification'
where not exists (select 1 from organizations where name = 'Northgate Community College (demo)');

insert into businesses (name, business_type, street, city, state, zip, status)
select 'Halverson IT Recyclers (demo)', 'it_reseller', '88 Kirby St', 'Cleveland', 'OH', '44114',
       'pending_verification'
where not exists (select 1 from businesses where name = 'Halverson IT Recyclers (demo)');

-- ---------------------------------------------------------------- requests

-- Four requests spread across the pipeline, so the rail and the transition
-- buttons have something to show at more than one stage. They are attached to
-- an already-active organization and its owner, because a pickup filed by an
-- unverified org is not a state the product produces.
do $$
declare
  v_org  uuid;
  v_user uuid;
begin
  select o.id, om.user_id
    into v_org, v_user
    from organizations o
    join organization_members om on om.org_id = o.id
   where o.status = 'active'
   order by o.created_at
   limit 1;

  if v_org is null then
    raise exception
      'No active organization with a member to file demo requests against.';
  end if;

  insert into pickup_requests (
    org_id, created_by, dock_address, size_tier, unit_count, categories,
    window_start, window_end, timezone, on_site_contact_name,
    on_site_contact_phone, instructions, status
  )
  select v_org, v_user, d.addr, d.tier::size_tier_enum, d.units, d.cats::device_category_enum[],
         now() + d.offset_days, now() + d.offset_days + interval '4 hours',
         'America/New_York', d.contact, d.phone, d.notes, d.status::request_status_enum
    from (values
      ('Loading dock B, 4120 Northgate Ave (demo)', 'tier_30_100',  64,
       array['computers_laptops','monitors_displays'], interval '2 days',
       'Dana Whitfield', '5550100010',
       'Gate code 4417. Dock is on the north side, past the skip.', 'pending'),
      ('Service entrance, 900 Riverside Pkwy (demo)', 'tier_10_30',  22,
       array['copiers_printers'], interval '3 days',
       'Marcus Bell', '5550100011',
       'Ask for facilities at reception.', 'pending'),
      ('Bay 3, 15 Foundry Row (demo)', 'tier_100_300', 180,
       array['server_gear','batteries_ups'], interval '5 days',
       'Priya Raman', '5550100012',
       'Pallet jack available. Two racks are still powered -- do not pull.', 'under_review'),
      ('Rear dock, 2200 Lakeshore Dr (demo)', 'tier_30_100', 48,
       array['computers_laptops','batteries_ups'], interval '1 day',
       'Owen Trask', '5550100013',
       'Half-day access only, before 12:00.', 'scheduled')
    ) as d(addr, tier, units, cats, offset_days, contact, phone, notes, status)
   where not exists (
     select 1 from pickup_requests r where r.dock_address = d.addr
   );
end;
$$;

-- What the console should now show.
select
  (select count(*) from pending_accounts)                      as accounts_waiting,
  (select count(*) from pickup_requests where status = 'pending')      as pending,
  (select count(*) from pickup_requests where status = 'under_review') as under_review,
  (select count(*) from pickup_requests where status = 'scheduled')    as scheduled;

-- ---------------------------------------------------------------- teardown
--
-- Run this block to remove everything above once the demo is finished.
--
-- delete from pickup_requests where dock_address like '%(demo)%';
-- delete from organizations     where name like '%(demo)%';
-- delete from businesses        where name like '%(demo)%';
