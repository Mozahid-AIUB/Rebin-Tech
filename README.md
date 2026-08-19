# Rebin Tech

Free, compliant e-waste recycling. Organisations book a collection and get a
certificate; businesses and suppliers photograph their stock and get paid by
weight.

Three surfaces, one database:

| | What it is | Who uses it |
|---|---|---|
| **Marketing site** | The public page, privacy and terms | Anyone |
| **Operations console** | The queues Rebin works from | Two or three operators |
| **Mobile app** | Scan, quote, book a collection | Customers and sellers |

> **Live:** _link to be added once deployed_

---

## What the product actually does

**An organisation** — a hospital, a school district, a council — has retired
equipment and needs it gone with a paper trail. They book a collection, Rebin's
team drives out, and a certificate records every device that left the building.
No money changes hands.

**A business or a supplier** wants paying for what they have. They photograph
it, a vision model identifies each item, and the catalog prices it **by weight**
— a rate per pound against a typical weight per component. The figure they see
is an estimate; the scale at the warehouse sets the final number, and an
operator records the payout.

The difference between the two is the shape of the whole product: one is
collected from, the other sells.

---

## Repository layout

```
apps/
  web/          Next.js — marketing site + /admin console
  mobile/       Expo / React Native
packages/
  api/          Supabase client, typed queries, RPC wrappers
  shared/       Brand tokens, Zod schemas, money and weight helpers
  ui/           React Native component library
supabase/
  migrations/   Schema, RLS, and every RPC — applied in order
  functions/    Edge functions (signup, appraisal, operator creation)
docs/           Design specs, implementation plans, deployment notes
```

---

## How the security model works

Worth understanding before changing anything, because the architecture leans
on it completely.

**The database is the boundary, not the app.** Every write goes through a
`security definer` RPC that checks the caller's role before it touches a row.
An operator advancing a pickup, a supplier accepting a quote, a price being
published — each is one RPC call carrying that user's own session.

**There is no service-role key in any client application.** It bypasses every
row-level policy, so it lives only in edge functions, where the code runs on a
server the browser never reaches.

**The UI never offers a control the database would refuse.** Request
transitions follow a fixed pipeline enforced in SQL, and the detail screen
renders only the moves that will succeed. A dropdown of every status would
have been less code and mostly errors.

---

## Running it

```bash
pnpm install

# Web — marketing site and console, on :4300
pnpm --filter web dev

# Mobile — Expo; add --tunnel to share it beyond your own network
pnpm --filter mobile start
```

Both need Supabase credentials:

```
# apps/web/.env.local
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# apps/mobile/.env
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
```

The anon key is meant to be public — it identifies the project and authorises
nothing. Row-level security is what protects the data.

### Checks

```bash
pnpm --filter web typecheck
pnpm --filter mobile typecheck && pnpm --filter mobile test
pnpm --filter @rebin/shared test
```

---

## Database migrations

`supabase/migrations/` is applied **in numerical order**, and a migration is
never edited after it has run — a correction is a new file. The comment at the
top of each one explains what went wrong or what changed, which is usually more
useful than the SQL beneath it.

If a screen starts failing with *"Could not find the function"*, a migration
has not been applied rather than the code being wrong.

---

## Deployment

- **Web** — `docs/deploying.md`. `render.yaml` at the root carries the build
  and start commands; the region is pinned beside the database because every
  console page is server-rendered.
- **Mobile** — `docs/shipping-to-the-app-store.md`. Covers the permission
  strings, the export-compliance declaration, and the demo account an App
  Store reviewer needs.

---

## Design notes

`docs/superpowers/` holds the specs and implementation plans behind the larger
pieces — the supplier role, weight-based pricing, retiring the agent app. They
record why a thing is the way it is, which the code alone cannot.
