# Rebin Tech

**Live:** [rebin-tech.onrender.com](https://rebin-tech.onrender.com)

---

## ভূমিকা

এটি একটি মার্কিন ক্লায়েন্টের জন্য তৈরি করা ই-বর্জ্য সংগ্রহের প্ল্যাটফর্ম।
কোম্পানির নাম **Rebin Tech**, কার্যালয় টেক্সাসে।

কাজটি দুই ধরনের গ্রাহককে ঘিরে, আর এই পার্থক্যটাই পুরো সিস্টেমের ভিত্তি:

**প্রতিষ্ঠান** — হাসপাতাল, স্কুল, সরকারি অফিস। তাদের পুরনো যন্ত্রপাতি সরাতে
হবে, সঙ্গে একটা প্রমাণপত্র লাগবে যে সবকিছু নিয়মমতো নষ্ট করা হয়েছে। তারা
টাকা চায় না — চায় হিসাব। Rebin-এর গাড়ি গিয়ে তুলে আনে।

**ব্যবসায়ী ও সরবরাহকারী** — মেরামতের দোকান, স্ক্র্যাপ সংগ্রাহক। তারা টাকা
চায়। মোবাইল অ্যাপে জিনিসের ছবি তোলে, AI চিনে নেয় কী আছে, আর **ওজন হিসাবে**
দাম বলে — পাউন্ড প্রতি একটা রেট, প্রতিটা যন্ত্রের গড় ওজন ধরে। ওই দামটা
আনুমানিক; মাল গুদামে পৌঁছালে দাঁড়িপাল্লাই চূড়ান্ত সংখ্যা ঠিক করে।

**একদল থেকে নেওয়া হয়, আরেকদল বিক্রি করে** — এই একটা পার্থক্য থেকেই বাকি সব
সিদ্ধান্ত এসেছে।

### তিনটি অংশ

| | কী | কারা ব্যবহার করে |
|---|---|---|
| **ওয়েবসাইট** | পাবলিক পাতা, গোপনীয়তা নীতি, শর্তাবলি | যে কেউ |
| **অ্যাডমিন কনসোল** | সব কাজের সারি, দাম, টাকার হিসাব | দুই-তিনজন অপারেটর |
| **মোবাইল অ্যাপ** | ছবি তুলে দাম জানা, পিকআপ বুক করা | গ্রাহক ও বিক্রেতা |

### প্রযুক্তি

Next.js (ওয়েব) • React Native / Expo (মোবাইল) • Supabase / PostgreSQL
(ডেটাবেস, প্রমাণীকরণ) • Google Gemini (ছবি থেকে যন্ত্র চেনা) • TypeScript

---

## Introduction

An e-waste collection platform built for a US client — **Rebin Tech**, based
in Texas.

The product serves two kinds of customer, and the difference between them is
what the whole system is shaped around:

**Organisations** — hospitals, school districts, council offices. They have
retired equipment and need it gone with a paper trail proving it was disposed
of properly. They do not want paying; they want the certificate. Rebin's team
drives out and collects.

**Businesses and suppliers** — repair shops, scrap collectors, independent
buyers. They do want paying. They photograph their stock in the mobile app, a
vision model identifies each item, and the catalog prices it **by weight** — a
rate per pound against a typical weight per component. That figure is an
estimate; the scale at the warehouse sets the final number and an operator
records the payout.

One side is collected from, the other sells. Almost every decision downstream
follows from that.

### Three surfaces, one database

| | What it is | Who uses it |
|---|---|---|
| **Marketing site** | The public page, privacy and terms | Anyone |
| **Operations console** | The queues, prices and payouts Rebin works from | Two or three operators |
| **Mobile app** | Scan, quote, book a collection | Customers and sellers |

### Stack

Next.js (web) • React Native / Expo (mobile) • Supabase / PostgreSQL (data,
auth, row-level security) • Google Gemini (equipment recognition) • TypeScript
throughout

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

**Operator accounts are issued, never claimed.** There is no sign-up for
console access; an existing operator creates the account and grants it, and
neither the last operator nor your own access can be removed.

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
top of each one explains what went wrong or what changed, which is usually
more useful than the SQL beneath it.

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
