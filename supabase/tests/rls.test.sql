begin;
select plan(4);

-- Fixtures: two orgs, one member each, one request each
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'a@org-a.test'),
  ('22222222-2222-2222-2222-222222222222', 'b@org-b.test');
insert into profiles (id, full_name, status) values
  ('11111111-1111-1111-1111-111111111111', 'User A', 'active'),
  ('22222222-2222-2222-2222-222222222222', 'User B', 'active');
insert into organizations (id, name, org_type, street, city, state, zip) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Org A', 'hospital', '1 A St', 'Boston', 'MA', '02108'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'Org B', 'k12_school', '2 B St', 'Austin', 'TX', '73301');
insert into organization_members values
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'org_owner'),
  ('bbbbbbbb-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'org_owner');
insert into role_assignments (user_id, role, scope_type, scope_id) values
  ('11111111-1111-1111-1111-111111111111', 'org_owner', 'organization', 'aaaaaaaa-0000-0000-0000-000000000001'),
  ('22222222-2222-2222-2222-222222222222', 'org_owner', 'organization', 'bbbbbbbb-0000-0000-0000-000000000002');
insert into pickup_requests (org_id, created_by, size_tier, unit_count, categories, window_start, window_end, timezone, on_site_contact_name, on_site_contact_phone, dock_address) values
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'tier_10_30', 25, '{computers_laptops}', now(), now() + interval '3 hours', 'America/New_York', 'A Contact', '5550100000', 'Dock A'),
  ('bbbbbbbb-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'tier_10_30', 30, '{monitors_displays}', now(), now() + interval '3 hours', 'America/Chicago', 'B Contact', '5550200000', 'Dock B');

-- User A sees only their own org's request
set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select is((select count(*)::int from pickup_requests), 1, 'User A sees exactly one request');
select is((select org_id from pickup_requests), 'aaaaaaaa-0000-0000-0000-000000000001'::uuid, 'User A sees only Org A');

-- User B sees only theirs
set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select is((select count(*)::int from pickup_requests), 1, 'User B sees exactly one request');
select is((select org_id from pickup_requests), 'bbbbbbbb-0000-0000-0000-000000000002'::uuid, 'User B sees only Org B');

select * from finish();
rollback;
