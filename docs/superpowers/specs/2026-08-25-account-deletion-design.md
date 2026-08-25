# Account deletion — design

Date: 2026-08-25
Status: draft, awaiting review
Branch: to be cut from `main`

Apple rejected iOS submission 1.0 (6) on three grounds (App Store Connect
message, 2026-08-25). Two are already fixed on `main`: the fake Sign in with
Apple/Google buttons are gone, and the dead `/forgot-password` route now shows
an honest "coming soon" notice instead of routing nowhere. This design covers
the third: **Guideline 5.1.1(v)** — the app lets someone create an account but
gives them no way to delete it.

## What Apple actually requires

From the rejection message, verbatim where it matters:

> The app supports account creation but does not include an option to
> initiate account deletion... Only offering to temporarily deactivate or
> disable an account is insufficient.

And the resubmission needs a screen recording, on a physical device, showing:
creating/signing into an account, navigating to the delete option, and the
complete flow to confirmation. That recording is a follow-up task once this
ships — not part of this design, but the reason the flow has to actually work
end to end before resubmitting, not just satisfy a code review.

## What this deliberately does not do

- **No password re-entry to confirm.** Apple's own guideline says
  confirmation steps are enough to prevent accidental deletion; only
  highly-regulated industries may require a phone call or email. A native
  `Alert.alert` with Cancel/Delete (destructive) is the same pattern already
  used for Log Out on this screen, and it satisfies the requirement as
  written.
- **No ownership-transfer flow.** An org_owner or biz_owner with other active
  members is blocked from deleting, told to transfer ownership or remove
  members first. Building transfer is real work for a case that will not come
  up outside the demo vendors — see "Owner and staff accounts" below.
- **No hard delete.** Quotes, pickups, and audit history are the client's
  financial and operational record, and e-waste handling has its own
  compliance shape (recoverable-material tracking already means this
  business expects to account for what happened to a device). Deleting those
  rows on a whim because the account is gone would throw that away. What
  Apple requires — and what this builds — is that the account stops existing
  as a way to sign in or be identified, not that history evaporates.

## Where a row actually goes

**`auth.users`** — deleted outright, via `auth.admin.deleteUser()`. This is
the login credential; Apple's requirement is specifically about this, and
keeping it around after "deletion" is the exact failure mode the rejection
describes ("temporarily deactivate" was called out as insufficient).

**`profiles`** — kept, not deleted, but archived and scrubbed:
`status = 'archived'`, `full_name` and `phone` overwritten. The row can't be
dropped without cascading into every quote and audit event that references
`profiles.id` as an actor — the same shape `revoke_operator` (0039) already
relies on to keep its audit trail readable.

**`organizations` / `businesses`** — untouched by this RPC. A single-person
org or business stays exactly as it is after its only owner archives their
profile; the pickup and quote history it holds is Rebin's record, not the
departed user's, and nothing here deletes it. (Multi-member orgs/businesses
never reach this path at all — see below.)

**`quotes`, `pickup_requests`, `audit_events`, `payouts`** — untouched. These
rows describe transactions Rebin is a party to; they don't become untrue
because one participant's login was removed.

## Who gets blocked, and why

Checked in this order inside `delete_own_account()`:

1. **Caller holds a platform role** (`platform_owner`/`ops`/`support`/
   `finance`). Blocked outright: *"Remove your platform access first."*
   Mirrors 0039's own stance — `revoke_operator` already refuses to let
   platform staff remove their own access in one step (self-removal mid-
   session is the specific mistake 0039 exists to prevent), and letting
   delete route around that check would undo the protection by a side door.
   An operator who wants gone revokes their own access through another
   operator first, same as today, then deletes.

2. **Caller is `org_owner` or `biz_owner`, and another active member/staff
   exists** in that organization or business. Blocked: *"Transfer ownership
   or remove other members before deleting your account."* An owner
   disappearing out from under an active team is a bigger break than this
   feature is meant to cause, and building a transfer flow to handle it
   properly is out of scope for what Apple is actually asking for. This case
   doesn't arise in the demo vendor accounts (each is a single person), so
   blocking it costs nothing today.

3. **Everyone else** (org_requester, biz_staff, a sole org_owner/biz_owner
   with no other members, an account with no role assignment at all) —
   allowed.

## The pieces

### Migration `0041_account_deletion.sql`

One RPC, `delete_own_account()`, security definer, no arguments — it only
ever acts on `auth.uid()`, never on a passed-in id, so there's no id to
validate or misuse.

```
-- shape, not final SQL
create or replace function delete_own_account()
returns void language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_other_members integer;
begin
  if is_platform_staff() then
    raise exception 'Remove your platform access first' using errcode = '42501';
  end if;

  select count(*) into v_other_members
    from role_assignments ra
   where ra.scope_id in (
           select scope_id from role_assignments
            where user_id = v_uid and role in ('org_owner','biz_owner') and revoked_at is null
         )
     and ra.user_id <> v_uid
     and ra.revoked_at is null;

  if v_other_members > 0 then
    raise exception 'Transfer ownership or remove other members before deleting your account'
      using errcode = '22023';
  end if;

  update profiles
     set status = 'archived', full_name = 'Deleted user', phone = null
   where id = v_uid;

  insert into audit_events (actor_id, entity_type, entity_id, action, payload_json)
  values (v_uid, 'profile', v_uid, 'account.deleted', '{}'::jsonb);
end;
$$;
```

The exact column list on `role_assignments` (scope_id vs. scope_type +
scope_id) gets checked against the real schema during implementation — this
is the shape, not a copy-paste-ready migration.

### Edge function `delete-account`

Same skeleton as `create-operator` (the only other function here that needs
service-role for an `auth.admin.*` call):

1. Reject non-POST, reject a missing bearer token.
2. Build a client from the caller's own JWT (anon key) — this is what makes
   `delete_own_account()`'s checks mean anything.
3. Call `caller.rpc('delete_own_account')`. If it errors (staff, owner-with-
   members), return that error message and stop — the auth user is never
   touched.
4. On success, build a service-role client and call
   `admin.auth.admin.deleteUser(callerUserId)`.
5. Return `{ ok: true }`.

The RPC runs before the auth deletion, not after — a failed RPC must never
leave someone logged out with a still-archived profile and no way back in.

### `@rebin/api`: `deleteOwnAccount()`

A thin wrapper calling the edge function, matching the shape of the existing
`signup*` functions (POST with the session's access token as bearer, JSON
body, typed error on non-2xx).

### Mobile: `MeScreen.tsx`

Below the existing "Log Out" `PillButton`, a second one:

```tsx
<PillButton
  label="Delete Account"
  variant="quietDanger"
  onPress={onDeletePress}
/>
```

`onDeletePress` shows `Alert.alert("Delete Account?", "This will permanently
delete your account and cannot be undone.", [Cancel, { text: "Delete", style:
"destructive", onPress: onConfirmDelete }])`.

`onConfirmDelete` calls `deleteOwnAccount()`. On success, clears the session
(same path `useLogout` already uses) and lands on the login screen. On
failure, a second `Alert.alert` shows the server's message verbatim — "Remove
your platform access first" and "Transfer ownership..." are both meant to be
read directly by the person who tapped the button, not translated.

## Testing

- Migration: exercised the way 0039's functions are — through the mobile
  test suite calling the real RPC against a test project, per this repo's
  existing pattern, rather than a separate SQL test file (none exists in
  `supabase/migrations` today).
- `MeScreen`: a new case in the existing `__tests__` file for that screen —
  delete button renders, tapping it triggers the confirm alert, confirming
  calls `deleteOwnAccount` and routes to login on success, and a server error
  surfaces via the second alert without navigating away.
- Manual, before resubmission: the actual screen recording Apple asked for,
  on a physical device — sign in with the demo account, delete it, confirm
  the flow completes. This is the acceptance test that matters; the automated
  tests above exist so it doesn't have to be repeated by hand except once.
