# Weight-Based Pricing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Price e-waste by weight at a rate an operator sets, instead of per item at a grade the vendor picks.

**Architecture:** An operator sets two numbers per component — a rate per pound and an average weight — and the line total becomes `quantity × average weight × rate`. The AI keeps doing what it is good at (naming and counting what it sees) and stops guessing a grade. Catalog v3 carries eighteen components, each once, replacing v2's fifty-four grade variants. v2 retires rather than being deleted, because five accepted quotes were priced against it.

**Tech Stack:** Postgres (Supabase), TypeScript, Zod, Deno edge functions, Expo React Native, Next.js App Router.

**Spec:** `docs/superpowers/specs/2026-08-19-supplier-and-weight-design.md`

## Why this is urgent, not cosmetic

Today the same twelve laptops are worth $84 or $1,080 depending on which grade the vendor selects from a dropdown — `laptop/parts` is 700 cents and `laptop/working` is 9000 cents, a thirteen-fold spread on identical material. The client's instruction was *"we don't need working, put just one grade, PARTS only"* and *"put only lbs, delete each"*, because e-waste is bought for the metal inside it and whether a machine powers on does not change that.

So this is not only a modelling change. It removes a control that lets the person being paid choose how much they are paid.

## Global Constraints

- **No service-role key in any application.** Every write carries the caller's own session.
- **Every write is exactly one existing RPC call.** No direct table writes from an app.
- **Weight is an integer number of grams, never a float.** `packages/shared/src/weight.ts` already exports `gramsToLbs`, `lbsToGrams` and `formatWeight`, and `packages/ui` renders them through `WeightText`. New columns are named `_g` and every display goes through `formatWeight`. A second weight unit in this product is a conversion bug waiting to happen.
- **Money stays integer cents**, formatted at the edge, never parsed back from a display string.
- **Enum values are added, never dropped.** `price_grade_enum` keeps `working` and `broken`; they simply stop being used, the way `platform_finance` already is.
- **Catalog v2 is retired, not deleted.** Five accepted quotes reference its prices. Those are offers Rebin actually made.
- **Existing quotes are never repriced.** `quote_items` copies prices at quote time by design (0023's header says so); nothing here may rewrite a historical line.
- **The operator sets both numbers.** The rate per pound and the average weight are catalog values an operator owns and can correct. The AI is never asked for a weight.
- `pnpm --filter web typecheck`, `pnpm --filter mobile typecheck`, and `pnpm --filter @rebin/shared typecheck` all pass before a task is done.

## File Structure

**Database**
- Create `supabase/migrations/0034_weight_pricing.sql` — the `avg_weight_g` column and the updated `set_price_item` / `create_quote`.
- Create `supabase/migrations/0035_catalog_v3.sql` — the eighteen-component, weight-priced catalog.

**Shared**
- Modify `packages/shared/src/schemas/appraisal.ts` — drop `grade` from what the model returns.

**Edge function**
- Modify `supabase/functions/appraise/index.ts` — stop asking for a grade.

**Console**
- Modify `apps/web/app/admin/(console)/prices/PriceCatalog.tsx` — an average-weight field beside the rate.
- Modify `apps/web/app/admin/actions.ts` — pass `avg_weight_g` through `setPriceItem`.

**Mobile**
- Modify `apps/mobile/src/features/scan/ManualEntrySheet.tsx` — no grade picker; show the weight arithmetic.
- Modify `apps/mobile/src/features/scan/AppraisalScanSheet.tsx` — no grade in results.
- Modify `apps/mobile/app/(biz)/quote/[id].tsx` — show weight on each line.

---

### Task 1: The column and the arithmetic

The database has to be able to hold a weight and multiply by it before any screen can show one.

**Files:**
- Create: `supabase/migrations/0034_weight_pricing.sql`

**Interfaces:**
- Consumes: `price_items`, `set_price_item` (0021), `create_quote` (0023), `quote_items` (0023).
- Produces: `price_items.avg_weight_g`; `quote_items.weight_g`; `set_price_item` with a ninth argument `p_avg_weight_g integer default null`; `create_quote` computing `line_total_cents` from weight when the catalog row has one.

- [ ] **Step 1: Read exactly what you are changing**

Run:
```bash
grep -n -A12 "create or replace function set_price_item" supabase/migrations/0021_price_catalog.sql
sed -n '100,140p' supabase/migrations/0023_quotes.sql
```

Expected: `set_price_item` takes seven `p_` arguments and upserts on `(catalog_version_id, component_key, grade)`. `create_quote` inserts `quote_items` selecting `p.unit_price_cents` and computing `p.unit_price_cents * (item ->> 'quantity')::integer` as the line total (line 118).

That multiplication is the thing this task replaces.

- [ ] **Step 2: Write the migration**

Create `supabase/migrations/0034_weight_pricing.sql`:

```sql
-- Price by weight, not by the vendor's choice of grade.
--
-- The catalog priced a laptop three ways -- working 9000, broken 2500, parts
-- 700 -- and the vendor picked which one applied. The same twelve machines
-- were therefore worth $84 or $1,080 depending on a dropdown, which is a
-- thirteen-fold spread on identical material chosen by the person being paid.
--
-- E-waste is bought for the metal inside it. Whether a machine powers on does
-- not change what it is worth, so the grade was never load-bearing -- it was
-- just the only lever the schema offered.
--
-- What replaces it: an operator sets a rate per pound and an average weight
-- per component, and a line is quantity x weight x rate. Both numbers are
-- catalog values an operator owns and can correct. The model is never asked
-- for a weight -- a laptop is four to five pounds, which is a table, not a
-- judgement, and a vision model re-deriving it per photograph would price the
-- same laptop differently twice with nothing to check it against.

-- Grams, because packages/shared/src/weight.ts already converts and formats
-- grams and packages/ui renders them. A second integer weight unit in one
-- product is a conversion bug waiting to happen.
alter table price_items add column if not exists avg_weight_g integer
  check (avg_weight_g is null or avg_weight_g > 0);

comment on column price_items.avg_weight_g is
  'Typical weight of one of these, in grams. When set, unit_price_cents is read as a rate per pound and a quote line is quantity x this weight x that rate. Null keeps the row priced per item.';

-- What the line was actually weighed at, copied like the price beside it.
-- 0023 copies prices into quote_items rather than joining, so a quote cannot
-- silently reprice when the catalog moves; the weight it was priced on has to
-- travel the same way or the arithmetic stops being reconstructable.
alter table quote_items add column if not exists weight_g integer
  check (weight_g is null or weight_g >= 0);

comment on column quote_items.weight_g is
  'Total grams this line was priced on: quantity x the catalog average at quote time. Null on lines priced per item.';

/**
 * Upsert one catalog row, now carrying an average weight.
 *
 * p_avg_weight_g defaults to null so every existing caller keeps working and
 * keeps meaning what it meant: a row with no weight is priced per item.
 */
create or replace function set_price_item(
  p_version_id       uuid,
  p_component_key    text,
  p_display_name     text,
  p_category         device_category_enum,
  p_grade            price_grade_enum,
  p_unit             price_unit_enum,
  p_unit_price_cents integer,
  p_avg_weight_g     integer default null
) returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_platform_staff() then
    raise exception 'Only platform staff can change prices' using errcode = '42501';
  end if;
  if not exists (select 1 from price_catalog_versions where id = p_version_id and status = 'draft') then
    raise exception 'Prices can only be edited on a draft catalog' using errcode = '42501';
  end if;
  if p_unit_price_cents < 0 then
    raise exception 'A price cannot be negative' using errcode = '22023';
  end if;
  if p_avg_weight_g is not null and p_avg_weight_g <= 0 then
    raise exception 'An average weight must be greater than zero' using errcode = '22023';
  end if;

  insert into price_items (
    catalog_version_id, component_key, display_name, category, grade, unit,
    unit_price_cents, avg_weight_g
  )
  values (
    p_version_id, p_component_key, p_display_name, p_category, p_grade, p_unit,
    p_unit_price_cents, p_avg_weight_g
  )
  on conflict (catalog_version_id, component_key, grade) do update
    set display_name     = excluded.display_name,
        category         = excluded.category,
        unit             = excluded.unit,
        unit_price_cents = excluded.unit_price_cents,
        avg_weight_g     = excluded.avg_weight_g;
end;
$$;
```

Read the real body of `set_price_item` in 0021 first and carry across every check it already makes. The block above shows the shape; if 0021 validates something this omits, keep 0021's version.

- [ ] **Step 3: Rewrite the quote arithmetic in the same migration**

Append to `0034_weight_pricing.sql` a `create or replace function create_quote(...)` that is 0023's function with one change: the line total.

Copy 0023's body verbatim — the `biz_owner`/`biz_staff` guard, the empty-items check, the active-catalog lookup, the `jsonb_array_elements` join, the `get diagnostics` row count, the total rollup and the audit event — and change only the two selected columns:

```sql
    -- Weight-priced when the catalog row carries an average weight, per-item
    -- when it does not. Rounded to whole cents at the line, not at the total:
    -- a fraction of a cent per line compounding into a total nobody can
    -- reconcile against the lines is worse than a rounding of at most a cent.
    case
      when p.avg_weight_g is not null
        then p.avg_weight_g * (item ->> 'quantity')::integer
      else null
    end,                                    -- weight_g
    case
      when p.avg_weight_g is not null
        then round(
               p.unit_price_cents
               * (p.avg_weight_g * (item ->> 'quantity')::integer) / 453.59237
             )::integer
      else p.unit_price_cents * (item ->> 'quantity')::integer
    end,                                    -- line_total_cents
```

453.59237 is grams per pound. Put that number in a comment where it appears, so a reader does not have to recognise it.

Add `weight_g` to the insert's column list in the right position.

- [ ] **Step 4: Apply it**

The Supabase CLI has no access to this project. Print the SQL and tell the user to run it in the SQL editor, then verify:

```sql
select column_name from information_schema.columns
 where table_name = 'price_items' and column_name = 'avg_weight_g';
```

Expected: one row.

**Do not claim the migration is applied unless you have evidence it is.** If you cannot verify, say exactly what the user must run.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0034_weight_pricing.sql
git commit -m "feat(db): price by weight instead of by grade

The catalog priced a laptop three ways and let the vendor pick, so twelve
identical machines were worth \$84 or \$1,080 depending on a dropdown. E-waste
is bought for the metal inside it; whether a machine powers on does not change
what it is worth.

price_items gains an average weight in grams and a quote line becomes quantity
x weight x rate, rounded to whole cents at the line so the lines reconcile
against the total. quote_items carries the weight it was priced on, copied the
same way the price already is -- 0023 copies rather than joins so a quote
cannot reprice itself when the catalog moves, and the weight has to travel with
it or the arithmetic stops being reconstructable.

Rows with no average weight stay priced per item, so nothing that exists today
changes meaning.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: Catalog v3

Eighteen components, each priced once, by the pound.

**Files:**
- Create: `supabase/migrations/0035_catalog_v3.sql`

**Interfaces:**
- Consumes: `set_price_item` with `p_avg_weight_g` (Task 1); `create_price_catalog_draft`, `publish_price_catalog` (0021).
- Produces: an active catalog version whose every row has `grade = 'parts'`, `unit = 'lb'`, and a non-null `avg_weight_g`.

- [ ] **Step 1: Read v2 and list what it prices**

Run:
```bash
grep -oE "\(v_new, '[a-z_]+', +'[^']+'" supabase/migrations/0029_catalog_v2.sql | sort -u
```

Expected: eighteen distinct component keys — `copier`, `cpu`, `desktop`, `expansion_card`, `hard_drive`, `laptop`, `large_display`, `lead_battery`, `monitor`, `motherboard`, `network_gear`, `power_supply`, `printer`, `rack_server`, `ram_module`, `solid_state_drive`, `tablet`, `ups` — each appearing three times, once per grade.

Take the display name and category for each from v2. Do not invent new ones.

- [ ] **Step 2: Write the catalog**

Create `supabase/migrations/0035_catalog_v3.sql`. It creates a draft, sets eighteen rows through `set_price_item`, and publishes.

Every row uses `'parts'::price_grade_enum` and `'lb'::price_unit_enum`. `unit_price_cents` is now **cents per pound**, not cents per item.

Use these weights and rates. They are starting values an operator will correct — say so in the migration's header, and do not present them as researched figures:

| component_key | display_name | category | avg_weight_g | cents/lb |
|---|---|---|---|---|
| laptop | Laptop | computers_laptops | 2000 | 80 |
| desktop | Desktop computer | computers_laptops | 8000 | 70 |
| tablet | Tablet | computers_laptops | 500 | 90 |
| monitor | Monitor | monitors_displays | 3500 | 25 |
| large_display | Large display or TV | monitors_displays | 12000 | 20 |
| rack_server | Rack server | server_gear | 18000 | 90 |
| network_gear | Network equipment | server_gear | 3000 | 85 |
| power_supply | Power supply | server_gear | 1500 | 75 |
| copier | Copier or MFP | copiers_printers | 60000 | 15 |
| printer | Printer | copiers_printers | 9000 | 18 |
| ups | UPS | batteries_ups | 12000 | 30 |
| lead_battery | Lead-acid battery | batteries_ups | 15000 | 22 |
| motherboard | Motherboard | components_parts | 700 | 220 |
| cpu | Processor | components_parts | 50 | 1800 |
| ram_module | Memory module | components_parts | 30 | 900 |
| hard_drive | Hard drive | components_parts | 600 | 130 |
| solid_state_drive | Solid-state drive | components_parts | 80 | 150 |
| expansion_card | Expansion card | components_parts | 200 | 400 |

Follow 0029's structure — a `do $$ ... $$` block that calls `create_price_catalog_draft`, then `set_price_item` per row, then `publish_price_catalog`.

The header comment must say three things: that grade and per-item pricing are gone and why; that `unit_price_cents` now means cents per pound; and that the weights are starting values for an operator to correct rather than measured data.

- [ ] **Step 3: Apply and verify**

Have the user run it, then verify:

```sql
select v.version, v.status, count(i.id) as items,
       count(i.avg_weight_g) as weighted,
       count(*) filter (where i.grade <> 'parts') as non_parts,
       count(*) filter (where i.unit <> 'lb')     as non_lb
  from price_catalog_versions v
  left join price_items i on i.catalog_version_id = v.id
 group by v.id, v.version, v.status
 order by v.version;
```

Expected: the newest version is `active` with `items = 18`, `weighted = 18`, `non_parts = 0`, `non_lb = 0`. The previous active version is now `retired` and keeps its 54 rows.

- [ ] **Step 4: Check a real quote prices correctly**

Twelve laptops: `12 × 2000g = 24000g`, `24000 / 453.59237 = 52.91 lb`, `× 80 cents = 4233 cents`.

Verify against the database:

```sql
select round(80 * (2000 * 12) / 453.59237)::integer as cents;
```

Expected: `4233` — $42.33, where the same twelve laptops previously ranged from $84 to $1,080.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0035_catalog_v3.sql
git commit -m "feat(db): catalog v3, eighteen components priced by the pound

v2's fifty-four rows were eighteen components times three grades. Grade is
gone, so this is the same eighteen things priced once each, with a rate per
pound and a typical weight.

The weights are starting values for an operator to correct, not measured data,
and the migration says so. Getting them roughly right matters less than having
them somewhere an operator can see and change, which is the whole reason they
are catalog values rather than something the model guesses.

v2 retires rather than being deleted. Five accepted quotes were priced against
it, and those are offers Rebin actually made.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: Stop the model grading

The AI no longer decides a grade, because there is nothing for a grade to select.

**Files:**
- Modify: `supabase/functions/appraise/index.ts`
- Modify: `packages/shared/src/schemas/appraisal.ts`
- Test: `packages/shared/src/__tests__/appraisal.test.ts`

**Interfaces:**
- Consumes: catalog v3, whose rows are all `parts` (Task 2).
- Produces: appraisal items shaped `{ componentKey, quantity, confidence, notes }` — no `grade`.

- [ ] **Step 1: Read both**

Run:
```bash
sed -n '15,50p' supabase/functions/appraise/index.ts
cat packages/shared/src/schemas/appraisal.ts
cat packages/shared/src/__tests__/appraisal.test.ts
```

Expected: a `GRADES` constant and a prompt instructing the model to return a grade with reasoning about visible damage; a Zod schema with `grade: z.enum(PRICE_GRADES)`; tests asserting a parsed item carries a grade.

- [ ] **Step 2: Take the grade out of the prompt**

In `supabase/functions/appraise/index.ts`:

- Delete the `GRADES` constant and `grade` from the response schema's `properties` and `required`.
- Delete the `- grade: ...` bullet and the closing paragraph's grading instruction (`Grade on visible evidence only -- a closed laptop is not "working" just because it looks undamaged`).
- Keep `Never state a price; you are not pricing this.` — still true, and still the most important line in the prompt.
- `notes` currently says "what you actually saw that led to the grade". Reword it to describe the item: condition is still worth recording, it just no longer selects a price.

Add a line to the function's header comment saying grades were removed because pricing moved to weight, so a future reader does not restore them.

- [ ] **Step 3: Take the grade out of the schema**

In `packages/shared/src/schemas/appraisal.ts`, remove the `grade` field from the item schema.

Keep `PRICE_GRADES` exported if anything else imports it — check with a grep. `price_grade_enum` is still a live column, and the console may still label it.

- [ ] **Step 4: Update the tests**

Run: `pnpm --filter @rebin/shared test -- appraisal`

Expected: failures where a fixture includes a grade or an assertion reads one.

Remove `grade` from fixtures. An assertion that a valid grade parses and an invalid one rejects is testing a field that no longer exists — delete it. Do not weaken a test to make it pass.

- [ ] **Step 5: Run and typecheck**

Run:
```bash
pnpm --filter @rebin/shared test
pnpm --filter @rebin/shared typecheck
pnpm --filter mobile typecheck
```

Expected: shared passes. Mobile will fail where it reads `item.grade` — that is Task 5.

- [ ] **Step 6: Commit**

```bash
git add supabase/functions/appraise packages/shared/src
git commit -m "feat(ai): stop asking the model to grade

A grade selected a price, and prices are no longer graded, so the field
selects nothing. Asking for it anyway would mean paying for tokens on a
judgement call whose only remaining effect is to be discarded -- and leaving
it in the prompt invites someone to wire it back to a price later.

What the model is good at is unchanged: name the component, count how many,
say what it saw. It still never states a price.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: The operator sets the weight

The console gains the second number.

**Files:**
- Modify: `apps/web/app/admin/actions.ts`
- Modify: `apps/web/app/admin/(console)/prices/PriceCatalog.tsx`

**Interfaces:**
- Consumes: `set_price_item` with `p_avg_weight_g` (Task 1).
- Produces: nothing later tasks depend on.

- [ ] **Step 1: Read the action and the editor**

Run:
```bash
grep -n -A25 "export async function setPriceItem" apps/web/app/admin/actions.ts
grep -n "unitPriceCents\|EditableRow\|NewItemForm" "apps/web/app/admin/(console)/prices/PriceCatalog.tsx" | head -20
```

Expected: `setPriceItem` passing seven `p_` arguments; an `EditableRow` with a price field and a `NewItemForm` for adding rows.

Note how the existing price field converts dollars to cents, because the weight field needs the same treatment in pounds to grams.

- [ ] **Step 2: Pass the weight through the action**

Add `avgWeightG: number | null` to `setPriceItem`'s input type and pass it as `p_avg_weight_g`.

- [ ] **Step 3: Add the field to the editor**

In `EditableRow` and `NewItemForm`, add an average-weight input beside the price.

The operator types **pounds**; store **grams**. Use `lbsToGrams` from `@rebin/shared` — it already exists and is tested, so do not write a second conversion. Display with `gramsToLbs`.

Label the price field so its new meaning is unmistakable: it is now a rate per pound, not a price per item. A field still reading "Price" beside a weight is the ambiguity most likely to cause a wrong number to be typed.

Show the resulting per-item value as a computed hint — an operator setting `$0.80/lb` on a `4.4 lb` laptop should be able to see `≈ $3.52 each` without doing the arithmetic. Compute it, do not let it be typed.

- [ ] **Step 4: Verify against the real catalog**

Run: `pnpm --filter web typecheck`

Expected: clean.

Then, with the dev server on 4300, sign in as `admin@rebin.test`, open `/admin/prices`, start a draft from v3, change one weight, and confirm it saves and the computed per-item hint updates.

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/admin
git commit -m "feat(web): let an operator set the average weight

A rate per pound is only half a price -- without a typical weight the catalog
cannot turn a count of laptops into money. Both numbers now live beside each
other on the row that uses them.

The operator types pounds and the column stores grams, through the conversion
packages/shared already owns rather than a second one written here. The price
field is relabelled a rate per pound: a field still reading Price beside a
weight is how a per-item figure gets typed into a per-pound column.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 5: The vendor sees weight, not grade

The screens that showed a grade picker now show the arithmetic.

**Files:**
- Modify: `apps/mobile/src/features/scan/ManualEntrySheet.tsx`
- Modify: `apps/mobile/src/features/scan/AppraisalScanSheet.tsx`
- Modify: `apps/mobile/app/(biz)/quote/[id].tsx`
- Test: `apps/mobile/__tests__/manual-entry.test.tsx`

**Interfaces:**
- Consumes: appraisal items without `grade` (Task 3); `quote_items.weight_g` (Task 1).
- Produces: nothing later tasks depend on.

- [ ] **Step 1: Let the compiler find the grade references**

Run: `pnpm --filter mobile typecheck`

Expected: FAIL wherever a screen reads `item.grade`. That list is this task's work.

Also run:
```bash
grep -rn "grade" apps/mobile/src apps/mobile/app --include=*.tsx | grep -v "__tests__"
```

- [ ] **Step 2: Remove the grade picker from manual entry**

The screenshot that prompted this work showed a vendor choosing between `Desktop computer / working / $70`, `/broken / $20` and `/parts / $9`. With v3 there is one row per component, so there is nothing to choose.

Remove the grade selector. Each component now appears once, with its rate and its weight.

- [ ] **Step 3: Show the arithmetic**

A vendor picking twelve laptops should see how $42.33 was reached, not just the figure:

```
Laptop
12 × 4.4 lb = 52.9 lb at $0.80/lb        $42.33
```

Use `formatWeight` from `@rebin/shared` for every weight — it is the function `WeightText` already uses, and a second formatter would drift from it.

- [ ] **Step 4: Show weight on the quote's lines**

In `quote/[id].tsx`, each line renders `weight_g` where it is present. A line with a null weight is a historical per-item line and must keep rendering as it does today — those are the five accepted quotes from v2, and rewriting how they display would misrepresent an offer that was actually made.

- [ ] **Step 5: Update the tests**

Run: `pnpm --filter mobile test`

Expected: failures in `manual-entry.test.tsx` where a fixture or assertion involves a grade.

Note: `manual-entry.test.tsx` and `me-screen.test.tsx` have pre-existing timeout flakiness. If one fails on a timeout rather than an assertion, re-run it alone before treating it as your regression.

- [ ] **Step 6: Typecheck and test everything**

Run:
```bash
pnpm --filter mobile typecheck
pnpm --filter mobile test
pnpm --filter web typecheck
pnpm --filter @rebin/shared test
```

Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add apps/mobile
git commit -m "feat(mobile): show the weight, drop the grade picker

A vendor chose between a laptop worth 700 cents and one worth 9000, which
made the person being paid the person deciding how much. With one row per
component there is nothing left to pick.

In its place, the arithmetic: twelve laptops at 4.4 lb each is 52.9 lb, and
52.9 lb at \$0.80 is \$42.33. A number a vendor can reconstruct is one they can
argue with, which is worth more here than a number that is merely correct.

Quote lines with no weight are historical per-item lines and still render as
they did. Those are offers Rebin actually made.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Verification

After Task 5, one pass against the live database:

- [ ] `/admin/prices` shows v3 active with eighteen rows, each carrying a weight, and an operator can change one.
- [ ] The mobile manual-entry sheet lists each component **once**, with no grade control anywhere.
- [ ] A quote built from twelve laptops totals **$42.33**, and the screen shows the weight it came from.
- [ ] An existing quote priced against v2 still displays its original total unchanged.
- [ ] `select count(*) from price_items i join price_catalog_versions v on v.id = i.catalog_version_id where v.status = 'active' and (i.grade <> 'parts' or i.unit <> 'lb' or i.avg_weight_g is null)` returns **0**.
- [ ] All four typechecks and all test suites pass.

## Out of scope

Payout recording is the next stage. Nothing here touches `quotes.status`, and no `payouts` table belongs in this branch.
