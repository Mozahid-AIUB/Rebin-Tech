-- Operators add operators, from the console.
--
-- Until now the only way to grant platform access was to open the SQL editor
-- and insert into role_assignments by hand. That is not a task an operator
-- should be asked to do -- it needs database credentials, it is unaudited, and
-- a typo in a uuid grants nothing with no error to say so.
--
-- What this deliberately does NOT add is a way to sign up as an operator.
-- An account that can approve businesses, move money and reprice the catalog
-- is issued by someone who already holds that power, never claimed. So every
-- function here starts from a caller who is already platform staff.
--
-- The grant is split from the invitation on purpose. Supabase owns passwords
-- and e-mail; this schema cannot create an auth user, and reaching for the
-- service-role key to do it would put a key that bypasses RLS inside the
-- application. So the flow is: an existing operator records who should have
-- access, that person signs up through the normal front door, and the grant
-- attaches when their account appears.

/**
 * Everyone who currently holds platform access.
 *
 * A list an operator can read is the point: `roles_self` only ever showed a
 * caller their own row unless they were platform_owner, so an ops user could
 * not answer "who else can do this" -- which is the first question anyone asks
 * before removing someone.
 */
create or replace function list_operators()
returns table (
  user_id    uuid,
  full_name  text,
  email      text,
  roles      text[],
  granted_at timestamptz,
  is_self    boolean
) language sql stable security definer set search_path = public as $$
  select p.id,
         p.full_name,
         u.email::text,
         array_agg(ra.role::text order by ra.role),
         min(ra.granted_at),
         p.id = auth.uid()
    from role_assignments ra
    join profiles p on p.id = ra.user_id
    join auth.users u on u.id = p.id
   where ra.revoked_at is null
     and ra.role in ('platform_owner', 'platform_ops', 'platform_support', 'platform_finance')
     and is_platform_staff()
   group by p.id, p.full_name, u.email
   order by min(ra.granted_at);
$$;

/**
 * Grant platform access to someone who already has an account.
 *
 * Takes an e-mail rather than a uuid because that is what an operator knows.
 * Both platform roles are granted together: is_platform_staff() accepts either
 * platform_owner or platform_ops, but the read policies in 0008 name only
 * platform_ops -- so an owner-only grant produces an operator who can approve
 * an organization it is not permitted to look at. Granting the pair is the
 * only combination that behaves.
 */
create or replace function grant_operator(p_email text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_user uuid;
begin
  if not is_platform_staff() then
    raise exception 'Only platform staff can add an operator' using errcode = '42501';
  end if;

  select id into v_user from auth.users where lower(email) = lower(trim(p_email));
  if v_user is null then
    raise exception 'No account exists for %. They need to sign up first, then add them here.', p_email
      using errcode = 'P0002';
  end if;

  -- A profile may not exist if the account was created in the Supabase
  -- dashboard rather than through a signup endpoint. Make one rather than
  -- failing: the operator's intent is clear and the missing row is an
  -- artefact of how the account happened to be created.
  insert into profiles (id, full_name, status)
  values (v_user, split_part(p_email, '@', 1), 'active')
  on conflict (id) do update set status = 'active';

  insert into role_assignments (user_id, role, scope_type, granted_by)
  select v_user, r, 'platform', auth.uid()
    from unnest(array['platform_owner', 'platform_ops']::role_enum[]) as r
  on conflict do nothing;

  insert into audit_events (actor_id, entity_type, entity_id, action, payload_json)
  values (auth.uid(), 'operator', v_user, 'operator.granted',
          jsonb_build_object('email', p_email));

  return v_user;
end;
$$;

/**
 * Take platform access away.
 *
 * Revokes rather than deletes, so the audit trail keeps the fact that this
 * person could once do these things -- which is exactly what an investigation
 * into a past action needs.
 */
create or replace function revoke_operator(p_user_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_remaining integer;
begin
  if not is_platform_staff() then
    raise exception 'Only platform staff can remove an operator' using errcode = '42501';
  end if;

  -- Removing yourself locks you out mid-session, and the mistake is not
  -- recoverable from the console that just refused you.
  if p_user_id = auth.uid() then
    raise exception 'You cannot remove your own access' using errcode = '22023';
  end if;

  -- The last operator standing cannot be removed: an installation with no
  -- platform staff has no way back in short of the SQL editor this exists to
  -- avoid.
  select count(distinct user_id) into v_remaining
    from role_assignments
   where revoked_at is null
     and role in ('platform_owner', 'platform_ops')
     and user_id <> p_user_id;

  if v_remaining = 0 then
    raise exception 'This is the last operator -- add another before removing this one'
      using errcode = '22023';
  end if;

  update role_assignments
     set revoked_at = now()
   where user_id = p_user_id
     and revoked_at is null
     and role in ('platform_owner', 'platform_ops', 'platform_support', 'platform_finance');

  insert into audit_events (actor_id, entity_type, entity_id, action, payload_json)
  values (auth.uid(), 'operator', p_user_id, 'operator.revoked', '{}'::jsonb);
end;
$$;
