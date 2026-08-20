# Working on Rebin Tech

Read this before touching anything. It records the decisions that are easy to
undo by accident, and the state of the things that are half-finished.

## What this is

An e-waste collection platform for a US client — **Rebin Tech**, a Texas LLC.
Three surfaces, one Supabase database: a marketing site, an operations console
at `/admin`, and a React Native app. `README.md` covers the architecture; this
file covers what a new session needs in order not to break it.

## Rules that are not negotiable

**The AI never prices anything.** The vision model is asked one question —
what is this thing — and the catalog supplies the rate. Every price is
`weight × rate per pound`, computed in `create_quote` and in the appraise
function, never by the model. Ask a model for a price and the same laptop
quotes one figure today and another tomorrow; a seller shown the higher one
first has been misled by us. The same rule extends to the recoverable-material
figures (`0040_material_content.sql`): nobody can see gold content in a
photograph, so those are catalog columns too.

**Photographs are never stored.** They go to the model and are discarded. The
privacy policy says so and the App Store questionnaire answer depends on it.
Do not add a storage bucket for scans, and do not add an in-app notice about
photo handling — the client asked for the policy to carry it, not the UI.

**Operator accounts are issued, never claimed.** There is no sign-up for
console access. An existing operator creates the account from
`/admin/people`, and neither the last operator nor your own access can be
removed. Do not send anyone to the Supabase dashboard to add an admin — the
client rejected that explicitly ("its wrong concept").

**The database is the security boundary, not the app.** Every write goes
through a `security definer` RPC that checks `is_platform_staff()` or an
equivalent before touching a row. There is no service-role key in any client;
it lives only in edge functions. If a screen needs a new write, the RPC comes
first.

**Migrations are append-only.** `supabase/migrations/` runs in numerical
order and a file that has run is never edited — a correction is a new file.
The comment at the top of each explains what went wrong, which is usually
more useful than the SQL.

## State as of 2026-08-20

Branch `main`, clean, pushed. Latest commit `e6353b4`.

**Live and working:**
- Web console — https://rebin-tech.onrender.com (Render, auto-deploys `main`)
- All six edge functions deployed
- Catalog v3: 18 components, priced per pound, with material content

**Blocked, waiting on a person:**
- **iOS build.** The Apple team's App ID `com.rebintech.app` is registered,
  but creating a distribution certificate returns 403: the developer's role
  is Developer, and Apple requires Admin. The account holder (Istiaque
  Mahmud) has to change the role. Nothing in the code fixes this; do not
  suggest workarounds, there are none — Apple's own docs are explicit.
- **Trader status** for the EU has not been declared in App Store Connect.
  Also account-holder work, also required before submission.

**Not yet done:**
- The Android APK on the client's phone predates `e6353b4`, so the legal-link
  fix is not in it. A new build is needed before that ships anywhere.
- `supabase/snippets/clear_test_data.sql` has not been run. Scratch rows from
  testing (`Collect`, `555555`, a 10,000-unit request) are skewing the
  dashboard's booked-against-collected chart.
- Catalog v3's weights and the material figures in `0040` are researched
  estimates, not measurements. Nobody has weighed anything. The client should
  confirm them before they are treated as accurate.

## Credentials and accounts

Demo vendors, all with password `Rebin@Demo2026`:

| Persona | Email |
|---|---|
| Business | `eastgate.computer.repair@rebin.demo` |
| Supplier | `rakib.collection@rebin.demo` |
| Organization | `cedar.ridge.medical.center@rebin.demo` |

There are twelve in total, four per persona, all created through the real
signup endpoints so their quotes came from the live catalog.

`admin@rebin.test` was the original operator account, and for a while its
password equalled its email while the repo was public. That login no longer
works as of 2026-08-20 — either removed or changed. The working operator is
`mozahidul.islam.ai@gmail.com`.

## Things that have already gone wrong

Worth knowing so they are not rediscovered:

- **`db push` replays migrations the remote has applied but not recorded.**
  0035–0039 were in the schema with no row in the migration table, so a push
  tried to re-run them and failed on 0035 (`42501` — migrations run with no
  `auth.uid()`, so `is_platform_staff()` is false). `supabase migration
  repair --status applied <n>` fixes the record.
- **`types.gen.ts` goes stale silently.** It predated the payouts table and
  the supplier business type, and the failure surfaced as unrelated
  type errors in web code. Regenerate with
  `npx supabase gen types typescript --project-id tyblthpsuwobdurfhsvq`.
- **A draft catalog copies the active one.** Adding a column means teaching
  `create_price_catalog_draft` to copy it, or the next version drops it. This
  has now happened twice (0037 for weight, 0040 for material).
- **Gemini's free tier returns 503 in bursts.** Not a bug, not a quota — paid
  callers are queued first. Both scan functions retry, then fall back to Groq.
  Sending the retry to Gemini Pro instead was measured and made it worse
  (5 failures in 8 calls against 1 in 8); the comment in `scan-inventory`
  records the numbers so nobody tries it again.
- **Groq's Qwen model reasons out loud** and hits the token ceiling mid-JSON.
  `reasoning_effort: "none"` fixes it. Only `"none"` and `"default"` are
  accepted; `"low"` returns 400.

## Checks

```bash
pnpm --filter web typecheck
pnpm --filter mobile typecheck && pnpm --filter mobile test
pnpm --filter @rebin/shared test
```

142 mobile tests and 94 shared tests pass on `e6353b4`. A run that takes three
times as long as usual and fails a few is the machine being busy, not the
code — re-run before investigating.

## Talking to the client

They are Bangladeshi and prefer Bengali (Bangla script, not transliteration),
kept short. They are a developer themselves, so explanations can be technical;
what they do not want is a wall of options where a recommendation would do.
