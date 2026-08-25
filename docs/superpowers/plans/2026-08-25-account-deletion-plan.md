# Account Deletion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give a signed-in user a way to permanently delete their own account, satisfying Apple App Store Guideline 5.1.1(v) (account creation requires account deletion).

**Architecture:** One security-definer RPC (`delete_own_account`) does all the guard logic (blocks platform staff and owners with other active members) and archives the `profiles` row. A new edge function calls that RPC as the caller, and only on success uses the service-role key to delete the `auth.users` row outright — the one action that genuinely needs a key no client may hold. A thin `@rebin/api` wrapper calls the function over raw `fetch` (not `supabase.functions.invoke`, which discards the JSON error body on a non-2xx response) so the UI can show the RPC's own message verbatim. `MeScreen` gets a "Delete Account" button below "Log Out", confirmed with a native `Alert.alert`.

**Tech Stack:** Postgres (Supabase), TypeScript, Deno (edge functions), Expo Router + React Native (mobile), Jest + `@testing-library/react-native`.

**Spec:** `docs/superpowers/specs/2026-08-25-account-deletion-design.md`

## Global Constraints

- **No service-role key in any client application.** It is used only inside the `delete-account` edge function.
- **Every write is exactly one RPC call.** The edge function calls `delete_own_account()` as the caller (their own JWT, anon key) — it never writes to `profiles` or `role_assignments` directly.
- **The RPC runs before the auth deletion, not after.** A failed RPC must never leave someone logged out with a still-archived profile and no way back in.
- **No hard delete of `profiles`, `organizations`, `businesses`, `quotes`, `pickup_requests`, `audit_events`, or `payouts`.** Only `profiles.status`/`full_name`/`phone` are overwritten; `auth.users` is the only row actually deleted.
- **No password re-entry.** Confirmation is a native `Alert.alert` with Cancel/Delete (destructive), matching the existing Log Out pattern.
- **Platform-staff check is a direct `role_assignments` lookup for all four platform roles** (`platform_owner`, `platform_ops`, `platform_support`, `platform_finance`) — never `is_platform_staff()`, which 0032 deliberately excludes `platform_support` from.
- **Migrations are append-only.** This adds `supabase/migrations/0041_account_deletion.sql`; nothing already applied is edited.
- `pnpm --filter mobile typecheck` and `pnpm --filter mobile test` both pass before a task is done. `pnpm --filter @rebin/shared test` is unaffected by this work (no shared-package changes) and does not need re-running per task, only once at the end.

## File Structure

**Database**
- Create `supabase/migrations/0041_account_deletion.sql` — `delete_own_account()`.

**Edge function**
- Create `supabase/functions/delete-account/index.ts` — calls the RPC as the caller, then deletes the `auth.users` row with the service-role key.

**Shared API package**
- Modify `packages/api/src/auth.ts` — add `deleteOwnAccount()`.
- Create `packages/api/src/__tests__/delete-account.test.ts`.

**Mobile**
- Modify `apps/mobile/src/features/portal/MeScreen.tsx` — add the "Delete Account" button, its confirm dialog, and the call.
- Modify `apps/mobile/__tests__/me-screen.test.tsx` — new test cases for the button.

---

### Task 1: The database rule

The RPC that decides who may delete their own account, and what happens to their `profiles` row when they do.

**Files:**
- Create: `supabase/migrations/0041_account_deletion.sql`

**Interfaces:**
- Consumes: `profiles` (0002: `id`, `full_name`, `phone`, `status`), `role_assignments` (0002: `user_id`, `role`, `scope_type`, `scope_id`, `revoked_at`), `audit_events` (0007: `actor_id`, `entity_type`, `entity_id`, `action`, `payload_json`), `account_status_enum` (0001, has an `'archived'` value — same one `revoke_operator`/console flows already use for a deactivated tenant).
- Produces: `delete_own_account() returns void`, callable by any authenticated user, security definer.

- [ ] **Step 1: Confirm `account_status_enum` already has `'archived'`**

Run this against the project (Supabase SQL editor, or `supabase db push` if the CLI is linked):

```sql
select unnest(enum_range(null::account_status_enum))::text as status;
```

Expected: `archived` appears in the list (it is used by `set_organization_status` in 0015). If it is missing, stop and report back before continuing — this plan assumes it exists and does not add it.

- [ ] **Step 2: Write the migration**

Create `supabase/migrations/0041_account_deletion.sql`:

```sql
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
```

- [ ] **Step 3: Apply it and confirm the guards work**

Apply the migration (SQL editor or `supabase db push`), then run each check below against the project, substituting real ids from your test data (`admin@rebin.test` is gone per `CLAUDE.md`; use one of the demo vendor accounts, e.g. `eastgate.computer.repair@rebin.demo`, and a platform-staff account you control):

```sql
-- 1. As a platform-staff user (any of the four platform roles), call:
select delete_own_account();
```

Expected: raises `Remove your platform access first`.

```sql
-- 2. As an org_owner whose organization has another active member (org_admin
--    or org_requester), call:
select delete_own_account();
```

Expected: raises `Transfer ownership or remove other members before deleting your account`. (If no such organization exists in test data, use `org_team` — 0019 — to add a second member to one of the demo organizations first, then remove it afterward if you don't want it left over.)

```sql
-- 3. As a sole org_owner/biz_owner, an org_requester, or a biz_staff member
--    (no other active member sharing their scope), call:
select delete_own_account();
```

Expected: succeeds (returns nothing, no error). Then:

```sql
select status, full_name, phone from profiles where id = auth.uid();
```

Expected: `status = 'archived'`, `full_name = 'Deleted user'`, `phone` is null.

```sql
select action from audit_events where actor_id = auth.uid() and action = 'account.deleted';
```

Expected: one row.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0041_account_deletion.sql
git commit -m "feat(db): add delete_own_account for Apple 5.1.1

Apple rejected iOS 1.0 (6) partly because the app has no way to delete an
account -- only deactivate. This RPC archives and scrubs the caller's own
profiles row; the auth.users row itself is deleted by the delete-account
edge function (next commit), which calls this first and only touches auth
on success.

Blocks platform staff (checked directly against role_assignments, not
is_platform_staff(), which 0032 excludes platform_support from on purpose)
and owners with other active members in their organization or business.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 2: The edge function

Deletes the `auth.users` row, but only after `delete_own_account()` has succeeded.

**Files:**
- Create: `supabase/functions/delete-account/index.ts`

**Interfaces:**
- Consumes: `delete_own_account()` (Task 1), the caller's own `Authorization: Bearer <token>` header, `Deno.env` vars `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (same three every other function here reads).
- Produces: an HTTP endpoint at `functions/v1/delete-account`. Success: `200 { ok: true }`. Failure: non-2xx `{ error: string }`.

- [ ] **Step 1: Write the function**

Create `supabase/functions/delete-account/index.ts`:

```typescript
import { createClient } from "jsr:@supabase/supabase-js@2";

// Delete the caller's own account, in one call.
//
// delete_own_account() runs first, as the caller -- so its own guards (no
// platform staff, no owner with other active members) apply before anything
// irreversible happens. Only on success does this reach for the
// service-role key, and only to do the one thing this system genuinely
// needs it for: auth.admin.deleteUser() has no RLS-respecting equivalent,
// the same reason create-operator holds this key to call
// auth.admin.createUser().
//
// The RPC runs before the auth deletion, not after: if it were the other
// way around, a caller who fails the RPC's guards would already be logged
// out with no session left to retry from, having gained nothing.
Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return Response.json({ error: "POST only" }, { status: 405 });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return Response.json({ error: "Not signed in" }, { status: 401 });
  }

  // The caller, as themselves. Their token, the anon key, RLS applying --
  // which is what makes delete_own_account()'s own checks mean anything.
  const caller = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const {
    data: { user },
    error: userError,
  } = await caller.auth.getUser();
  if (userError || !user) {
    return Response.json({ error: "Not signed in" }, { status: 401 });
  }

  const { error: rpcError } = await caller.rpc("delete_own_account");
  if (rpcError) {
    // Whatever delete_own_account() raised -- "Remove your platform access
    // first" or "Transfer ownership..." -- reaches the app verbatim. The
    // auth user is never touched when this branch runs.
    return Response.json({ error: rpcError.message }, { status: 400 });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
  if (deleteError) {
    // The profile is already archived and the RPC's audit event already
    // written. A failure here leaves someone who can no longer do anything
    // meaningful (their profile reads "Deleted user") but can still log in
    // -- worth surfacing as a real error rather than swallowing, since it
    // means Apple's specific requirement (removing the credential) did not
    // complete, even though the rest of the account was cleared.
    return Response.json({ error: deleteError.message }, { status: 500 });
  }

  return Response.json({ ok: true });
});
```

- [ ] **Step 2: Deploy and verify against the project**

```bash
supabase functions deploy delete-account
```

Then, as a signed-in user who is not platform staff and has no co-members (see Task 1 Step 3's third case), call it directly:

```bash
curl -i -X POST "$SUPABASE_URL/functions/v1/delete-account" \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  -H "Content-Type: application/json"
```

Expected: `200 {"ok":true}`. Then confirm in the SQL editor:

```sql
select id from auth.users where id = '<that user's id>';
```

Expected: zero rows (the auth user is gone). Use a demo-adjacent throwaway account for this manual check, not one of the twelve demo vendor logins listed in `CLAUDE.md` — this call is irreversible on the live project.

Also verify the blocked path returns the RPC's message: repeat the `curl` call as a platform-staff user's token.

Expected: `400 {"error":"Remove your platform access first"}`, and that user's row still exists in `auth.users` afterward.

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/delete-account/index.ts
git commit -m "feat: add the delete-account edge function

Calls delete_own_account() as the caller first, so its guards (platform
staff, owner with other members) run before anything irreversible. Only
on success does it reach for the service-role key, to delete the
auth.users row -- the one action Apple's 5.1.1(v) rejection specifically
requires and that no RLS-respecting RPC can do.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 3: `deleteOwnAccount()` in `@rebin/api`

**Files:**
- Modify: `packages/api/src/auth.ts`
- Create: `packages/api/src/__tests__/delete-account.test.ts`

**Interfaces:**
- Consumes: `supabase` (from `./client`, already imported at the top of `auth.ts`), `process.env.EXPO_PUBLIC_SUPABASE_URL` (already read in `client.ts`).
- Produces: `deleteOwnAccount(): Promise<void>`, exported from `packages/api/src/index.ts` via the existing `export * from "./auth"`.

- [ ] **Step 1: Write the failing test**

Create `packages/api/src/__tests__/delete-account.test.ts`:

```typescript
import { deleteOwnAccount } from "../auth";
import { supabase } from "../client";

describe("deleteOwnAccount", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it("posts to delete-account with the session's access token", async () => {
    jest.spyOn(supabase.auth, "getSession").mockResolvedValue({
      data: { session: { access_token: "test-token" } as never },
      error: null,
    } as never);
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    });

    await deleteOwnAccount();

    expect(global.fetch).toHaveBeenCalledWith(
      `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/delete-account`,
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer test-token" }),
      }),
    );
  });

  it("throws the server's own message on failure", async () => {
    jest.spyOn(supabase.auth, "getSession").mockResolvedValue({
      data: { session: { access_token: "test-token" } as never },
      error: null,
    } as never);
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: "Remove your platform access first" }),
    });

    await expect(deleteOwnAccount()).rejects.toThrow("Remove your platform access first");
  });

  it("throws when there is no session", async () => {
    jest.spyOn(supabase.auth, "getSession").mockResolvedValue({
      data: { session: null },
      error: null,
    } as never);

    await expect(deleteOwnAccount()).rejects.toThrow("Not signed in");
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `pnpm --filter @rebin/api test delete-account`
Expected: FAIL — `deleteOwnAccount` is not exported from `../auth`.

- [ ] **Step 3: Implement `deleteOwnAccount`**

In `packages/api/src/auth.ts`, add at the end of the file (after `signUpAgent`):

```typescript
// A raw fetch, not supabase.functions.invoke: invoke() wraps a non-2xx
// response in a generic FunctionsHttpError and discards the JSON body, so
// the RPC's own message ("Remove your platform access first", "Transfer
// ownership...") never reaches the caller. The web console's createOperator
// (apps/web/app/admin/actions.ts) hits the same wall calling create-operator
// and solves it the same way.
export async function deleteOwnAccount(): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Not signed in");

  const res = await fetch(
    `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/delete-account`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
    },
  );

  const body = (await res.json().catch(() => null)) as { error?: string } | null;
  if (!res.ok) {
    throw new Error(body?.error ?? `Could not delete the account (${res.status})`);
  }
}
```

- [ ] **Step 4: Run the test to confirm it passes**

Run: `pnpm --filter @rebin/api test delete-account`
Expected: PASS, all three cases.

- [ ] **Step 5: Typecheck**

Run: `pnpm --filter @rebin/api typecheck`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add packages/api/src/auth.ts packages/api/src/__tests__/delete-account.test.ts
git commit -m "feat(api): add deleteOwnAccount

A raw fetch rather than supabase.functions.invoke, which wraps a non-2xx
response in a generic FunctionsHttpError and discards the JSON error body
-- the same problem the web console's createOperator already works around
calling create-operator, solved the same way here.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 4: The "Delete Account" button in `MeScreen`

**Files:**
- Modify: `apps/mobile/src/features/portal/MeScreen.tsx`
- Modify: `apps/mobile/__tests__/me-screen.test.tsx`

**Interfaces:**
- Consumes: `deleteOwnAccount` (Task 3, from `@rebin/api`), `useSessionStore` (already imported in `MeScreen.tsx`), `useRouter` (already imported), `PillButton` (already imported, `variant="quietDanger"` per `packages/ui/src/molecules/PillButton.tsx:8`), `Alert` (new import from `react-native`).
- Produces: nothing further downstream — this is the terminal task.

- [ ] **Step 1: Write the failing tests**

In `apps/mobile/__tests__/me-screen.test.tsx`, add `mockDeleteAccount` to the mock setup and three new `it` blocks. First, extend the top of the file:

```typescript
import { Alert } from "react-native";
```

Add to the top-level mock declarations (alongside `mockSignOut`):

```typescript
const mockDeleteAccount = jest.fn();
```

Add `deleteOwnAccount: (...a: unknown[]) => mockDeleteAccount(...a),` to the `jest.mock("@rebin/api", ...)` return object, alongside the existing `signOut` line.

Add to `beforeEach`, alongside `mockSignOut.mockResolvedValue(undefined);`:

```typescript
mockDeleteAccount.mockResolvedValue(undefined);
```

Then, inside the `describe("S71 Me", ...)` block, add these cases at the end (before the closing `});`):

```typescript
  it("shows a Delete Account button below Log Out", async () => {
    await renderMe();
    await waitFor(() => expect(screen.getByRole("button", { name: "Log Out" })).toBeTruthy());
    expect(screen.getByRole("button", { name: "Delete Account" })).toBeTruthy();
  });

  it("asks for confirmation before deleting, and does nothing on Cancel", async () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    await renderMe();
    await waitFor(() => expect(screen.getByRole("button", { name: "Delete Account" })).toBeTruthy());

    await fireEvent.press(screen.getByRole("button", { name: "Delete Account" }));

    expect(alertSpy).toHaveBeenCalledWith(
      "Delete Account?",
      "This will permanently delete your account and cannot be undone.",
      expect.any(Array),
    );
    expect(mockDeleteAccount).not.toHaveBeenCalled();
  });

  it("deletes the account, signs out and returns to login when confirmed", async () => {
    jest.spyOn(Alert, "alert").mockImplementation((_title, _message, buttons) => {
      const deleteButton = buttons?.find((b) => b.text === "Delete");
      deleteButton?.onPress?.();
    });
    await renderMe();
    await waitFor(() => expect(screen.getByRole("button", { name: "Delete Account" })).toBeTruthy());

    await fireEvent.press(screen.getByRole("button", { name: "Delete Account" }));

    await waitFor(() => expect(mockDeleteAccount).toHaveBeenCalledTimes(1));
    expect(useSessionStore.getState().status).toBe("signed-out");
    expect(mockReplace).toHaveBeenCalledWith("/login");
  });

  it("shows the server's error and stays signed in when deletion is blocked", async () => {
    mockDeleteAccount.mockRejectedValue(new Error("Remove your platform access first"));
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation((_title, _message, buttons) => {
      const deleteButton = buttons?.find((b) => b.text === "Delete");
      deleteButton?.onPress?.();
    });
    await renderMe();
    await waitFor(() => expect(screen.getByRole("button", { name: "Delete Account" })).toBeTruthy());

    await fireEvent.press(screen.getByRole("button", { name: "Delete Account" }));

    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith("Couldn't delete your account", "Remove your platform access first"),
    );
    expect(useSessionStore.getState().status).toBe("ready");
    expect(mockReplace).not.toHaveBeenCalledWith("/login");
  });
```

- [ ] **Step 2: Run the tests to confirm they fail**

Run: `pnpm --filter mobile test me-screen`
Expected: FAIL — no "Delete Account" button exists yet.

- [ ] **Step 3: Implement the button**

In `apps/mobile/src/features/portal/MeScreen.tsx`:

Add `Alert` to the `react-native` import (currently `import { Pressable, View } from "react-native";`):

```typescript
import { Alert, Pressable, View } from "react-native";
```

Add `deleteOwnAccount` to the `@rebin/api` import list (alongside `updateOwnProfile`):

```typescript
import {
  deleteOwnAccount,
  getBusinessDetail,
  getOrganizationDetail,
  getProfileDetail,
  updateOwnProfile,
  useSessionStore,
  type BusinessDetail,
  type OrgDetail,
  type PostalAddress,
  type ProfileDetail,
} from "@rebin/api";
```

Inside `export function MeScreen()`, add state and handlers alongside the existing `logout`/`pending` destructure:

```typescript
  const { logout, pending } = useLogout();
  const [deleting, setDeleting] = useState(false);

  function onDeletePress() {
    Alert.alert(
      "Delete Account?",
      "This will permanently delete your account and cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: onConfirmDelete },
      ],
    );
  }

  async function onConfirmDelete() {
    setDeleting(true);
    try {
      await deleteOwnAccount();
      useSessionStore.getState().setSignedOut();
      router.replace(asHref("/login"));
    } catch (e) {
      Alert.alert(
        "Couldn't delete your account",
        e instanceof Error ? e.message : "Something went wrong. Please try again.",
      );
    } finally {
      setDeleting(false);
    }
  }
```

This needs `useState` imported — check the existing import line at the top of the file (`import { useCallback, useState } from "react";`) and add `useState` if it is not already there.

Below the existing "Log Out" `PillButton` (the last element before the closing `</Screen>`), add:

```tsx
      <View style={{ height: tokens.space[2] }} />
      <PillButton
        label="Delete Account"
        accessibilityLabel="Delete Account"
        variant="quietDanger"
        loading={deleting}
        haptic="none"
        onPress={onDeletePress}
      />
```

- [ ] **Step 4: Run the tests to confirm they pass**

Run: `pnpm --filter mobile test me-screen`
Expected: PASS, all cases including the four new ones.

- [ ] **Step 5: Run the full mobile suite and typecheck**

Run: `pnpm --filter mobile typecheck && pnpm --filter mobile test`
Expected: typecheck clean; all test suites pass (145 tests plus the 3 new ones = 148).

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/src/features/portal/MeScreen.tsx apps/mobile/__tests__/me-screen.test.tsx
git commit -m "feat(mobile): add Delete Account to the Me screen

Apple rejected iOS 1.0 (6) under Guideline 5.1.1(v): the app supports
account creation but had no way to delete one. Below Log Out, matching
its confirmation pattern (a native Alert, no password re-entry -- Apple's
own guideline says a confirmation step is enough) rather than a bespoke
screen.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 5: Manual verification and the Apple screen recording

Not a code task — the acceptance test the spec calls out, and the artifact Apple's rejection message explicitly asks for in the resubmission.

**Files:** none.

- [ ] **Step 1: Run the app against the deployed function**

Start the mobile app (`pnpm --filter mobile start`, or `web` per the run-project convention already used this session) pointed at the real Supabase project. Sign in with a demo vendor account that owns no co-members (e.g. `rakib.collection@rebin.demo` — check `org_team`/`business_members` first if unsure whether it has any, per Task 1 Step 3's guidance on picking a test account).

- [ ] **Step 2: Record the flow on a physical device**

Screen-record, on a physical iOS device (Apple's rejection message specifies this, not a simulator): sign in with the demo account → navigate to the Me tab → tap "Delete Account" → confirm on the Alert → land back on the login screen.

- [ ] **Step 3: Confirm the account is actually gone**

In the Supabase SQL editor:

```sql
select id from auth.users where email = 'rakib.collection@rebin.demo';
```

Expected: zero rows. If this account needs to stay usable as a demo login for future testing, use a disposable test account created for this recording instead, and re-create the demo vendor afterward through the normal signup endpoint (per `CLAUDE.md`'s note that all twelve demo accounts were created that way, not by hand).

- [ ] **Step 4: Attach to the App Store Connect resubmission**

Per Apple's rejection message: include the recording in the Notes field of the App Review Information section, alongside addressing the other two grounds (Sign in with Apple button/crash — already fixed on `main`; the account-deletion flow this plan built). This step is a client/account-holder action outside this repo, matching `CLAUDE.md`'s existing pattern for App Store Connect work that needs the account holder rather than code.
