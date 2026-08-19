# Retire the Agent Mobile Portal — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the agent's mobile app, leaving the console, the database, and the people who do the collecting exactly as they are.

**Architecture:** What is being dropped is the agent's phone, not the agent. Somebody still collects from organizations — the client said "Rebin tech team will go for pickup" — and an operator still needs to see who is out and mark a job done, so `/admin/agents` in the console stays. The mobile portal, its signup path, and the `agent` portal key come out; `field_agent`, `agent_profiles`, and `job_assignments` stay untouched in the database, because a pickup cannot reach `completed` without them.

**Tech Stack:** Expo Router + React Native (mobile), TypeScript, Zod, Jest.

**Spec:** `docs/superpowers/specs/2026-08-19-supplier-and-weight-design.md` — see the bullet "No agent removal, yet — and the console keeps agents regardless". This plan executes that removal, now that supplier has landed.

## Global Constraints

- **The console keeps agents.** Nothing under `apps/web/app/admin/(console)/agents/` is touched. An operator must still be able to list agents, see who holds a live job, and approve or suspend one.
- **The database is not touched.** No migration. `field_agent` and `field_lead` stay in `role_enum`; `agent_profiles`, `job_assignments`, `create_field_agent`, `set_agent_status`, `claim_job`, `advance_job`, `list_my_jobs`, `list_available_jobs` and every agent RLS policy stay exactly as they are. `job_assignments` is how a pickup reaches `completed`, which is where a recycling certificate comes from.
- **Existing agent accounts are not deleted or altered.** A real agent row exists (`Sam Driver`, active, holding a live job). Their work moves to the console; their record does not move at all.
- **`supabase/functions/signup-agent/` stays deployed.** Removing a deployed function is a separate, riskier act than removing the client that calls it, and nothing breaks by leaving it unreachable.
- **A role union member is never handled by widening a type to `string`.** If removing `agent` makes a map non-exhaustive, fix the map.
- **Tests are updated, never deleted, unless the behaviour they cover is genuinely gone.** A test that asserted "an agent signing up lands on dispatch" describes a flow that no longer exists and should go. A test that asserted "three portals get three accent colours" should become two, not disappear.
- `pnpm --filter mobile typecheck`, `pnpm --filter @rebin/shared typecheck`, and `pnpm --filter web typecheck` all pass before a task is done.

## File Structure

**Deleted**
- `apps/mobile/app/(agent)/` — five route files: `_layout.tsx`, `dispatch.tsx`, `history.tsx`, `me.tsx`, `job/[id].tsx`

**Modified — mobile**
- `apps/mobile/src/components/RoleGuard.tsx` — `HOME_BY_PORTAL` loses its agent entry
- `apps/mobile/app/(auth)/context-picker.tsx` — the agent destination and its role labels
- `apps/mobile/app/(auth)/signup/index.tsx` — the agent card comes off the picker
- `apps/mobile/app/(auth)/signup/register.tsx` — the agent branch of the form
- `apps/mobile/src/features/portal/MeScreen.tsx` — any agent-specific panel
- `apps/mobile/src/features/jobs/JobCard.tsx` — delete if nothing else imports it

**Modified — shared packages**
- `packages/shared/src/schemas/signup.ts` — `SIGNUP_ROLES` and the `agent` union member
- `packages/shared/src/brand.ts` — `PORTAL_ACCENTS`, `PORTAL_ACCENT_TEXT`, `PORTAL_ON_ACCENT`, `PORTAL_ACCENTS_SUBTLE`, and `PortalKey` derived from them
- `packages/api/src/auth.ts` — `PORTAL_BY_ROLE` loses `field_agent` and `field_lead`

**Modified — tests**
- `apps/mobile/__tests__/`: `login`, `me-screen`, `routing`, `session-bootstrap`, `signup-picker`, `signup-register`
- `packages/api/src/__tests__/auth.test.ts`
- `packages/ui/src/__tests__/screen.test.tsx`, `theme.test.tsx`

---

### Task 1: Take the agent out of the shared packages

The portal key is the root of the removal: everything downstream is a consequence of `PortalKey` no longer having an `agent` member. Doing this first makes the compiler produce the list of every remaining call site, which is more reliable than grepping for them.

**Files:**
- Modify: `packages/shared/src/brand.ts`
- Modify: `packages/shared/src/schemas/signup.ts`
- Modify: `packages/api/src/auth.ts`
- Test: `packages/ui/src/__tests__/theme.test.tsx`, `packages/ui/src/__tests__/screen.test.tsx`, `packages/api/src/__tests__/auth.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `PortalKey` = `"org" | "business"`; `SIGNUP_ROLES` = `["organization", "business", "supplier"]`; `portalForRole("field_agent")` returns `null`.

- [ ] **Step 1: Read what the agent occupies today**

Run:
```bash
grep -n "agent" packages/shared/src/brand.ts
grep -n "agent" packages/shared/src/schemas/signup.ts
grep -n "agent" packages/api/src/auth.ts
```

Expected: four portal maps in `brand.ts` each carrying an `agent` key; `SIGNUP_ROLES` containing `"agent"` and a `z.literal("agent")` union member in `signup.ts`; `PORTAL_BY_ROLE` mapping `field_agent` and `field_lead` to `"agent"` in `auth.ts`.

Note that `PortalKey` is `keyof typeof PORTAL_ACCENTS` — so removing the key from that one object is what changes the type, and the other three maps must lose it too or they stop matching.

- [ ] **Step 2: Run the tests that will break, and read their expectations**

Run:
```bash
pnpm --filter @rebin/ui test
pnpm --filter @rebin/api test
```

Expected: PASS, for now. Read `theme.test.tsx` and `screen.test.tsx` and write down exactly which assertions name the agent portal — after the change, each is either updated to cover two portals or deleted because it covered a portal that no longer exists.

- [ ] **Step 3: Remove the agent portal from the brand**

In `packages/shared/src/brand.ts`, delete the `agent` entry from `PORTAL_ACCENTS`, `PORTAL_ACCENT_TEXT`, `PORTAL_ON_ACCENT` and `PORTAL_ACCENTS_SUBTLE`.

The doc comment above `PORTAL_ACCENTS` explains the copper accent as "that portal is staff, and the difference is worth showing". That reasoning is now history, so replace it rather than leaving it describing a portal that is gone:

```ts
/**
 * Two customer portals in one brand colour.
 *
 * The business portal ran on contact gold for a while, on the argument that
 * separate portals are separate products. Changed at the client's direction:
 * the organization and the business are both *customers*, and a customer
 * dealing with Rebin in both capacities should not feel handed between two
 * companies.
 *
 * A third, copper accent belonged to the agent portal, which was retired when
 * agents stopped working from their own app. Collections are dispatched from
 * the operations console now, so there is no third audience to distinguish.
 */
```

- [ ] **Step 4: Remove the agent signup role**

In `packages/shared/src/schemas/signup.ts`:

- Drop `"agent"` from `SIGNUP_ROLES`, leaving `["organization", "business", "supplier"]`.
- Delete the `z.literal("agent")` member of the discriminated union, together with its `vehicle` and `hasDriversLicense` fields.
- Delete the branch of the converter that builds the agent signup payload.

If `AGENT_VEHICLES` in `packages/shared/src/enums.ts` now has no importer, leave the constant in place and say why in a one-line comment — `agent_vehicle_enum` is still a live column on `agent_profiles`, and the console may yet want the labels.

- [ ] **Step 5: Stop routing agent roles to a portal**

In `packages/api/src/auth.ts`, remove `field_agent` and `field_lead` from `PORTAL_BY_ROLE`.

`portalForRole` already returns `null` for an unmapped role, so an agent now resolves to no portal. That is correct and load-bearing: `resolveInitialRoute` sends a user with no portal to `/pending`, which is where an agent-only account should land in an app that has no agent screens.

Add a comment saying so, because a future reader will otherwise assume the omission is a bug:

```ts
// field_agent and field_lead map to no portal on purpose. Agents work from
// the operations console now, not from this app, so an agent-only account
// has nothing to open here and resolveInitialRoute sends it to /pending.
```

- [ ] **Step 6: Update the tests to cover two portals**

Run: `pnpm --filter @rebin/ui test && pnpm --filter @rebin/api test`

Expected: failures in the assertions you noted in Step 2.

For each: if it asserted a property of the agent portal specifically, delete it — the portal is gone. If it asserted something across all portals (a count, an iteration, a contrast check), update it to two.

In `auth.test.ts`, an assertion that `portalForRole("field_agent")` returns `"agent"` becomes an assertion that it returns `null`. Do not delete it — that it returns null is now the behaviour worth pinning.

- [ ] **Step 7: Run the tests and typecheck**

Run:
```bash
pnpm --filter @rebin/ui test
pnpm --filter @rebin/api test
pnpm --filter @rebin/shared test
pnpm --filter @rebin/shared typecheck
```

Expected: PASS. The mobile app will not typecheck yet — that is Task 2.

- [ ] **Step 8: Commit**

```bash
git add packages/
git commit -m "refactor(shared): retire the agent portal key

PortalKey loses its agent member, SIGNUP_ROLES loses the agent role, and
PORTAL_BY_ROLE stops mapping field_agent and field_lead to anything.

Doing this first is deliberate: everything downstream is a consequence of the
type, so the compiler now produces the list of remaining call sites, which is
more trustworthy than grepping for the word agent.

An agent-only account resolves to no portal and therefore to /pending, which
is the honest answer in an app that no longer has agent screens. The roles
themselves stay in role_enum -- the console still lists agents and job
assignments are still how a pickup reaches completed.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: Delete the agent screens and their routes

With `PortalKey` narrowed, the mobile app no longer typechecks. This task removes what the compiler is now complaining about.

**Files:**
- Delete: `apps/mobile/app/(agent)/_layout.tsx`, `dispatch.tsx`, `history.tsx`, `me.tsx`, `job/[id].tsx`
- Modify: `apps/mobile/src/components/RoleGuard.tsx`
- Modify: `apps/mobile/app/(auth)/context-picker.tsx`
- Modify: `apps/mobile/src/features/portal/MeScreen.tsx`
- Possibly delete: `apps/mobile/src/features/jobs/JobCard.tsx`
- Test: `apps/mobile/__tests__/routing.test.tsx`, `login.test.tsx`, `session-bootstrap.test.tsx`, `me-screen.test.tsx`

**Interfaces:**
- Consumes: `PortalKey` without `agent`, `portalForRole` returning null for agent roles (Task 1).
- Produces: a mobile app with two portals.

- [ ] **Step 1: Let the compiler produce the list**

Run: `pnpm --filter mobile typecheck`

Expected: FAIL. Write down every file and line it names. That list, not a grep, is the work of this task.

- [ ] **Step 2: Delete the route group**

```bash
git rm -r "apps/mobile/app/(agent)"
```

Expo Router derives its route table from the filesystem, so removing the directory removes the routes. Nothing registers them by hand.

- [ ] **Step 3: Narrow the portal home map**

In `apps/mobile/src/components/RoleGuard.tsx`, remove the `agent` entry from `HOME_BY_PORTAL`. With `PortalKey` narrowed in Task 1, `Record<PortalKey, string>` now demands exactly two keys, so leaving it would be a type error and removing it is not optional.

Read `resolveInitialRoute` before and after: a user whose roles map to no portal must still reach `/pending`, and that path must not have depended on the agent entry existing.

- [ ] **Step 4: Take the agent out of the context picker**

In `apps/mobile/app/(auth)/context-picker.tsx`, remove the agent destination and the `field_agent` / `field_lead` labels.

The picker exists for a user holding roles in more than one portal. An agent role now maps to no portal, so it must not appear as a choice — a card that navigates nowhere is worse than no card.

- [ ] **Step 5: Remove agent-specific profile content**

In `apps/mobile/src/features/portal/MeScreen.tsx`, remove any panel that renders agent details — service area, vehicle, licence. Leave the organization and business panels untouched.

- [ ] **Step 6: Delete JobCard if nothing imports it**

Run:
```bash
grep -rn "JobCard" apps/mobile --include=*.tsx --include=*.ts
```

If the only hits are its own definition and its test, delete both. If anything else imports it, leave it and note why in your report.

- [ ] **Step 7: Update the mobile tests**

Run: `pnpm --filter mobile test`

Expected: failures in `routing`, `login`, `session-bootstrap`, `me-screen`.

For each: a test asserting an agent lands on `/(agent)/dispatch` is asserting a flow that no longer exists — replace it with one asserting an agent-only account lands on `/pending`, which is the new truth and worth pinning. A test that merely used an agent role as a fixture for something unrelated should switch to a business role rather than being deleted.

Note: `manual-entry.test.tsx` and `me-screen.test.tsx` have pre-existing timeout flakiness. If one fails on a timeout rather than an assertion, re-run it alone before treating it as your regression.

- [ ] **Step 8: Typecheck and test**

Run:
```bash
pnpm --filter mobile typecheck
pnpm --filter mobile test
```

Expected: PASS both.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "refactor(mobile): remove the agent portal

Five screens, the portal home entry, the context-picker destination and the
agent panel on the profile screen. Agents work from the operations console
now, so the app has nothing to show them.

An agent-only account resolves to no portal and lands on /pending rather than
a blank screen. The tests that asserted it landed on dispatch now assert that,
because it is the behaviour that replaced them.

Nothing in the database moved. field_agent is still a role, agent_profiles and
job_assignments are untouched, and /admin/agents in the console still lists
them -- somebody still collects from organizations, and a pickup still cannot
reach completed without a job assignment.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: Take the agent off the signup picker

A person can no longer register as an agent from the app. Agent accounts are created by an operator, which is the same shape as the platform-staff rule: an account with authority is issued, not self-served.

**Files:**
- Modify: `apps/mobile/app/(auth)/signup/index.tsx`
- Modify: `apps/mobile/app/(auth)/signup/register.tsx`
- Test: `apps/mobile/__tests__/signup-picker.test.tsx`, `apps/mobile/__tests__/signup-register.test.tsx`

**Interfaces:**
- Consumes: `SIGNUP_ROLES` without `agent` (Task 1).
- Produces: a three-card signup picker — Organization, Business, Supplier.

- [ ] **Step 1: Read the picker and the form's agent branch**

Run:
```bash
grep -n "agent" "apps/mobile/app/(auth)/signup/index.tsx"
grep -n "agent\|vehicle\|hasDriversLicense" "apps/mobile/app/(auth)/signup/register.tsx"
```

Expected: an agent card in the picker's options array; a branch in the form rendering the vehicle picker and the driving-licence toggle.

- [ ] **Step 2: Remove the card**

Delete the agent entry from the picker's options array, and any agent-specific icon or accent that now has no other user.

The picker's ordering comment says the cards are ordered by expected volume. Check that the comment still describes the remaining three, and correct it if it names the agent.

- [ ] **Step 3: Remove the form branch**

Delete the branch rendering `vehicle` and `hasDriversLicense`. With the union member gone in Task 1, `role === "agent"` is now a type error, so the compiler will point at every piece.

- [ ] **Step 4: Update the signup tests**

Run: `pnpm --filter mobile test -- signup`

Expected: failures.

`signup-picker.test.tsx` asserts a card count — it becomes three. `signup-register.test.tsx` has nine agent references; each is either a test of the agent form (delete — that form is gone) or a fixture (switch it to a business or supplier).

- [ ] **Step 5: Typecheck and run everything**

Run:
```bash
pnpm --filter mobile typecheck
pnpm --filter mobile test
pnpm --filter @rebin/shared test
pnpm --filter web typecheck
```

Expected: PASS all four. The web typecheck matters because `packages/shared` changed and the console imports from it.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor(mobile): drop agent from the signup picker

Nobody registers as an agent from the app any more. An agent account is
created by an operator, which is the same rule the platform roles already
follow: an account carrying authority over other people's collections is
issued, not self-served.

signup-agent stays deployed and unreachable. Removing a live edge function is
a riskier act than removing the client that called it, and nothing breaks by
leaving it there.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Verification

After Task 3, one pass:

- [ ] `pnpm --filter mobile typecheck`, `pnpm --filter @rebin/shared typecheck`, `pnpm --filter web typecheck` — all clean.
- [ ] `pnpm --filter mobile test`, `pnpm --filter @rebin/shared test`, `pnpm --filter @rebin/ui test`, `pnpm --filter @rebin/api test` — all pass.
- [ ] `grep -rn "(agent)" apps/mobile` returns nothing.
- [ ] The mobile signup picker offers exactly three cards: Organization, Business, Supplier.
- [ ] **The console is untouched and still works.** With the dev server running on 4300, sign in as `admin@rebin.test`, open `/admin/agents`, and confirm `Sam Driver` still appears with their status and current job. Nothing in `apps/web` should appear in this branch's diff.
- [ ] `git diff main --stat -- supabase/` is empty. No migration belongs in this branch.

## Out of scope

Weight-based pricing and payout recording are the remaining stages of the spec. Nothing here touches `price_items`, the appraisal prompt, or quotes.
