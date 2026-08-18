# Console remainder — implementation plan

Spec: `docs/superpowers/specs/2026-08-18-admin-dashboard-design.md`
Branch: `feat/admin-dashboard`

Completes the operations console: the price catalog operators maintain, the
quotes that catalog produces, and the field agents who do the collecting.

## Context

The console already carries the pickup queue and the account approval queue,
both reading through RLS and writing through `security definer` RPCs that
check `is_platform_staff()`. Everything below follows those two rules. There
is no service-role key in this application and nothing here may add one.

Two facts from the migrations bound what these screens can be, and both were
established by reading the RPCs rather than assumed:

- **`create_quote` is not an operator action.** Its guard is
  `has_role('biz_owner', …) or has_role('biz_staff', …)`; platform staff are
  not accepted. A business quotes itself against the published catalog. The
  console therefore *reads* quotes and never creates one.
- **`create_field_agent` cannot be called from the console.** It takes a
  `p_user_id` that must already exist in `auth.users`, and creating an auth
  user needs the service-role key. It is also unguarded — it is the public
  signup path, not an admin path. The console therefore *reviews and manages*
  agents; it does not create them.

Both are correct as designed. The screens are built to what the database
actually permits, and each says plainly where the thing it cannot do happens
instead.

## Global Constraints

- Reads go direct to tables/views; every write is one RPC call.
- No service-role key, anywhere, for any reason.
- Server components read data; client components only handle interaction.
- Money is stored in integer cents and formatted at the edge. Never parse a
  displayed string back into a number.
- New UI reuses the existing console classes (`.panel`, `.admin-table`,
  `.tile`, `.btn`, `.status`) — no new colour values, no new shadow recipes.
- Every page keeps the established shell: `PageIn` wrapper, `admin-head`
  heading block, `Empty` for the empty state.
- `pnpm --filter web typecheck` passes before a task is done.

## Task 1: Price catalog

The catalog is the only screen here with real write authority, and it is
what everything else prices against.

**Route:** `/admin/prices`, plus a nav entry between Requests and Accounts.

**Read:** `price_catalog_versions` ordered by `version` desc, and
`price_items` for the version being viewed. The active version is
`status = 'active'`; there is at most one.

**Write, all existing RPCs:**
- `create_price_catalog_draft(p_note text)` → returns the new draft's uuid.
  Copies the active version's items into the draft (see 0021).
- `set_price_item(p_version_id, p_component_key, p_display_name, p_category,
  p_grade, p_unit, p_unit_price_cents)` → upserts one row.
- `publish_price_catalog(p_version_id)` → draft becomes active, previous
  active becomes retired. Refuses an empty catalog and refuses to publish
  anything that is not a draft.

**Screen:** version list on the left (version number, status, published
date), items table for the selected version on the right, grouped by
`category`. A draft's rows are editable inline — display name, grade, unit,
price — and a draft carries "Add item" and "Publish" controls. An active or
retired version is read-only, with "Start a draft from this" as the only
action.

**Copy:** prices display as `$1,234.56` from `unit_price_cents`. The editor
takes dollars and converts on submit; a price entered as `12.5` is 1250
cents. Reject negatives client-side and let the RPC's check constraint be the
backstop.

**Enums, verbatim:** `price_grade_enum` is `working | broken | parts`;
`price_unit_enum` is `each | lb`; `category` is `device_category_enum`
(`computers_laptops`, `monitors_displays`, `server_gear`, `copiers_printers`,
`batteries_ups`).

**The publish confirmation is the one modal in this console.** Publishing
reprices every future quote, and it is not reversible except by publishing
another version. State that in the dialog: name the version, its item count,
and what it replaces.

## Task 2: Quotes

Read-only, because `create_quote` refuses platform staff.

**Route:** `/admin/quotes`.

**Read:** `quotes` joined to `businesses` for the name, with `quote_items`
for the expanded row. RLS already admits platform staff (`quotes_read` is
`is_business_member(business_id) or is_platform_staff()`).

**The expiry rule matters and is already solved in SQL.** `list_quotes`
reports a lapsed `offered` quote as `expired` whether or not a write has
caught up. This screen must do the same: a quote whose `status` is `offered`
and whose `expires_at` has passed displays as **Expired**. Do not show the
raw column. `list_quotes` takes a `p_business_id` and this screen is
cross-business, so the list query reads the table directly and applies the
same rule in TypeScript — put it in one exported helper, not inline at each
use.

**Screen:** table of quotes — business, status, total, item count, expires,
created. Filter by status. A row expands (or links to a detail) showing
`quote_items`: display name, grade, unit, quantity, unit price, line total.

**Status tones:** `accepted` → done, `offered` → active, `declined` and
`expired` → stopped.

**Empty state** explains where quotes come from: a business builds one from
the published catalog in the mobile app. An operator cannot create one here,
and the screen should not imply otherwise.

## Task 3: Agents

**Route:** `/admin/agents`.

**Read:** `agent_profiles` joined to `profiles` — name, phone, status,
service city/state/zip, vehicle, licence. Also each agent's live work from
`job_assignments` (status not `cancelled`), so an operator can see who is
mid-collection.

**Write:** `set_agent_status(p_user_id, p_status)` — approve a pending agent,
suspend an active one, reinstate a suspended one. This is the same RPC the
accounts queue already calls for `kind = 'agent'`.

**Screen:** table of agents — name, service area, vehicle, status, current
job. Filter by status. Approve / Suspend / Reinstate per row, offering only
the transition that applies to that agent's current status.

**Say where agents come from.** There is no "Add agent" button, because
`create_field_agent` needs an auth user this app cannot create. The page
header states that agents register in the mobile app and appear here for
review. An empty state that just says "no agents" would read as a missing
feature.

**`agent_vehicle_enum`, verbatim:** `car | van | box_truck | none`.

## Task 4: Wire it together

The three screens exist; this makes the console coherent.

- Nav order: Overview, Requests, Quotes, Prices, Agents, Accounts. Each with
  a glyph in the established style (16px, `stroke-width: 1.4`, drawn from the
  board vocabulary — not a pictogram).
- Overview gains two tiles: agents awaiting review, and quotes currently
  offered. Both link to their filtered screens. Keep the existing zero/
  non-zero colour rule.
- The overview's account tile currently counts everything in
  `pending_accounts`, agents included. Once agents have their own screen,
  link the agent tile to `/admin/agents` and leave the accounts tile
  counting organizations and businesses only — two tiles that both claim the
  same pending agent is a number an operator cannot reconcile.
- If no catalog is active, the overview says so where the quote tile sits:
  nothing can be quoted until one is published, and that is the single most
  consequential empty state in the product.

## Verification

Per task: `pnpm --filter web typecheck`, then drive the real app signed in as
`admin@rebin.test` and confirm the screen renders against the live database.

At the end, one pass through the whole console: every nav entry reaches a
page, every page renders with data and with none, and the three write paths
(publish a catalog, approve an agent, advance a request) succeed against the
database while an illegal transition is still refused.
