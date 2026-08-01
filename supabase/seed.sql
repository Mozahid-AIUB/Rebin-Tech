-- Dev seed fixtures for local Supabase.
-- Intentionally minimal for Phase-0: RLS isolation coverage lives in
-- supabase/tests/rls.test.sql (pgTAP), which creates and rolls back its own
-- fixtures. Add local-dev-only sample rows here as later tasks need them.

-- ---------------------------------------------------------------------------
-- Local dev account: an approved organization owner.
--
-- Added after a `supabase stop --no-backup` wiped the local volume and took a
-- hand-built test account with it. Recreating it took a chain of curl calls
-- and psql statements that lived only in a terminal history; this makes the
-- same account a reproducible artifact instead, so `supabase db reset`
-- restores a working login every time.
--
-- LOCAL ONLY. seed.sql runs on `db reset` against the local stack and is never
-- part of a migration, so this never reaches a deployed database. The password
-- is a throwaway, hashed here the same way GoTrue would.
--
-- Login: karim.rahman@riversidemedical.org / Riverside2026!Med
-- ---------------------------------------------------------------------------
do $$
declare
  v_user_id uuid := '11111111-1111-4111-8111-111111111111';
  v_org_id  uuid;
begin
  -- Idempotent: seeds run on every reset, and a second insert would collide on
  -- the email unique index.
  if exists (select 1 from auth.users where id = v_user_id) then
    return;
  end if;

  -- The *_token / email_change columns must be '' rather than left NULL.
  -- GoTrue scans them into Go `string`s, and a NULL fails with
  -- 'converting NULL to string is unsupported' -- which surfaces as a
  -- 500 "Database error querying schema" on every login attempt, with
  -- nothing wrong visible in the row itself.
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    confirmation_token, recovery_token, email_change,
    email_change_token_new, email_change_token_current,
    phone_change, phone_change_token, reauthentication_token,
    created_at, updated_at
  ) values (
    '00000000-0000-0000-0000-000000000000', v_user_id, 'authenticated', 'authenticated',
    'karim.rahman@riversidemedical.org',
    crypt('Riverside2026!Med', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    '', '', '', '', '', '', '', '',
    now(), now()
  );

  -- GoTrue refuses to sign in a user with no identity row.
  insert into auth.identities (id, user_id, provider_id, identity_data, provider, created_at, updated_at)
  values (
    gen_random_uuid(), v_user_id, v_user_id::text,
    format('{"sub":"%s","email":"%s","email_verified":true}', v_user_id, 'karim.rahman@riversidemedical.org')::jsonb,
    'email', now(), now()
  );

  -- Same RPC the real signup Edge Function calls, so the seeded account has
  -- exactly the row shape a genuine signup produces.
  v_org_id := create_organization_with_owner(
    v_user_id, 'Karim Rahman', '5550192345', 'Riverside Medical Center',
    'hospital', '480 Riverside Drive', 'Newark', 'NJ', '07102', true
  );

  -- Approved, so the account lands on the dashboard rather than /pending.
  -- Verification itself has no admin flow yet.
  update profiles      set status = 'active' where id = v_user_id;
  update organizations set status = 'active', verified_at = now() where id = v_org_id;
end $$;
