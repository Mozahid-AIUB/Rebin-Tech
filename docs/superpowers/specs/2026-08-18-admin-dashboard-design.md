# Admin dashboard — design

Date: 2026-08-18
Status: approved, ready for implementation plan

## The gap this closes

Organizations can file pickup requests. Agents can claim and complete
jobs. Businesses can register. None of it connects, because every path
between those three runs through a platform operator who has no
interface.

A request arrives `pending` and stays there: only `is_platform_staff()`
may call `advance_pickup_request`, and no screen calls it. A new
organization signs up, sees "verification in review", and waits
permanently: only platform staff may call `set_organization_status`,
and no screen calls that either.

So this is not a new capability. Thirty-one migrations already define
the rules, the transitions, and the authorization. What is missing is
the surface that invokes them.

## Scope

In:

- Admin authentication, and refusing everyone who is not platform staff
- Pickup request queue: list, filter by status, open one, advance it
- Account approval queue: pending organizations, businesses and agents;
  approve or reject

Out, deliberately — each is a later increment, not a compromise:

- Quotes and the price catalog (`create_quote`, `publish_price_catalog`)
- Creating field agents (`create_field_agent`)
- Route and batch planning
- Any individual/consumer flow
- `platform_finance` and `platform_support` as distinct experiences

The two included queues are the minimum that makes the existing system
work end to end. Without them nothing else in the product can complete
a single transaction.

## Security

The enforcement is in the database, and it is already written. Every
mutation is a `security definer` function whose first statement checks
`is_platform_staff()`. A caller holding the anon key and a non-staff
session gets `42501` no matter what request they forge. The frontend
cannot weaken this, which is the property worth preserving.

Three layers, in decreasing order of importance:

1. **Database.** RPCs check the caller's role before touching a row.
   `advance_pickup_request` additionally rejects illegal transitions,
   so a request cannot jump to `completed` — the state a recycling
   certificate is issued from. This is the real boundary.
2. **Server.** Middleware refreshes the Supabase session cookie. The
   `/admin` layout is a server component that reads the session, checks
   for `platform_owner` or `platform_ops`, and redirects anyone else.
   Non-admins never receive admin HTML.
3. **Client.** Buttons for illegal transitions are not rendered. This
   is ergonomics. It is not a security control and must not be
   described as one.

**No service-role key in this application.** It bypasses RLS entirely,
and the user's own session already carries sufficient authority through
the RPCs. A service-role key in a Next.js app is one accidental import
away from turning every route into a full-database oracle. There is no
requirement here that would justify it.

`is_platform_staff()` resolves to `platform_owner or platform_ops`.
`platform_support` holds read policies but appears in no write RPC;
`platform_finance` appears in neither. With two or three operators, all
of them should hold `platform_ops`.

### Bootstrapping the first admin

`0009_seed_platform_owner.sql` inserts a `platform_owner` row for a
placeholder UUID that matches no real user, guarded by a `where exists`
so it silently does nothing. Until it is replaced with a real
`auth.users` id, the panel has no one who can log in.

This is intentional in the original design — the comment says the first
owner "can only be seeded, never self-registered" — and correct: an
admin signup form is the largest hole such a panel can have. It is a
one-time SQL step against the deployed instance, not application code.

## Architecture

Routes live in the existing `apps/web`. A separate app would duplicate
auth, build, and deploy configuration to serve the same origin. The
marketing pages stay public; `/admin` sits behind the layout check.

### Supabase client

`packages/api/src/client.ts` imports `AsyncStorage` from React Native
and reads `EXPO_PUBLIC_*` variables. It cannot run in a browser.

`apps/web` therefore gets its own client pair — browser and server,
cookie-based, reading `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_ANON_KEY` — while importing `Database` from
`@rebin/api` so every RPC call stays typed against the real schema.

Refactoring the shared client to be platform-agnostic is cleaner and is
the right eventual move. It is not this change: it would touch the
working mobile app for no gain to the admin panel.

### Reads and writes

Reads go directly to tables and views; the RLS `select` policies
already admit platform staff. Writes go exclusively through RPCs.

`pending_accounts` — a view added in 0015 explicitly for "whatever
admin UI lands first" — unions pending organizations, businesses and
agents into one shape (`kind, id, name, status, created_at`). It is
`security_invoker`, so a non-staff caller sees an empty result rather
than an error.

No new migrations.

### Screens

| Route | Purpose |
|---|---|
| `/admin/login` | Email and password; sends staff onward, refuses others |
| `/admin` | Pending-account count, request counts by status, today's queue |
| `/admin/requests` | Table of requests, filterable by status |
| `/admin/requests/[id]` | One request, with its legal next steps |
| `/admin/accounts` | The `pending_accounts` queue, approve or reject inline |

### Request transitions

`advance_pickup_request` permits one step at a time:

```
pending → under_review → scheduled → dispatched → in_transit → completed
```

`cancelled` is reachable from every state except `in_transit` — once a
van is loaded and moving, stopping it is a support call, not a button.

The detail screen renders exactly the legal next steps for the current
status. It never offers a free status dropdown, because most of that
dropdown's values would be rejected by the database, and an interface
that mostly errors teaches operators to distrust it.

## Visual direction

This is an operations tool for two or three people who will use it
daily, not a landing page. Its quality is measured in how fast a row
can be found and acted on.

It inherits the brand custom properties the root layout already emits
from `BRAND` — the same greens, copper, and IBM Plex family — so it
reads as the same product. The typographic scale is smaller and the
density higher: tables over cards, status as colour-coded text rather
than large badges, actions reachable without a second click.

Status colour follows meaning already in the schema: `pending` and
`under_review` are waiting states, `scheduled` through `in_transit` are
in-flight, `completed` is terminal-good, `cancelled` terminal-neutral.

## Testing

The transition and authorization rules are enforced and already tested
at the database level; re-asserting them in the UI would test Postgres.

Verification is therefore end-to-end, in a browser:

1. A non-admin session visiting `/admin` is redirected.
2. A staff session reaches the dashboard.
3. A pending account can be approved and leaves the queue.
4. A request advances through its legal states, and the illegal ones
   are not offered.
5. Server logs and the browser console are clean throughout.

## Risks

- **No seeded admin.** Nothing works until the placeholder UUID is
  replaced. Flagged above; needs the operator's real user id.
- **Empty database.** If no organizations have registered, the queues
  render empty and prove little. Seed data may be needed to verify
  anything meaningfully.
- **Client duplication.** Two Supabase clients now exist. Accepted
  deliberately; revisit when the web app needs more of `@rebin/api`.
