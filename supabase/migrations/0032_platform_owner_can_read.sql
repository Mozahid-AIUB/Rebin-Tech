-- The platform owner can write rows it cannot see.
--
-- is_platform_staff() (0015) is `platform_owner or platform_ops`, so an owner
-- may call every admin RPC: approving an organization, advancing a pickup
-- request, publishing a price catalog. But the read policies name
-- platform_ops and platform_support explicitly and none of them names
-- platform_owner -- profiles and audit_events in 0008, businesses,
-- business_members and agent_profiles in 0011, organizations and
-- organization_members in 0012, pickup_requests in 0024.
--
-- So the founder's account, seeded by 0009 as platform_owner and nothing
-- else, signs into the admin console, passes the staff check, and reads every
-- queue back empty. It can approve an account it is not permitted to look at.
--
-- The fix is one predicate rather than seven hand-edited role lists.
-- is_platform_staff() already means "may act on the platform's behalf", and
-- each of these policies is asking that question in longhand. Swapping the
-- longhand for the function keeps them in step: a role added to
-- is_platform_staff() later cannot silently miss a table again.
--
-- platform_support is deliberately not in is_platform_staff() -- it reads and
-- never writes -- so every policy keeps its own has_role('platform_support').
--
-- Each policy below is its predecessor's final body with that one swap. The
-- other terms are carried across verbatim, including is_assigned_agent on
-- pickup_requests: dropping it would cut off the agent holding the live
-- assignment, which is the one thing that policy was last changed to allow.
--
-- job_assignments_read (0024) already calls is_platform_staff() and is
-- therefore untouched.

-- --------------------------------------------------------------- profiles

drop policy if exists profiles_self on profiles;
create policy profiles_self on profiles for select
  using (
    id = auth.uid()
    or is_platform_staff()
    or has_role('platform_support')
  );

-- ----------------------------------------------------------- audit_events

drop policy if exists audit_events_platform_read on audit_events;
create policy audit_events_platform_read on audit_events for select using (
  is_platform_staff() or has_role('platform_support')
);

-- ------------------------------------------------------------- businesses

drop policy if exists business_read on businesses;
create policy business_read on businesses for select using (
  is_business_member(id)
  or is_platform_staff()
  or has_role('platform_support')
);

drop policy if exists business_members_read on business_members;
create policy business_members_read on business_members for select using (
  user_id = auth.uid()
  or is_business_member(business_id)
  or is_platform_staff()
  or has_role('platform_support')
);

-- --------------------------------------------------------- agent_profiles

drop policy if exists agent_profiles_read on agent_profiles;
create policy agent_profiles_read on agent_profiles for select using (
  user_id = auth.uid()
  or is_platform_staff()
  or has_role('platform_support')
);

-- ---------------------------------------------------------- organizations

drop policy if exists org_read on organizations;
create policy org_read on organizations for select using (
  is_org_member(id)
  or is_platform_staff()
  or has_role('platform_support')
);

drop policy if exists org_members_read on organization_members;
create policy org_members_read on organization_members for select using (
  user_id = auth.uid()
  or is_org_member(org_id)
  or is_platform_staff()
  or has_role('platform_support')
);

-- -------------------------------------------------------- pickup_requests

drop policy if exists req_read on pickup_requests;
create policy req_read on pickup_requests for select using (
  created_by = auth.uid()
  -- Casts spelled out: inside a policy the enum literals resolve as text and
  -- the whole expression fails with "argument of OR must be type boolean".
  or has_role('org_admin'::role_enum, org_id)
  or has_role('org_owner'::role_enum, org_id)
  or is_platform_staff()
  or has_role('platform_support'::role_enum)
  -- The agent holding the live assignment, and only while they hold it.
  or is_assigned_agent(id)
);
