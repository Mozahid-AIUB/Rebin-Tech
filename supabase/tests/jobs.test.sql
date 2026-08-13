-- Job assignment guards (0024).
--
-- The rules worth protecting: two agents cannot take the same job, an agent
-- cannot touch another's, and a pickup cannot be finished without a count.
begin;
select plan(24);

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'owner@org-a.test'),
  ('77777777-7777-7777-7777-777777777777', 'agent1@rebin.test'),
  ('88888888-8888-8888-8888-888888888888', 'agent2@rebin.test'),
  ('33333333-3333-3333-3333-333333333333', 'ops@rebin.test');
insert into profiles (id, full_name, status) values
  ('11111111-1111-1111-1111-111111111111', 'Org Owner', 'active'),
  ('77777777-7777-7777-7777-777777777777', 'Agent One', 'active'),
  ('88888888-8888-8888-8888-888888888888', 'Agent Two', 'active'),
  ('33333333-3333-3333-3333-333333333333', 'Ops Staff', 'active');
insert into organizations (id, name, org_type, street, city, state, zip, status) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Org A', 'hospital', '1 A St', 'Boston', 'MA', '02108', 'active');
insert into organization_members values
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'org_owner');
insert into role_assignments (user_id, role, scope_type, scope_id) values
  ('11111111-1111-1111-1111-111111111111', 'org_owner',    'organization', 'aaaaaaaa-0000-0000-0000-000000000001'),
  ('77777777-7777-7777-7777-777777777777', 'field_agent',  'self',         null),
  ('88888888-8888-8888-8888-888888888888', 'field_agent',  'self',         null),
  ('33333333-3333-3333-3333-333333333333', 'platform_ops', 'platform',     null);
insert into pickup_requests (id, org_id, created_by, size_tier, unit_count, categories, window_start, window_end, timezone, on_site_contact_name, on_site_contact_phone, dock_address, status) values
  ('cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'tier_30_100', 40, '{computers_laptops}', now() + interval '2 days', now() + interval '2 days 3 hours', 'America/New_York', 'Dana', '5550100000', 'Dock A', 'scheduled');

-- The vendor's fixtures join the others here, before the session drops to
-- `authenticated` -- these tables have no insert policy, by design.
insert into businesses (id, name, business_type, street, city, state, zip, status) values
  ('bbbbbbbb-9999-0000-0000-000000000009', 'Eastside Repair', 'repair_shop', '14 Market St', 'Newark', 'NJ', '07102', 'active');
insert into auth.users (id, email) values
  ('99999999-9999-9999-9999-999999999999', 'shop@eastside.test');
insert into profiles (id, full_name, status) values
  ('99999999-9999-9999-9999-999999999999', 'Shop Owner', 'active');
insert into business_members values
  ('bbbbbbbb-9999-0000-0000-000000000009', '99999999-9999-9999-9999-999999999999', 'biz_owner');
insert into role_assignments (user_id, role, scope_type, scope_id) values
  ('99999999-9999-9999-9999-999999999999', 'biz_owner', 'business', 'bbbbbbbb-9999-0000-0000-000000000009');

set local role authenticated;

-- ---------------------------------------------------------------------------
-- The job board is for agents.
-- ---------------------------------------------------------------------------
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select throws_ok(
  $$select * from list_available_jobs()$$,
  '42501',
  null,
  'a customer cannot browse the job board'
);
select throws_ok(
  $$select claim_job('cccccccc-0000-0000-0000-000000000001')$$,
  '42501',
  null,
  'a customer cannot claim their own pickup'
);

set local request.jwt.claim.sub = '77777777-7777-7777-7777-777777777777';
select is(
  (select count(*)::int from list_available_jobs()),
  1,
  'a scheduled, unclaimed pickup is on the board'
);

-- ---------------------------------------------------------------------------
-- Claiming takes it off the board and tells the customer someone is coming.
-- ---------------------------------------------------------------------------
create temporary table job as select claim_job('cccccccc-0000-0000-0000-000000000001') as id;

select is(
  (select status::text from pickup_requests where id = 'cccccccc-0000-0000-0000-000000000001'),
  'dispatched',
  'claiming dispatches the customer''s request'
);
select is(
  (select count(*)::int from list_available_jobs()),
  0,
  'a claimed job leaves the board'
);

set local request.jwt.claim.sub = '88888888-8888-8888-8888-888888888888';
-- Refused as "not on the board" rather than "already taken": claiming moves
-- the request to 'dispatched', so the status check catches it first. Both
-- guards are real -- the duplicate check and the unique index behind it still
-- hold if a request were ever dispatched without an assignment -- but this is
-- the message a second agent actually gets.
select throws_ok(
  $$select claim_job('cccccccc-0000-0000-0000-000000000001')$$,
  '22023',
  null,
  'a second agent cannot take a job that is already taken'
);
select throws_ok(
  format($$select advance_job(%L, 'en_route')$$, (select id from job)),
  '42501',
  null,
  'an agent cannot move another agent''s job'
);
select is(
  (select count(*)::int from list_my_jobs()),
  0,
  'an agent sees none of another agent''s jobs'
);

-- ---------------------------------------------------------------------------
-- Working the job through, one stage at a time.
-- ---------------------------------------------------------------------------
set local request.jwt.claim.sub = '77777777-7777-7777-7777-777777777777';
select throws_ok(
  format($$select advance_job(%L, 'collected', 40)$$, (select id from job)),
  '22023',
  null,
  'a claimed job cannot jump straight to collected'
);

select advance_job((select id from job), 'en_route');
select advance_job((select id from job), 'on_site');

-- The count is what the certificate rests on, so finishing without one is
-- refused rather than defaulted to what was booked.
select throws_ok(
  format($$select advance_job(%L, 'collected')$$, (select id from job)),
  '22023',
  null,
  'collecting without a device count is refused'
);

select lives_ok(
  format($$select advance_job(%L, 'collected', 52)$$, (select id from job)),
  'the agent can complete the job with a count'
);
select is(
  (select status::text from pickup_requests where id = 'cccccccc-0000-0000-0000-000000000001'),
  'completed',
  'collecting completes the customer''s request -- the first thing that ever has'
);
select is(
  (select devices_collected::int from my_agent_summary()),
  52,
  'the summary counts what was actually collected, not what was booked'
);

-- ---------------------------------------------------------------------------
-- Paid collections: an accepted quote is an errand too (0026).
-- ---------------------------------------------------------------------------
set local request.jwt.claim.sub = '99999999-9999-9999-9999-999999999999';
create temporary table vq as select create_quote(
  'bbbbbbbb-9999-0000-0000-000000000009',
  '[{"componentKey":"laptop","grade":"working","quantity":2,"confidence":95}]'::jsonb
) as id;

-- An open offer is still the vendor's to decide; collecting against it would
-- be taking stock nobody agreed to sell.
set local request.jwt.claim.sub = '77777777-7777-7777-7777-777777777777';
select throws_ok(
  format($$select claim_collection(%L)$$, (select id from vq)),
  '22023',
  null,
  'an undecided quote is not on the job board'
);

set local request.jwt.claim.sub = '99999999-9999-9999-9999-999999999999';
select decide_quote((select id from vq), true);

set local request.jwt.claim.sub = '77777777-7777-7777-7777-777777777777';
select is(
  (select count(*)::int from list_available_jobs() where kind = 'collection'),
  1,
  'an accepted quote appears on the same board as a free pickup'
);
select is(
  (select payout_cents from list_available_jobs() where kind = 'collection'),
  24000,
  'the board shows what a paid collection is worth'
);

create temporary table vjob as select claim_collection((select id from vq)) as id;

select is(
  (select count(*)::int from list_available_jobs() where kind = 'collection'),
  0,
  'a claimed collection leaves the board'
);
select is(
  (select kind from list_my_jobs() where id = (select id from vjob)),
  'collection',
  'the agent sees it among their own jobs, marked as a collection'
);

-- The agent must be able to read the quote they were sent for, or they arrive
-- at a shop with no idea what they are picking up.
select is(
  (select count(*)::int from quotes where id = (select id from vq)),
  1,
  'the assigned agent can read the quote behind their job'
);

select advance_job((select id from vjob), 'en_route');
select advance_job((select id from vjob), 'on_site');
select lives_ok(
  format($$select advance_job(%L, 'collected', 2)$$, (select id from vjob)),
  'a collection finishes the same way a pickup does'
);
select is(
  (select collected_value_cents::int from my_agent_summary()),
  24000,
  'the agent summary counts what the paid collections were worth'
);

-- ---------------------------------------------------------------------------
-- The whole point of the board: a customer books, a driver can see it (0027).
--
-- These pin the two paths end to end, because both were broken at different
-- times and neither failure was visible from either side alone -- an
-- organization saw "submitted" and an agent saw an empty board.
-- ---------------------------------------------------------------------------
insert into pickup_requests (id, org_id, created_by, size_tier, unit_count, categories, window_start, window_end, timezone, on_site_contact_name, on_site_contact_phone, dock_address) values
  ('cccccccc-0000-0000-0000-00000000000f', 'aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'tier_10_30', 12, '{monitors_displays}', now() + interval '3 days', now() + interval '3 days 3 hours', 'America/New_York', 'Dana', '5550100000', 'Dock B');

select is(
  (select status::text from pickup_requests where id = 'cccccccc-0000-0000-0000-00000000000f'),
  'scheduled',
  'a booking lands scheduled, not parked in a queue nobody works'
);

set local request.jwt.claim.sub = '77777777-7777-7777-7777-777777777777';
select is(
  (select count(*)::int from list_available_jobs()
    where kind = 'pickup' and subject_id = 'cccccccc-0000-0000-0000-00000000000f'),
  1,
  'an organization booking reaches the agent job board'
);

-- And the paid path, from the same board.
select is(
  (select count(*)::int from list_available_jobs() where kind = 'collection'),
  0,
  'the accepted quote from earlier was claimed, so it is off the board'
);

select * from finish();
rollback;
