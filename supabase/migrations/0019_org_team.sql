-- Team management for organizations (S31, S32).
--
-- The invitations table has existed since 0002 with no RLS policy at all, so
-- it was unreachable: RLS on, zero policies, deny everything.
--
-- No email is sent, because nothing in this project sends email yet. Rather
-- than build a token flow that silently goes nowhere, inviting returns a code
-- the inviter passes on themselves. When a mail provider lands, it sends this
-- same code and nothing else here changes.

-- Reading the team means reading other people's names, and `profiles_self`
-- (0008) admits only your own row. A definer function rather than widening
-- that policy: membership of one org should not make every profile in the
-- table readable through a hand-built PostgREST query.
create or replace function list_organization_members(p_org_id uuid)
returns table (user_id uuid, full_name text, email text, member_role role_enum, joined_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not (is_org_member(p_org_id) or is_platform_staff()) then
    raise exception 'Not a member of this organization' using errcode = '42501';
  end if;

  return query
    select p.id, p.full_name, u.email::text, m.member_role, p.created_at
      from organization_members m
      join profiles p   on p.id = m.user_id
      join auth.users u on u.id = m.user_id
     where m.org_id = p_org_id
     order by p.created_at;
end;
$$;

/** Pending invitations for an org, with the code left out -- it is shown once. */
create or replace function list_organization_invitations(p_org_id uuid)
returns table (id uuid, email text, role role_enum, expires_at timestamptz, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not (has_role('org_owner', p_org_id) or has_role('org_admin', p_org_id) or is_platform_staff()) then
    raise exception 'Only an organization owner or admin can see invitations'
      using errcode = '42501';
  end if;

  return query
    select i.id, i.email, i.role, i.expires_at, i.created_at
      from invitations i
     where i.scope_id = p_org_id
       and i.consumed_at is null
       and i.expires_at > now()
     order by i.created_at desc;
end;
$$;

/**
 * Invite someone to an organization.
 *
 * Two outcomes, because the common case in a hospital is a colleague who has
 * never heard of this product: an existing account joins immediately, an
 * unknown email gets an invitation plus a code to redeem after signing up.
 *
 * Returns {status, code} -- the code is plaintext here and only here; the row
 * stores its hash, so a leaked invitations table cannot be redeemed from.
 */
create or replace function invite_org_member(
  p_org_id uuid,
  p_email  text,
  p_role   role_enum
) returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare
  v_email  text := lower(trim(p_email));
  v_user   uuid;
  v_code   text;
begin
  if not (has_role('org_owner', p_org_id) or has_role('org_admin', p_org_id)) then
    raise exception 'Only an organization owner or admin can invite members'
      using errcode = '42501';
  end if;
  -- org_owner is deliberately not invitable. One owner per org keeps "who can
  -- delete this organization" answerable, and an admin can do everything else.
  if p_role not in ('org_admin', 'org_requester') then
    raise exception 'Members can be invited as an admin or a requester'
      using errcode = '22023';
  end if;
  if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'Enter a valid email address' using errcode = '22023';
  end if;

  select id into v_user from auth.users where lower(email) = v_email;

  if v_user is not null then
    if exists (select 1 from organization_members where org_id = p_org_id and user_id = v_user) then
      raise exception 'That person is already on this team' using errcode = '23505';
    end if;

    insert into organization_members (org_id, user_id, member_role)
      values (p_org_id, v_user, p_role);
    insert into role_assignments (user_id, role, scope_type, scope_id)
      values (v_user, p_role, 'organization', p_org_id);

    insert into audit_events (actor_id, entity_type, entity_id, action, payload_json)
    values (auth.uid(), 'organization', p_org_id, 'organization.member_added',
            jsonb_build_object('user_id', v_user, 'role', p_role));

    return jsonb_build_object('status', 'added', 'code', null);
  end if;

  -- Re-inviting replaces the outstanding code rather than stacking rows, so
  -- "I lost the code" has an obvious fix and only one code is ever live.
  delete from invitations
   where scope_id = p_org_id and lower(email) = v_email and consumed_at is null;

  v_code := upper(encode(gen_random_bytes(4), 'hex'));

  insert into invitations (email, role, scope_id, token_hash, invited_by, expires_at)
  values (v_email, p_role, p_org_id, encode(digest(v_code, 'sha256'), 'hex'),
          auth.uid(), now() + interval '14 days');

  insert into audit_events (actor_id, entity_type, entity_id, action, payload_json)
  values (auth.uid(), 'organization', p_org_id, 'organization.member_invited',
          jsonb_build_object('email', v_email, 'role', p_role));

  return jsonb_build_object('status', 'invited', 'code', v_code);
end;
$$;

/** Redeem an invitation code as the signed-in user. */
create or replace function accept_org_invitation(p_code text)
returns uuid language plpgsql security definer set search_path = public, extensions as $$
declare
  v_invite invitations%rowtype;
  v_email  text;
begin
  if auth.uid() is null then
    raise exception 'Sign in before accepting an invitation' using errcode = '42501';
  end if;
  select lower(email) into v_email from auth.users where id = auth.uid();

  select * into v_invite
    from invitations
   where token_hash = encode(digest(upper(trim(p_code)), 'sha256'), 'hex')
     and consumed_at is null
     and expires_at > now();

  if v_invite.id is null then
    raise exception 'That invitation code is not valid or has expired'
      using errcode = 'P0002';
  end if;
  -- Bound to the address it was sent to, so a forwarded code cannot be used by
  -- whoever received it.
  if lower(v_invite.email) <> v_email then
    raise exception 'This invitation was sent to a different email address'
      using errcode = '42501';
  end if;

  insert into organization_members (org_id, user_id, member_role)
    values (v_invite.scope_id, auth.uid(), v_invite.role)
    on conflict do nothing;
  insert into role_assignments (user_id, role, scope_type, scope_id)
    values (auth.uid(), v_invite.role, 'organization', v_invite.scope_id)
    on conflict do nothing;

  update invitations set consumed_at = now() where id = v_invite.id;

  insert into audit_events (actor_id, entity_type, entity_id, action, payload_json)
  values (auth.uid(), 'organization', v_invite.scope_id, 'organization.invitation_accepted',
          jsonb_build_object('role', v_invite.role));

  return v_invite.scope_id;
end;
$$;

create or replace function set_org_member_role(
  p_org_id  uuid,
  p_user_id uuid,
  p_role    role_enum
) returns void language plpgsql security definer set search_path = public as $$
begin
  if not (has_role('org_owner', p_org_id) or has_role('org_admin', p_org_id)) then
    raise exception 'Only an organization owner or admin can change roles'
      using errcode = '42501';
  end if;
  if p_role not in ('org_admin', 'org_requester') then
    raise exception 'A member can be an admin or a requester' using errcode = '22023';
  end if;
  -- The owner's own row is off limits to everyone including themselves: an
  -- owner who demoted themselves would leave the org with no owner at all.
  if exists (select 1 from organization_members
              where org_id = p_org_id and user_id = p_user_id and member_role = 'org_owner') then
    raise exception 'The organization owner''s role cannot be changed'
      using errcode = '42501';
  end if;

  update organization_members set member_role = p_role
   where org_id = p_org_id and user_id = p_user_id;
  if not found then
    raise exception 'That person is not on this team' using errcode = 'P0002';
  end if;

  update role_assignments set revoked_at = now()
   where user_id = p_user_id and scope_id = p_org_id and revoked_at is null;
  insert into role_assignments (user_id, role, scope_type, scope_id)
    values (p_user_id, p_role, 'organization', p_org_id);

  insert into audit_events (actor_id, entity_type, entity_id, action, payload_json)
  values (auth.uid(), 'organization', p_org_id, 'organization.member_role_changed',
          jsonb_build_object('user_id', p_user_id, 'role', p_role));
end;
$$;

create or replace function remove_org_member(p_org_id uuid, p_user_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not (has_role('org_owner', p_org_id) or has_role('org_admin', p_org_id)) then
    raise exception 'Only an organization owner or admin can remove members'
      using errcode = '42501';
  end if;
  if exists (select 1 from organization_members
              where org_id = p_org_id and user_id = p_user_id and member_role = 'org_owner') then
    raise exception 'The organization owner cannot be removed' using errcode = '42501';
  end if;

  delete from organization_members where org_id = p_org_id and user_id = p_user_id;
  if not found then
    raise exception 'That person is not on this team' using errcode = 'P0002';
  end if;

  -- Revoked, not deleted: the requests they booked still point at them, and
  -- the audit trail should keep saying they once had this access.
  update role_assignments set revoked_at = now()
   where user_id = p_user_id and scope_id = p_org_id and revoked_at is null;

  insert into audit_events (actor_id, entity_type, entity_id, action, payload_json)
  values (auth.uid(), 'organization', p_org_id, 'organization.member_removed',
          jsonb_build_object('user_id', p_user_id));
end;
$$;
