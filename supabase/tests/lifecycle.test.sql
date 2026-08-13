-- Guards on the account-review (0015) and request-lifecycle (0016) RPCs.
--
-- These functions are security definer, so they run with the privileges of
-- their owner and their own role checks are the only thing standing between a
-- customer and their own approval. Each test below names the check it pins.
begin;
select plan(15);

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'owner@org-a.test'),
  ('22222222-2222-2222-2222-222222222222', 'stranger@org-b.test'),
  ('33333333-3333-3333-3333-333333333333', 'ops@rebin.test');
insert into profiles (id, full_name, status) values
  ('11111111-1111-1111-1111-111111111111', 'Org Owner', 'pending_verification'),
  ('22222222-2222-2222-2222-222222222222', 'Stranger',  'active'),
  ('33333333-3333-3333-3333-333333333333', 'Ops Staff', 'active');
insert into organizations (id, name, org_type, street, city, state, zip) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Org A', 'hospital', '1 A St', 'Boston', 'MA', '02108');
insert into organization_members values
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'org_owner');
insert into role_assignments (user_id, role, scope_type, scope_id) values
  ('11111111-1111-1111-1111-111111111111', 'org_owner', 'organization', 'aaaaaaaa-0000-0000-0000-000000000001'),
  ('33333333-3333-3333-3333-333333333333', 'platform_ops', 'platform', null);
-- Status set explicitly. 0027 made 'scheduled' the default so a customer
-- booking reaches a driver without anyone approving it, which left this row
-- landing in 'scheduled' and every transition below asserting against a state
-- it was never in. 'pending' is still a legal state and advance_pickup_request
-- still guards the moves out of it, so it is still worth exercising -- it just
-- has to be asked for now.
insert into pickup_requests (id, org_id, created_by, size_tier, unit_count, categories, window_start, window_end, timezone, on_site_contact_name, on_site_contact_phone, dock_address, status) values
  ('cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'tier_10_30', 25, '{computers_laptops}', now(), now() + interval '3 hours', 'America/New_York', 'A Contact', '5550100000', 'Dock A', 'pending');

-- ---------------------------------------------------------------------------
-- Account review: the whole point is that you cannot approve yourself.
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

select throws_ok(
  $$select set_organization_status('aaaaaaaa-0000-0000-0000-000000000001', 'active')$$,
  '42501',
  null,
  'an org owner cannot approve their own organization'
);

set local request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';

select lives_ok(
  $$select set_organization_status('aaaaaaaa-0000-0000-0000-000000000001', 'active')$$,
  'platform_ops can approve an organization'
);
select is(
  (select status from organizations where id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  'active'::account_status_enum,
  'approval moves the organization to active'
);
select isnt(
  (select verified_at from organizations where id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  null,
  'approval stamps verified_at'
);
select is(
  (select status from profiles where id = '11111111-1111-1111-1111-111111111111'),
  'active'::account_status_enum,
  'the org member''s own profile follows the organization'
);

-- ---------------------------------------------------------------------------
-- Request lifecycle.
-- ---------------------------------------------------------------------------
set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select throws_ok(
  $$select cancel_pickup_request('cccccccc-0000-0000-0000-000000000001')$$,
  '42501',
  null,
  'someone outside the org cannot cancel its pickup'
);

set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select throws_ok(
  $$select advance_pickup_request('cccccccc-0000-0000-0000-000000000001', 'completed')$$,
  '42501',
  null,
  'a customer cannot move their own request down the pipeline'
);

set local request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
select throws_ok(
  $$select advance_pickup_request('cccccccc-0000-0000-0000-000000000001', 'completed')$$,
  '22023',
  null,
  'even ops cannot jump a pending request straight to completed'
);
select lives_ok(
  $$select advance_pickup_request('cccccccc-0000-0000-0000-000000000001', 'under_review')$$,
  'ops can move a pending request to under_review'
);

-- Once it is out for delivery, cancelling is a phone call, not a button.
select advance_pickup_request('cccccccc-0000-0000-0000-000000000001', 'scheduled');
select advance_pickup_request('cccccccc-0000-0000-0000-000000000001', 'dispatched');

set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select throws_ok(
  $$select cancel_pickup_request('cccccccc-0000-0000-0000-000000000001')$$,
  '22023',
  null,
  'a dispatched pickup can no longer be cancelled'
);

-- ---------------------------------------------------------------------------
-- Rescheduling puts a scheduled pickup back in the queue.
-- ---------------------------------------------------------------------------
-- Explicit for the same reason as the fixture above: since 0027 a booking
-- lands 'scheduled', and this block is about the move out of 'pending'.
insert into pickup_requests (id, org_id, created_by, size_tier, unit_count, categories, window_start, window_end, timezone, on_site_contact_name, on_site_contact_phone, dock_address, status) values
  ('cccccccc-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'tier_10_30', 25, '{computers_laptops}', now(), now() + interval '3 hours', 'America/New_York', 'A Contact', '5550100000', 'Dock A', 'pending');
set local request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
select advance_pickup_request('cccccccc-0000-0000-0000-000000000002', 'under_review');
select advance_pickup_request('cccccccc-0000-0000-0000-000000000002', 'scheduled');

set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select reschedule_pickup_request(
  'cccccccc-0000-0000-0000-000000000002',
  now() + interval '2 days',
  now() + interval '2 days 3 hours'
);
select is(
  (select status from pickup_requests where id = 'cccccccc-0000-0000-0000-000000000002'),
  'pending'::request_status_enum,
  'rescheduling a scheduled pickup returns it to the queue'
);

-- ---------------------------------------------------------------------------
-- Org settings (0018). The point of the RPC is that it cannot reach `status`
-- or `verified_at`, so a customer cannot approve or verify themselves.
-- ---------------------------------------------------------------------------
set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select throws_ok(
  $$select update_own_organization('aaaaaaaa-0000-0000-0000-000000000001', 'Hijacked',
      'hospital', '9 Nowhere', 'Boston', 'MA', '02108', false)$$,
  '42501',
  null,
  'someone outside the org cannot edit its details'
);

set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select lives_ok(
  $$select update_own_organization('aaaaaaaa-0000-0000-0000-000000000001', 'Org A Renamed',
      'university', '7 New St', 'Cambridge', 'MA', '02139', true)$$,
  'an org owner can edit their own organization'
);
select is(
  (select name || '/' || city from organizations where id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  'Org A Renamed/Cambridge',
  'the edit lands'
);
select throws_ok(
  $$select update_own_organization('aaaaaaaa-0000-0000-0000-000000000001', 'Org A',
      'hospital', '7 New St', 'Cambridge', 'MA', 'nope', true)$$,
  '22023',
  null,
  'a malformed ZIP is refused'
);

select * from finish();
rollback;
