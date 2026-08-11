-- Job assignment guards (0024).
--
-- The rules worth protecting: two agents cannot take the same job, an agent
-- cannot touch another's, and a pickup cannot be finished without a count.
begin;
select plan(13);

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

select * from finish();
rollback;
