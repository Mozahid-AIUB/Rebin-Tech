-- Account review: the path from 'pending_verification' to 'active'.
--
-- Every signup lands pending (0010, 0011) and nothing could ever clear it --
-- no policy grants UPDATE on organizations, businesses or profiles, and there
-- was no function to do it either. An organization could register, see
-- "Verification in review", and stay there permanently.
--
-- Deliberately RPCs rather than UPDATE policies. A policy would hand the
-- client the whole column: an org admin could set their own status to
-- 'active', which is the one thing verification exists to prevent. These run
-- security definer behind a role check instead, so the only way to move a
-- status is through a function that first asks who is calling.

/** Platform staff, i.e. the people allowed to review accounts. */
create or replace function is_platform_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select has_role('platform_owner') or has_role('platform_ops');
$$;

create or replace function set_organization_status(
  p_org_id uuid,
  p_status account_status_enum
) returns void language plpgsql security definer set search_path = public as $$
declare v_before account_status_enum;
begin
  if not is_platform_staff() then
    raise exception 'Only platform staff can review organizations'
      using errcode = '42501';
  end if;

  select status into v_before from organizations where id = p_org_id;
  if v_before is null then
    raise exception 'No such organization: %', p_org_id using errcode = 'P0002';
  end if;

  update organizations
     set status = p_status,
         -- Set once, on first approval. Re-approving after a suspension
         -- should not rewrite the date the org was originally verified.
         verified_at = case when p_status = 'active' then coalesce(verified_at, now()) end
   where id = p_org_id;

  -- The members' own accounts follow the org: a verified hospital whose staff
  -- are all still 'pending_verification' is not actually usable.
  update profiles
     set status = p_status
   where id in (select user_id from organization_members where org_id = p_org_id);

  insert into audit_events (actor_id, entity_type, entity_id, action, payload_json)
  values (auth.uid(), 'organization', p_org_id, 'organization.status_changed',
          jsonb_build_object('from', v_before, 'to', p_status));
end;
$$;

create or replace function set_business_status(
  p_business_id uuid,
  p_status account_status_enum
) returns void language plpgsql security definer set search_path = public as $$
declare v_before account_status_enum;
begin
  if not is_platform_staff() then
    raise exception 'Only platform staff can review businesses'
      using errcode = '42501';
  end if;

  select status into v_before from businesses where id = p_business_id;
  if v_before is null then
    raise exception 'No such business: %', p_business_id using errcode = 'P0002';
  end if;

  update businesses
     set status = p_status,
         verified_at = case when p_status = 'active' then coalesce(verified_at, now()) end
   where id = p_business_id;

  update profiles
     set status = p_status
   where id in (select user_id from business_members where business_id = p_business_id);

  insert into audit_events (actor_id, entity_type, entity_id, action, payload_json)
  values (auth.uid(), 'business', p_business_id, 'business.status_changed',
          jsonb_build_object('from', v_before, 'to', p_status));
end;
$$;

-- An agent is a person, not a tenant (see agent_profiles in 0011), so there is
-- no entity row to move -- the profile itself is the account.
create or replace function set_agent_status(
  p_user_id uuid,
  p_status account_status_enum
) returns void language plpgsql security definer set search_path = public as $$
declare v_before account_status_enum;
begin
  if not is_platform_staff() then
    raise exception 'Only platform staff can review agents' using errcode = '42501';
  end if;

  select status into v_before from profiles where id = p_user_id;
  if v_before is null then
    raise exception 'No such profile: %', p_user_id using errcode = 'P0002';
  end if;

  update profiles set status = p_status where id = p_user_id;

  insert into audit_events (actor_id, entity_type, entity_id, action, payload_json)
  values (auth.uid(), 'agent', p_user_id, 'agent.status_changed',
          jsonb_build_object('from', v_before, 'to', p_status));
end;
$$;

-- Platform staff need to see what they are reviewing. The existing read
-- policies already admit platform_ops and platform_support to organizations,
-- businesses and profiles, so no new policy is required here -- but
-- agent_profiles and the pending queue are worth one view rather than three
-- hand-written joins in whatever admin UI lands first.
create or replace view pending_accounts as
  select 'organization'::text as kind, o.id, o.name, o.status, o.created_at
    from organizations o where o.status = 'pending_verification'
  union all
  select 'business', b.id, b.name, b.status, b.created_at
    from businesses b where b.status = 'pending_verification'
  union all
  select 'agent', p.id, p.full_name, p.status, p.created_at
    from profiles p
    join agent_profiles a on a.user_id = p.id
   where p.status = 'pending_verification';

-- The view runs as its caller, so the underlying tables' policies still apply
-- and a non-staff caller simply sees nothing.
alter view pending_accounts set (security_invoker = true);
