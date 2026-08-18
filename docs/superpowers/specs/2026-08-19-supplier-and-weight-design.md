# Supplier, weight pricing, and payout — design

Date: 2026-08-19
Status: draft, awaiting review
Branch: to be cut from `main`

Three changes the client asked for, designed together because they touch the
same rows: a new kind of seller, a new basis for price, and a record of what
was actually paid.

## What the client decided

From the client conversation, verbatim where it matters:

- **Organization** — schedules a pickup, gets no price. Rebin's team collects.
- **Business** — schedules a pickup and gets an estimated price. Small
  quantities they ship to the warehouse themselves.
- **Supplier** — new. Gets an estimated price only; **no pickup**. Always
  ships to the warehouse. *"A supplier can be anyone who wants to do
  business. Rakib collects e-waste from stores, stores it, manages e-waste
  from neighbours — he is a supplier, he can sell his e-waste to us."*
- **Price is identical for business and supplier.**
- **Grade is gone.** *"E-waste. So we don't need working. Put just one grade,
  PARTS only."* And units: *"Put only lbs, delete each."*
- **Payout** — *"Once Rebintech gets the e-waste from supplier, after sort it
  out, within 7 days supplier will get his payout."*
- **Agent** — the word is dropped from the product.

## What this design deliberately does not do

- **No bank integration.** The client was explicit: an operator records what
  was paid and when. No ACH, no card rails, no account numbers held here.
- **No SSN.** Supplier signup collects name, phone, and address. The
  `businesses.ein` column is already nullable for exactly this case (0011:
  *"sole proprietors operate on an SSN and have no EIN to give at signup"*),
  and nothing here changes that.
- **No agent removal, yet — and the console keeps agents regardless.** The
  agent *app* goes unused once suppliers land, but the console screen at
  `/admin/agents` stays: somebody still collects from organizations, and an
  operator still has to see who is out and mark the job done. What is being
  dropped is the agent's phone, not the agent.

  Removing the mobile portal is its own change, taken last. It is woven
  through `PortalKey` (packages/ui), `PORTAL_BY_ROLE` (packages/api),
  `RoleGuard`, the context picker, a signup edge function, and thirteen test
  files, and it should be removed when a failing test can only mean one
  thing. Unused code is not urgent; a half-removed portal is.
- **No enum deletion.** Postgres cannot drop an enum value, and
  `price_grade_enum`'s `working`/`broken` are referenced by five accepted
  quotes recording real offers Rebin made. The values stay and go unused,
  the way `platform_finance` already does.

## Supplier

### Where it lives

`businesses`, as a new `business_type_enum` value. Not a new table.

The price is the same for both, so the thing being modelled is the same
thing: an entity that sells Rebin material. What differs is whether it can
book a pickup, and that is one rule, not a schema.

A separate table would duplicate `business_members`, the RLS policies, the
quote foreign key, and `is_business_member()` — and every future quote
feature would have to be written twice.

### Signup

Lighter than a business, because a supplier may be one person:

| Field | Business | Supplier |
|---|---|---|
| Name | required | required |
| Phone | required | required |
| Address | required | required |
| EIN | optional | not asked |
| Business type | picked from a list | fixed to `supplier` |

The mobile signup picker gains a third card. Its copy says what a supplier
is in the client's own terms — someone who collects e-waste and sells it on
— because the word alone will not tell a shop owner whether it means them.

Registration reuses the business form rather than copying it. The two differ
by two fields out of six, so a second form would be five-sixths duplication
that drifts the first time a validation rule changes. The existing form
already branches on the chosen role; supplier is a third branch that hides
the EIN field and fixes `business_type`, and `create_business_with_owner`
takes the same arguments it takes today — `p_ein` is already nullable, and
passing null is what a sole proprietor was always meant to do.

### No pickup

The RPC that files a pickup request must refuse a supplier. The check
belongs in the database, not the UI: an interface that merely hides a button
is not a rule, and every other rule in this product is enforced where it
cannot be bypassed.

The supplier's screens say where the material goes instead — ship to the
warehouse — with the address. That sentence is the whole delivery flow. No
labels, no tracking, no carrier.

## Weight pricing

### The rule

    line total = quantity × average weight × rate per pound

An operator sets both halves: the rate per pound, and how heavy each kind of
device is on average. The AI counts items, which it already does well.

### Why the AI does not estimate weight

A laptop is four to five pounds. A desktop is fifteen to twenty. That is a
table, not a judgement — and asking a vision model to re-derive it on every
photograph buys two problems: the same laptop photographed twice can price
differently, and a wrong answer is unfalsifiable, because nothing anywhere
records what a laptop *should* weigh.

Putting the number in the catalog makes it a value an operator owns, can
correct, and can be held to.

### Weight is stored in grams

`quantity` and `actual_units` are `integer`. Four and a half pounds in an
integer column is four, or five. Across a fifty-pound load that is real
money, and it is the kind of error a vendor notices before Rebin does.

So weight is an integer in a smaller unit — exactly as money is an integer
number of cents, and for the same reason. Floating point is not an option
for a value that multiplies into a payment.

**The unit is grams, because the codebase already decided.**
`packages/shared/src/weight.ts` has carried `gramsToLbs`, `lbsToGrams` and
`formatWeight` since before this feature, `packages/ui` renders them through
a `WeightText` atom, and both are tested. Introducing ounces alongside would
give the product two integer weight units and a conversion bug waiting to
happen; the interesting question was never which unit is tidier but which
one is already here.

New columns are therefore named `_g`, and every display goes through the
existing `formatWeight`.

### Schema

- `price_items` gains `avg_weight_g integer`, nullable so existing rows stay
  valid.
- Catalog v3: the eighteen distinct components, each once, `parts` grade and
  `lb` unit, with a rate per pound and an average weight.
- v2 retires. It stays readable, because the five accepted quotes priced
  against it are offers Rebin actually made.

### The AI prompt

The grade instruction comes out of `supabase/functions/appraise/index.ts`
and out of `PRICE_GRADES` in the shared appraisal schema. What remains is
what the model is good at: name the component, count how many, say what it
saw. It still never states a price.

## Payout

### The flow

1. Supplier ships. Nothing in the app tracks the shipment.
2. It arrives; an operator sorts it and records the **actual weight**.
3. Actual weight against the catalog gives the final price.
4. An operator records **what was paid, and when**.
5. The supplier sees all four states in the app.

Step 4 is a record, not a transfer. Money moves outside this system.

### Schema

A `payouts` table: the quote it settles, the amount in cents, the date paid,
the operator who recorded it, and a free-text reference for whatever the
bank called it.

Written through an RPC gated on `is_platform_staff()`, like every other
write in the console. Read by the supplier through RLS — because the one
question a supplier will otherwise ask by telephone is "have you paid me
yet", and every such call is support cost the app can remove.

### The seven days

The client's promise is payout within seven days of receipt. The console
shows the age of every unpaid, received consignment, oldest first. It is a
queue an operator works, not an alarm: the number that matters is how long
the oldest one has waited.

## Estimates are estimates

The price a supplier sees before shipping is an estimate, and every screen
showing it says so. The final number comes from the scale.

Asked what happens when the two differ, the client answered that the
supplier accepts it. So there is no dispute flow, no threshold, no approval
step. What there is instead is a record: estimate and actual are both kept,
so a component whose estimate is habitually wrong shows up as a pattern an
operator can correct in the catalog. That is the control — fixing the table,
not adjudicating each load.

## Order of work

1. **Supplier** — new enum value, signup, the no-pickup rule, mobile screens.
   Adds; breaks nothing.
2. **Weight pricing** — schema, catalog v3, AI prompt, mobile, console.
3. **Payout** — table, RPC, console screen, supplier view.
4. **Agent removal** — last, alone, when a failing test is unambiguous.

## Verification

Each stage: typecheck, then drive the real app against the live database.

End to end at the finish: a supplier signs up, is approved, receives an
estimate, cannot book a pickup, is recorded as received and weighed, and
sees the payout an operator recorded.

## Open questions

None blocking. Two worth revisiting once suppliers are live:

- Whether the average-weight table needs per-region variants (a "desktop" in
  one market is not the same machine as in another).
- Whether a supplier should see the weight an operator recorded, or only the
  resulting price. Showing it invites argument; hiding it invites distrust.
  Shipping with it shown, on the grounds that the scale is the honest part.
