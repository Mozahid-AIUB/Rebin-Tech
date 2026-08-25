-- Apple Guideline 5.1.1(v): an app that supports account creation must also
-- support account deletion, and "only offering to temporarily deactivate or
-- disable an account is insufficient" -- so this has to actually remove the
-- auth.users row (done by the delete-account edge function, which calls this
-- RPC first and only touches auth on success), not just flip a flag here.
--
-- What this RPC controls is what happens to the rest of the account: the
-- profiles row is archived and scrubbed, never dropped, because quotes,
-- pickups and audit_events all reference profiles.id as an actor, and this
-- business already treats that history as its own record (recoverable-
-- material tracking assumes every device's story stays readable). Dropping
-- the row would cascade into rows that describe transactions Rebin is a
-- party to, not just the departed user.
create or replace function delete_own_account()
returns void language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_other_members integer;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  -- Platform *membership*, not platform *authority* -- deliberately not
  -- is_platform_staff(), which 0032 defines to exclude platform_support
  -- because it only reads. A support or finance account still holds real
  -- access to tenant data, and letting it delete itself straight through
  -- would leave role_assignments rows granted to a now-deleted auth.users
  -- id. Mirrors 0039's own refusal to let an operator remove their own
  -- access in one step: another operator revokes it first, same as today,
  -- then this account can delete itself.
  if exists (
    select 1 from role_assignments
     where user_id = v_uid
       and role in ('platform_owner','platform_ops','platform_support','platform_finance')
       and revoked_at is null
  ) then
    raise exception 'Remove your platform access first' using errcode = '42501';
  end if;

  -- An owner disappearing out from under an active team is a bigger break
  -- than this feature is meant to cause. Scoped to the owner's own
  -- organization/business rows (role_assignments has no direct link between
  -- an org_owner row and a biz_owner row, so this checks both scope types
  -- the caller owns in one pass) rather than assuming a caller owns at most
  -- one tenant.
  select count(*) into v_other_members
    from role_assignments ra
   where ra.revoked_at is null
     and ra.user_id <> v_uid
     and (ra.scope_type, ra.scope_id) in (
           select scope_type, scope_id
             from role_assignments
            where user_id = v_uid
              and role in ('org_owner','biz_owner')
              and revoked_at is null
         );

  if v_other_members > 0 then
    raise exception 'Transfer ownership or remove other members before deleting your account'
      using errcode = '22023';
  end if;

  update profiles
     set status = 'archived',
         full_name = 'Deleted user',
         phone = null
   where id = v_uid;

  insert into audit_events (actor_id, entity_type, entity_id, action, payload_json)
  values (v_uid, 'profile', v_uid, 'account.deleted', '{}'::jsonb);
end;
$$;

comment on function delete_own_account() is
  'Archives the caller''s own profile and clears identifying fields. Blocks platform staff and owners with other active members. The auth.users row itself is deleted by the delete-account edge function, only after this succeeds.';
