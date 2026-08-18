# Supplier Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a third kind of seller — a supplier, who gets a price estimate and ships to the warehouse but can never book a pickup.

**Architecture:** Supplier is a `business_type_enum` value on the existing `businesses` table, not a new table. The price is identical for a business and a supplier, so the entity is the same entity; the only difference is that a supplier cannot book a pickup, and that is one rule enforced in the database. Registration reuses the existing business signup path — the two differ by two fields out of six.

**Tech Stack:** Postgres (Supabase), TypeScript, Expo Router + React Native (mobile), Next.js App Router (web console), Zod (validation), Deno (edge functions).

**Spec:** `docs/superpowers/specs/2026-08-19-supplier-and-weight-design.md`

## Global Constraints

- **No service-role key in any client application.** Every write carries the caller's own session so the RPC's role check stays the real boundary.
- **Every write is exactly one RPC call.** No direct table writes from an app.
- **Rules live in the database.** A UI that hides a control is a convenience; the RPC that refuses the call is the rule. Both, in that order of authority.
- **Reuse before adding.** Supplier signup extends the business path rather than copying it; the console reuses `businesses` screens rather than adding supplier-specific ones.
- **`businesses.ein` stays nullable and is never required for a supplier.** No SSN is collected anywhere.
- **Enum values are added, never dropped.** Postgres cannot drop one, and existing rows reference the current values.
- **Verification is against the live database**, signed in as `admin@rebin.test`. A dev server runs on `http://localhost:4300`; never start a second one and never run `pnpm build` while it is up.
- `pnpm --filter web typecheck` and `pnpm --filter mobile typecheck` both pass before a task is done.

## File Structure

**Database**
- Create `supabase/migrations/0033_supplier.sql` — the enum value, the pickup refusal, and the audit note.

**Shared package** (validation and labels both apps read)
- Modify `packages/shared/src/enums.ts` — `BUSINESS_TYPES`, plus a supplier constant.
- Modify `packages/shared/src/schemas/signup.ts` — a `supplier` member on the discriminated union, and its `toSignupInput` branch.
- Modify `packages/shared/src/schemas/roles.ts` — the role picker's shape.

**Edge function**
- Modify `supabase/functions/signup-business/index.ts` — accept a supplier without an EIN.

**Mobile**
- Modify `apps/mobile/app/(auth)/signup/index.tsx` — a third card on the picker.
- Modify `apps/mobile/app/(auth)/signup/register.tsx` — the supplier branch of the form.
- Modify `apps/mobile/app/(biz)/dashboard.tsx` — ship-to-warehouse instead of a pickup control.

**Console**
- Modify `apps/web/app/admin/(console)/accounts/page.tsx` — show which kind of business is waiting.

---

### Task 1: The database rule

A supplier that can book a pickup is the one thing this feature must make impossible. That belongs in a migration, before any UI exists to hide the button.

**Files:**
- Create: `supabase/migrations/0033_supplier.sql`

**Interfaces:**
- Consumes: `business_type_enum` (0011), `businesses`, `pickup_requests`, `is_business_member()` (0011), `has_role()` (0008).
- Produces: the enum value `'supplier'`; the predicate `is_supplier(p_business_id uuid) returns boolean`.

- [ ] **Step 1: Read the existing enum and the pickup insert policy**

Run:
```bash
grep -n "business_type_enum" supabase/migrations/0011_business_agent_signup.sql
grep -n -A6 "create policy req_insert" supabase/migrations/0008_rls.sql
```

Expected: the enum has six values (`repair_shop`, `electronics_retailer`, `scrap_dealer`, `it_reseller`, `refurbisher`, `other`); `req_insert` checks `created_by = auth.uid()` and organization membership.

Note what this tells you: `pickup_requests` is scoped to organizations via `org_id`, so a business — supplier or not — has no direct path to insert one today. The refusal below is therefore defence in depth for the moment a business pickup route is added, and the comment in the migration must say so rather than implying it blocks something reachable today.

- [ ] **Step 2: Write the migration**

Create `supabase/migrations/0033_supplier.sql`:

```sql
-- A supplier: someone who collects e-waste and sells it on.
--
-- "A supplier can be anyone who wants to do business. Rakib collects e-waste
-- from stores, stores it, manages e-waste from neighbours -- he is a supplier,
-- he can sell his e-waste to us."
--
-- Modelled as a business_type rather than a new table. A supplier and a
-- business are quoted from the same catalog at the same rates, so they are the
-- same kind of thing to every part of this schema: business_members,
-- is_business_member(), the quotes foreign key and the RLS policies all apply
-- unchanged. What differs is one rule -- a supplier ships to the warehouse and
-- never books a pickup -- and a rule does not need its own table.

alter type business_type_enum add value if not exists 'supplier';

-- Enum values are not visible to later statements in the same transaction, so
-- anything reading 'supplier' must land in its own migration or after a
-- commit. That is why the guard below compares text rather than the enum.

/** Is this business a supplier, i.e. ships rather than being collected from. */
create or replace function is_supplier(p_business_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from businesses
     where id = p_business_id
       and business_type::text = 'supplier'
  );
$$;

comment on function is_supplier(uuid) is
  'True when the business ships to the warehouse instead of booking a pickup.';
```

- [ ] **Step 3: Apply it and confirm the value exists**

Run this against the project (Supabase SQL editor, or `supabase db push` if the CLI is linked):

```sql
select unnest(enum_range(null::business_type_enum))::text as business_type;
```

Expected: seven rows, the last being `supplier`.

Then:

```sql
select is_supplier(id), name, business_type
  from businesses
 limit 5;
```

Expected: runs without error; every existing row returns `false`, because no business is a supplier yet.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0033_supplier.sql
git commit -m "feat(db): add the supplier business type

A supplier collects e-waste and sells it on -- it is quoted from the same
catalog at the same rates as a business, so it is modelled as a business_type
rather than a table. business_members, is_business_member(), the quotes
foreign key and every RLS policy then apply to it unchanged.

What differs is that a supplier ships to the warehouse and never books a
pickup. is_supplier() is the predicate the app and any future pickup route
ask; today no business can insert a pickup_request at all (req_insert in 0008
scopes them to organization members), so this is the rule written down before
there is a button to hide.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: Shared validation

Both apps read their field rules from `packages/shared`. Supplier is a fourth member of the signup union whose only difference from a business is that it has no EIN field.

**Files:**
- Modify: `packages/shared/src/enums.ts`
- Modify: `packages/shared/src/schemas/signup.ts`
- Test: `packages/shared/src/__tests__/schemas.test.ts` (exists — append to it)

**Interfaces:**
- Consumes: `BUSINESS_TYPES` and the existing `signupFormSchema` discriminated union.
- Produces: `signupFormSchema` accepting `role: "supplier"`; `toSignupInput` returning a `businessType` of `"supplier"` and an empty `ein` for that role.

- [ ] **Step 1: Read the existing union and its converter**

Run:
```bash
sed -n '45,80p' packages/shared/src/schemas/signup.ts
grep -n -A20 "toSignupInput\|toBizSignupInput" packages/shared/src/schemas/signup.ts | head -40
grep -n "BUSINESS_TYPES" packages/shared/src/enums.ts
```

Expected: a `z.discriminatedUnion("role", [...])` with `organization`, `business`, `agent` members; `commonFields` spread into each; a converter that maps form values to the endpoint payload.

Note the exact name of the converter function and the exact shape it returns for `business` — the supplier branch must return the same shape.

- [ ] **Step 2: Write the failing test**

Append to `packages/shared/src/__tests__/schemas.test.ts` (it already covers the
other three signup roles — read it first and match its import style and its
fixture names rather than introducing a second convention):

```ts
import { describe, expect, it } from "@jest/globals";
import { signupFormSchema } from "../schemas/signup";

const base = {
  contactName: "Rakib Hasan",
  email: "rakib@example.com",
  phone: "5550100099",
  password: "correct horse battery",
  confirmPassword: "correct horse battery",
};

describe("supplier signup", () => {
  it("accepts a supplier without an EIN", () => {
    const parsed = signupFormSchema.safeParse({
      ...base,
      role: "supplier",
      entityName: "Rakib Collection",
      street: "88 Kirby St",
      city: "Cleveland",
      state: "OH",
      zip: "44114",
    });
    expect(parsed.success).toBe(true);
  });

  it("still requires a name", () => {
    const parsed = signupFormSchema.safeParse({
      ...base,
      role: "supplier",
      entityName: "",
      street: "88 Kirby St",
      city: "Cleveland",
      state: "OH",
      zip: "44114",
    });
    expect(parsed.success).toBe(false);
  });
});
```

Adjust `base` to match the real `commonFields` if they differ — read them in Step 1 and use the actual field names.

- [ ] **Step 3: Run the test and watch it fail**

Run: `pnpm --filter @rebin/shared test -- schemas`

Expected: FAIL — the union has no `supplier` member, so `safeParse` returns `success: false` on the first test.

- [ ] **Step 4: Add the supplier member**

In `packages/shared/src/schemas/signup.ts`, add a fourth member to the union, after the `business` member:

```ts
    z.object({
      role: z.literal("supplier"),
      ...commonFields,
      entityName: z.string().min(2, "Your name or trading name is required"),
      street: z.string().min(3, "Street address is required"),
      // No EIN and no business type. A supplier is frequently one person
      // working out of a garage -- asking for a federal tax number at signup
      // turns away the exact audience this role exists to reach, and
      // businesses.ein has been nullable since 0011 for this case.
    }),
```

In `packages/shared/src/enums.ts`, add the constant the apps will use:

```ts
/** The business_type every supplier is registered under. See 0033. */
export const SUPPLIER_BUSINESS_TYPE = "supplier" as const;
```

And extend `BUSINESS_TYPES` to include it, so the type matches the database:

```ts
export const BUSINESS_TYPES = ["repair_shop", "electronics_retailer", "scrap_dealer", "it_reseller", "refurbisher", "supplier", "other"] as const;
```

- [ ] **Step 5: Extend the converter**

In the same file, add a `supplier` branch to the function that builds the endpoint payload. It returns the business shape, with the type fixed and the EIN empty:

```ts
  if (v.role === "supplier") {
    return {
      contactName: v.contactName,
      email: v.email,
      phone: v.phone,
      password: v.password,
      businessName: v.entityName,
      businessType: SUPPLIER_BUSINESS_TYPE,
      ein: "",
      street: v.street,
      city: v.city,
      state: v.state,
      zip: v.zip,
    };
  }
```

Match the exact property names and the exact return type you read in Step 1. If the existing business branch names the payload differently, follow it.

- [ ] **Step 6: Run the tests and watch them pass**

Run: `pnpm --filter @rebin/shared test -- schemas`

Expected: PASS, both tests.

Then run the whole shared suite, because `BUSINESS_TYPES` gained a member and something may assert its length:

Run: `pnpm --filter @rebin/shared test`

Expected: PASS. If a test asserts a count of business types, update that assertion — a hard-coded six was correct until now.

- [ ] **Step 7: Commit**

```bash
git add packages/shared/src
git commit -m "feat(shared): validate supplier signup

A supplier is a business with two fields fewer: no EIN and no business-type
choice. Modelled as a fourth member of the signup union rather than a second
form, because the two differ by two fields out of six and a copied form drifts
the first time a validation rule changes.

No EIN is asked for at all. A supplier is frequently one person working out of
a garage, and businesses.ein has been nullable since 0011 for exactly this.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: The signup endpoint

The edge function already passes `p_ein: body.ein ?? ""` and the RPC already nullifs it. Supplier needs the endpoint to accept its role, and nothing else.

**Files:**
- Modify: `supabase/functions/signup-business/index.ts`
- Modify: `packages/shared/src/schemas/roles.ts`

**Interfaces:**
- Consumes: `create_business_with_owner(p_user_id, p_full_name, p_phone, p_business_name, p_business_type, p_ein, p_street, p_city, p_state, p_zip)` — unchanged from 0011.
- Produces: the same endpoint accepting `businessType: "supplier"` with `ein: ""`.

- [ ] **Step 1: Read what the endpoint validates today**

Run:
```bash
cat supabase/functions/signup-business/index.ts
grep -n -B3 -A12 "businessType" packages/shared/src/schemas/roles.ts
```

Expected: the function reads a body, calls `supabase.rpc("create_business_with_owner", {...})` with the ten `p_` arguments, and returns the new business id. `roles.ts` carries a `businessType: z.enum(BUSINESS_TYPES)`.

Confirm for yourself that `p_ein: body.ein ?? ""` is already there, and that `create_business_with_owner` wraps it in `nullif(p_ein, '')`. If both hold, this task changes no SQL and no RPC arguments.

- [ ] **Step 2: Make the endpoint accept a supplier**

Whatever validation the function applies to `businessType`, it must now admit `supplier`. Since `BUSINESS_TYPES` gained the value in Task 2, an endpoint validating against that constant needs no edit — verify by reading, and only change what actually rejects it.

If the function hard-codes a list of types, replace that list with an import of `BUSINESS_TYPES` rather than adding one more string, and say why in a comment:

```ts
// Validated against the shared constant rather than a list repeated here:
// two lists of business types drift, and the one that drifts silently is the
// one nobody reads.
```

- [ ] **Step 3: Deploy and call it**

Deploy the function (`supabase functions deploy signup-business`), then create a real supplier against the live project:

```bash
curl -s -X POST "$SUPABASE_URL/functions/v1/signup-business" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "contactName": "Rakib Hasan",
    "email": "rakib+supplier@rebin.test",
    "phone": "5550100099",
    "password": "correct horse battery",
    "businessName": "Rakib Collection (demo)",
    "businessType": "supplier",
    "ein": "",
    "street": "88 Kirby St",
    "city": "Cleveland",
    "state": "OH",
    "zip": "44114"
  }'
```

Expected: a success response carrying a business id.

Then confirm in SQL:

```sql
select name, business_type, ein, status from businesses where name like '%(demo)%';
```

Expected: one row, `business_type = supplier`, `ein` **null** (not an empty string — that is `nullif` doing its job), `status = pending_verification`.

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/signup-business packages/shared/src/schemas/roles.ts
git commit -m "feat(api): accept supplier registrations

The endpoint already passed p_ein as an empty string and the RPC already
nullifs it, so a supplier needed no new SQL and no new arguments -- only for
the type to be admitted. Validating against the shared BUSINESS_TYPES rather
than a list repeated in the function keeps the two from drifting.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: Mobile signup

A third card on the picker and a fourth branch on the form.

**Files:**
- Modify: `apps/mobile/app/(auth)/signup/index.tsx`
- Modify: `apps/mobile/app/(auth)/signup/register.tsx`
- Test: `apps/mobile/__tests__/signup-picker.test.tsx`

**Interfaces:**
- Consumes: `signupFormSchema` with its `supplier` member (Task 2); the endpoint accepting `businessType: "supplier"` (Task 3).
- Produces: a `supplier` route through the existing signup screens.

- [ ] **Step 1: Read the picker and the form**

Run:
```bash
sed -n '1,60p' "apps/mobile/app/(auth)/signup/index.tsx"
grep -n "role ===\|businessType\|ein" "apps/mobile/app/(auth)/signup/register.tsx" | head -20
```

Expected: the picker renders an array of cards, each with a `key`, a `signupRole`, a title and a description; the form branches on the selected role to decide which fields to render.

- [ ] **Step 2: Add the picker card**

In the array in `index.tsx`, after the `business` entry:

```tsx
  {
    key: "supplier",
    signupRole: "supplier",
    title: "Supplier",
    // Named for what the person does, not for what the schema calls them: a
    // shop owner reading "supplier" cannot tell whether it means him.
    blurb: "You collect e-waste yourself -- from shops, neighbours, your own stock -- and want to sell it on. You bring it to us.",
  },
```

Match the exact property names the existing entries use.

- [ ] **Step 3: Add the form branch**

In `register.tsx`, wherever the business branch renders its fields, render the same set for a supplier **minus the EIN field and minus the business-type picker**. Do not copy the block: extend the condition that shows the shared address fields to include `supplier`, and gate only the two business-specific fields on `role === "business"`.

Expected shape of the change — the address fields' condition widens, the EIN field's narrows:

```tsx
{(role === "business" || role === "supplier") && (
  // name, street, city, state, zip
)}

{role === "business" && (
  // business type picker, EIN
)}
```

- [ ] **Step 4: Run the mobile tests**

Run: `pnpm --filter mobile test`

Expected: PASS. If `signup-picker.test.tsx` asserts a card count, update it to four and say why in the diff — a hard-coded three was correct until now.

- [ ] **Step 5: Typecheck**

Run: `pnpm --filter mobile typecheck`

Expected: no errors. A `role` union that gained a member will surface anywhere a switch is now non-exhaustive; fix each by handling `supplier`, never by widening a type to `string`.

- [ ] **Step 6: Commit**

```bash
git add "apps/mobile/app/(auth)/signup" apps/mobile/__tests__
git commit -m "feat(mobile): let a supplier register

A third card on the picker and a fourth branch on the form. The supplier
branch reuses the business address fields rather than repeating them -- the
two roles differ by the EIN and the business-type picker, so those two are
what the condition narrows on.

The card is named for what the person does rather than for what the schema
calls them: a shop owner reading 'supplier' cannot tell whether it means him.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 5: A supplier ships, it is not collected from

The supplier's dashboard must not offer a pickup, and must say what to do instead.

**Files:**
- Modify: `apps/mobile/app/(biz)/dashboard.tsx`
- Test: `apps/mobile/__tests__/` (add a supplier case to the dashboard test if one exists)

**Interfaces:**
- Consumes: `SUPPLIER_BUSINESS_TYPE` (Task 2); the signed-in business's `business_type`.
- Produces: nothing later tasks depend on.

- [ ] **Step 1: Read the dashboard**

Run:
```bash
grep -n "pickup\|quote\|business_type\|Schedule" "apps/mobile/app/(biz)/dashboard.tsx" | head -20
```

Expected: controls for requesting a quote and — if present — for scheduling a pickup.

Note whether the screen already reads `business_type`. If it does not, it must query it; a screen that decides what to show from a role alone cannot tell a supplier from a repair shop, because both are `biz_owner`.

- [ ] **Step 2: Hide the pickup control and say why**

Where a pickup control renders, gate it and put the alternative in its place:

```tsx
{isSupplier ? (
  <Card>
    <Text>Ship it to us</Text>
    <Text>
      Send your collection to the Rebin Tech warehouse. We weigh and sort it
      on arrival, and your payout follows within seven days.
    </Text>
    <Text selectable>{WAREHOUSE_ADDRESS}</Text>
  </Card>
) : (
  // the existing pickup control
)}
```

Put `WAREHOUSE_ADDRESS` in `packages/shared` beside the other brand constants, not inline in a screen — the console will need the same string.

- [ ] **Step 3: Say that the estimate is an estimate**

Wherever the quote total renders for a supplier, label it. The final price comes from the scale, and a number shown without that qualification is a promise:

```tsx
<Text>Estimated -- final price is set when we weigh it</Text>
```

- [ ] **Step 4: Run the tests and typecheck**

Run: `pnpm --filter mobile test && pnpm --filter mobile typecheck`

Expected: PASS, no type errors.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile packages/shared/src
git commit -m "feat(mobile): a supplier ships instead of booking a pickup

The pickup control is replaced for suppliers by where to send the material
and what happens next. A screen that only hid the button would leave the
supplier with no answer to the obvious question.

The screen reads business_type rather than the role, because a supplier and a
repair shop are both biz_owner and the role cannot tell them apart.

The quote total is labelled an estimate wherever a supplier sees it. The final
price comes from the scale, and an unqualified number is a promise.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 6: The console tells the two apart

An operator reviewing the queue needs to know whether a pending account is a business or a supplier, because the paperwork differs.

**Files:**
- Modify: `apps/web/app/admin/(console)/accounts/page.tsx`

**Interfaces:**
- Consumes: the `pending_accounts` view (0015), which already returns `kind`.
- Produces: nothing later tasks depend on.

- [ ] **Step 1: Read the accounts screen and the view**

Run:
```bash
sed -n '1,60p' "apps/web/app/admin/(console)/accounts/page.tsx"
grep -n -A12 "create or replace view pending_accounts" supabase/migrations/0015_account_review.sql
```

Expected: the view unions organizations, businesses and agents, returning `kind, id, name, status, created_at`. It does **not** return `business_type` — so the screen must join to `businesses` for it, or the type is unavailable.

- [ ] **Step 2: Fetch the business types for the rows on screen**

After the `pending_accounts` query, fetch the types for the business rows and map them by id:

```ts
const businessIds = rows.filter((r) => r.kind === "business").map((r) => r.id);

const { data: types, error: typesError } = businessIds.length
  ? await supabase.from("businesses").select("id, business_type").in("id", businessIds)
  : { data: [], error: null };
```

Surface `typesError` the way the page already surfaces its primary error — a silent failure here would render every supplier as a plain business.

- [ ] **Step 3: Show it in the Type column**

The column currently renders `kind`. For a business row with a known type, render the type instead, so `supplier` is visible at a glance:

```tsx
<span className="kind">
  {row.kind === "business" ? (typeFor.get(row.id) ?? "business") : row.kind}
</span>
```

Render the value readably — `it_reseller` must not appear as a raw enum.

- [ ] **Step 4: Typecheck and look at it**

Run: `pnpm --filter web typecheck`

Expected: no errors.

Then, with the dev server already running on 4300, sign in as `admin@rebin.test` and open `/admin/accounts`. The demo supplier created in Task 3 must appear, labelled `supplier`.

- [ ] **Step 5: Commit**

```bash
git add "apps/web/app/admin/(console)/accounts/page.tsx"
git commit -m "feat(web): distinguish suppliers in the approval queue

pending_accounts returns a kind but not a business_type, so every supplier
arrived in the queue looking like an ordinary business. The paperwork differs
-- a business has an EIN and a supplier has none -- so an operator approving
one needs to know which they are looking at before they decide.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Verification

After Task 6, one pass end to end against the live database:

- [ ] A supplier registers through the mobile signup and lands `pending_verification`.
- [ ] `/admin/accounts` shows it as a supplier, and approving it moves it to `active`.
- [ ] The approved supplier signs in, sees the ship-to-warehouse card, and has no pickup control anywhere.
- [ ] A quote total shown to that supplier is labelled an estimate.
- [ ] `select is_supplier(id) from businesses where name like '%(demo)%'` returns true.
- [ ] `pnpm --filter web typecheck`, `pnpm --filter mobile typecheck`, `pnpm --filter @rebin/shared test`, and `pnpm --filter mobile test` all pass.

## Out of scope

Weight-based pricing, payout recording, and removing the agent mobile portal are the next three stages in the spec. Nothing in this plan should change `price_items`, the appraisal prompt, or `PortalKey`.
