-- Make an existing user a platform operator.
--
-- Run this in the Supabase SQL editor AFTER creating the user in
-- Authentication -> Users (or after they have signed up). It does not create
-- an auth account: passwords are Supabase's business, not this schema's.
--
-- 0009_seed_platform_owner.sql grants the very first owner and is guarded by a
-- placeholder UUID that matches nobody, so on a fresh project no one holds a
-- platform role and the console correctly refuses everyone. This is the script
-- that ends that state.
--
-- Change the email on the `v_email` line below. It is the only edit needed.

do $$
declare
  v_email text := 'admin@rebin.test';
  v_user  uuid;
begin
  select id into v_user from auth.users where lower(email) = lower(v_email);

  if v_user is null then
    raise exception
      'No auth user with email %. Create them under Authentication -> Users first.',
      v_email;
  end if;

  -- profiles.id references auth.users(id); the console reads full_name from
  -- here for the operator's name in the top bar.
  insert into profiles (id, full_name, status)
  values (v_user, 'Platform Owner', 'active')
  on conflict (id) do update
    set status = 'active';

  -- platform_owner rather than platform_ops: the owner role additionally reads
  -- role_assignments, which is what lets one operator see who else has access.
  -- is_platform_staff() accepts either, so both can work the queues.
  insert into role_assignments (user_id, role, scope_type, granted_by)
  values (v_user, 'platform_owner', 'platform', v_user)
  on conflict do nothing;

  raise notice 'Granted platform_owner to % (%)', v_email, v_user;
end;
$$;

-- Confirm it took. Expect one row.
select p.full_name, p.status, ra.role, ra.granted_at
  from role_assignments ra
  join profiles p on p.id = ra.user_id
 where ra.role in ('platform_owner', 'platform_ops')
   and ra.revoked_at is null;
