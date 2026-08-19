# Deploying the web app

The console and the marketing site are one Next.js app in `apps/web`. The
mobile app ships separately through Expo and is not covered here.

## Vercel settings

| Setting | Value | Why |
|---|---|---|
| Root Directory | `apps/web` | It is a pnpm monorepo; the repo root is not the app |
| Framework | Next.js | Detected, but `vercel.json` states it anyway |
| Region | `iad1` | Set in `vercel.json` — see below |
| Node | 20+ | Matches local |

### Environment variables

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

Both are in `apps/web/.env.local`, which is gitignored. Both are safe to
expose: the anon key identifies the project and authorises nothing on its own.
Every write in this app goes through a `security definer` RPC that checks
`is_platform_staff()` first.

**There is no service-role key in this application and there must not be
one.** It bypasses every RLS policy in the database, and nothing here needs
it.

### Region matters more than usual here

`vercel.json` pins the deployment to `iad1` because the Supabase project is in
US East. Every console page is `force-dynamic` and the overview alone issues
seven queries per load — at 200-300ms of cross-region latency each, that is a
page that feels broken. In the same region it is 20-30ms and the difference is
invisible.

If the Supabase project ever moves, move this with it.

## After the first deploy

**Add the deployed URL to Supabase.** Authentication → URL Configuration →
Site URL and Redirect URLs. Sign-in silently fails without it: the redirect
comes back to an origin Supabase does not recognise, and the operator sees a
login form that accepts their password and returns them to the login form.

## Plan

Vercel's Hobby tier forbids commercial use, and this application records real
payments to real suppliers. Pro ($20/month at time of writing) is the
appropriate tier — not for the limits, which two or three operators will never
approach, but because the terms require it.

The usage itself is small: a handful of operators, a few hundred function
invocations a day, one or two gigabytes of bandwidth a month. Nothing in the
resource limits is a constraint on this workload.

## Migrations are not deployed by this

The Supabase CLI has no access to this project from here, so every migration
in `supabase/migrations/` is applied by hand in the SQL editor, in numerical
order. A deploy does not run them. If a page starts failing with "Could not
find the function", a migration is missing rather than the code being wrong.
