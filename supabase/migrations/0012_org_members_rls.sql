-- organization_members had RLS enabled in 0008_rls.sql but was never given a
-- select policy, so it denied everything -- including to its own members.
--
-- That silently broke more than the table itself: `org_read` on organizations
-- authorizes via `id in (select org_id from organization_members where user_id
-- = auth.uid())`, and a policy's subquery is evaluated under the querying
-- user's own RLS. With organization_members closed, that subquery always
-- returned zero rows, so no user could read the organization they belong to.
-- It surfaced as a blank organization name after a successful login.

-- Definer function for the same anti-recursion reason as is_business_member in
-- 0011: a policy ON organization_members cannot test membership by selecting
-- from organization_members. Answers only "is the calling user in this org".
create or replace function is_org_member(p_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from organization_members where org_id = p_org and user_id = auth.uid()
  );
$$;

create policy org_members_read on organization_members for select using (
  user_id = auth.uid()
  or is_org_member(org_id)
  or has_role('platform_ops') or has_role('platform_support')
);

-- Rewrite org_read to go through the definer function too. The original
-- subquery form works once the policy above exists, but it re-reads
-- organization_members under RLS on every row; this is both cheaper and
-- symmetric with business_read.
drop policy if exists org_read on organizations;
create policy org_read on organizations for select using (
  is_org_member(id)
  or has_role('platform_ops') or has_role('platform_support')
);
