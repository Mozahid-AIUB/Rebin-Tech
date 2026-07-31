create or replace function has_role(p_role role_enum, p_scope uuid default null)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from role_assignments
    where user_id = auth.uid()
      and role = p_role
      and (p_scope is null or scope_id = p_scope)
      and revoked_at is null
  );
$$;

alter table profiles              enable row level security;
alter table role_assignments      enable row level security;
alter table organizations         enable row level security;
alter table organization_members  enable row level security;
alter table pickup_requests       enable row level security;
alter table audit_events          enable row level security;

create policy profiles_self on profiles for select
  using (id = auth.uid() or has_role('platform_support') or has_role('platform_ops'));

create policy roles_self on role_assignments for select
  using (user_id = auth.uid() or has_role('platform_owner'));

create policy org_read on organizations for select using (
  id in (select org_id from organization_members where user_id = auth.uid())
  or has_role('platform_ops') or has_role('platform_support')
);

create policy req_read on pickup_requests for select using (
  created_by = auth.uid()
  or has_role('org_admin', org_id)
  or has_role('org_owner', org_id)
  or has_role('platform_ops')
  or has_role('platform_support')
);

create policy req_insert on pickup_requests for insert with check (
  created_by = auth.uid()
  and org_id in (select org_id from organization_members where user_id = auth.uid())
);

create policy audit_events_platform_read on audit_events for select using (
  has_role('platform_ops') or has_role('platform_support')
);
