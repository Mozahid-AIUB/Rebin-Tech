-- Guards on organization team management (0019).
--
-- These are security definer, so their own role checks are the whole of the
-- protection -- RLS is not standing behind them.
begin;
select plan(10);

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'owner@org-a.test'),
  ('22222222-2222-2222-2222-222222222222', 'colleague@org-a.test'),
  ('33333333-3333-3333-3333-333333333333', 'outsider@elsewhere.test');
insert into profiles (id, full_name, status) values
  ('11111111-1111-1111-1111-111111111111', 'Org Owner', 'active'),
  ('22222222-2222-2222-2222-222222222222', 'A Colleague', 'active'),
  ('33333333-3333-3333-3333-333333333333', 'An Outsider', 'active');
insert into organizations (id, name, org_type, street, city, state, zip, status) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Org A', 'hospital', '1 A St', 'Boston', 'MA', '02108', 'active');
insert into organization_members values
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'org_owner');
insert into role_assignments (user_id, role, scope_type, scope_id) values
  ('11111111-1111-1111-1111-111111111111', 'org_owner', 'organization', 'aaaaaaaa-0000-0000-0000-000000000001');

set local role authenticated;

-- ---------------------------------------------------------------------------
-- Who may invite.
-- ---------------------------------------------------------------------------
set local request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
select throws_ok(
  $$select invite_org_member('aaaaaaaa-0000-0000-0000-000000000001', 'x@y.test', 'org_requester')$$,
  '42501',
  null,
  'an outsider cannot invite anyone into the org'
);

set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select throws_ok(
  $$select invite_org_member('aaaaaaaa-0000-0000-0000-000000000001', 'x@y.test', 'org_owner')$$,
  '22023',
  null,
  'a second owner cannot be invited'
);

-- ---------------------------------------------------------------------------
-- An address that already has an account joins immediately.
-- ---------------------------------------------------------------------------
select is(
  (invite_org_member('aaaaaaaa-0000-0000-0000-000000000001', 'colleague@org-a.test', 'org_requester') ->> 'status'),
  'added',
  'an existing user is added straight to the team'
);
select is(
  (select member_role::text from organization_members
    where org_id = 'aaaaaaaa-0000-0000-0000-000000000001'
      and user_id = '22222222-2222-2222-2222-222222222222'),
  'org_requester',
  'the invited role is the one they get'
);
select throws_ok(
  $$select invite_org_member('aaaaaaaa-0000-0000-0000-000000000001', 'colleague@org-a.test', 'org_requester')$$,
  '23505',
  null,
  'inviting an existing member twice is refused'
);

-- ---------------------------------------------------------------------------
-- An unknown address gets a code, redeemable only by that address.
-- ---------------------------------------------------------------------------
create temporary table invite_code as
  select (invite_org_member('aaaaaaaa-0000-0000-0000-000000000001', 'newhire@org-a.test', 'org_admin') ->> 'code') as code;

select isnt((select code from invite_code), null, 'an unknown address gets a code back');

set local request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
select throws_ok(
  format($$select accept_org_invitation(%L)$$, (select code from invite_code)),
  '42501',
  null,
  'a forwarded code cannot be redeemed by someone else'
);

set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select throws_ok(
  $$select accept_org_invitation('NOTACODE')$$,
  'P0002',
  null,
  'an unknown code is refused'
);

-- ---------------------------------------------------------------------------
-- The owner's own row is protected from everyone, themselves included.
-- ---------------------------------------------------------------------------
select throws_ok(
  $$select set_org_member_role('aaaaaaaa-0000-0000-0000-000000000001',
      '11111111-1111-1111-1111-111111111111', 'org_requester')$$,
  '42501',
  null,
  'the owner cannot demote themselves and leave the org ownerless'
);
select throws_ok(
  $$select remove_org_member('aaaaaaaa-0000-0000-0000-000000000001',
      '11111111-1111-1111-1111-111111111111')$$,
  '42501',
  null,
  'the owner cannot be removed'
);

select * from finish();
rollback;
