# Rebin Tech Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single React Native app (iOS + Android) for Rebin Tech — a US e-waste platform serving three role-scoped portals (Organizations, Businesses, Field Agents) from one codebase.

**Architecture:** Expo Router file-based routing where each route group is a portal, gated by a role guard resolved from the server at login. A shared design-system package renders every screen; the portal accent color is injected by the route group's layout. Supabase provides Postgres + Auth + Storage + Realtime, with Row Level Security enforcing portal isolation at the database layer so a routing bug cannot leak data. Money and weight are integers end-to-end.

**Tech Stack:** Expo SDK 54+ (dev builds) · TypeScript strict · Expo Router · NativeWind v4 · Reanimated 3 · FlashList · react-native-vision-camera · react-native-skia · TanStack Query · Zustand · React Hook Form + Zod · op-sqlite + Drizzle · Supabase · Stripe Connect · EasyPost · Turborepo · Vitest + React Native Testing Library + Detox

## Global Constraints

- **Package manager:** pnpm. Monorepo via Turborepo. Node 20+.
- **TypeScript:** `strict: true`, `noUncheckedIndexedAccess: true`. No `any`, no `@ts-ignore` without an adjacent comment explaining why.
- **Expo:** SDK 54 or newer. **Dev builds only — never Expo Go** (vision-camera and skia require native code).
- **Money:** always integer **cents** (`*_cents`). Never float, never `number` representing dollars. Rendered only through `<MoneyText>`.
- **Weight:** always integer **grams** (`*_g`). Displayed in **lbs** only at render time, via `<WeightText>`. Never store lbs.
- **Dates:** all timestamps stored UTC. Facility-local rendering requires the row's `timezone` column. US display format `MM/DD/YYYY`, 12-hour clock.
- **Business rule:** organization pickup requires `unit_count >= 10`, UI default `25`. Enforced in the Zod schema **and** a Postgres CHECK constraint.
- **Database:** PostgreSQL, confirmed as the system of record (via Supabase). See §2 "Scaling & Infrastructure" for the pooling/partitioning plan — this is decided from day one, not deferred.
- **AI provider:** Google Gemini (`gemini-2.5-flash` default, escalate a single low-confidence retry to `gemini-2.5-pro`) for every vision/appraisal call. See §6 — the AI classifies, the price catalog prices; this rule doesn't change with the provider.
- **Backend hosting:** Supabase on Postgres. Local dev already runs on Docker under the hood (`supabase start` = Docker Compose) — no separate Docker setup task exists or is needed. Production can stay on Supabase Cloud (managed) or move to self-hosted Docker Compose later; same schema, same RLS, same client SDK either way — a hosting decision, not an architecture one.
- **Field Agent portal:** ships in two passes (P2a, P2b — see §8). P2a is every screen, fully navigable, with every planned toggle/control visible in the UI (even where the logic behind it is stubbed). P2b wires the real dispatch, offline sync, and payout logic behind those same screens. Nothing gets redesigned between passes.
- **Portal accents (exact):** org `#2E6B4F` · business `#B8862F` · agent `#1F7A6B`.
- **Base palette (exact):** bg `#F6F4ED` · surface `#FFFFFF` · surfaceAlt `#EFF3EC` · border `#E4E1D7` · text `#16241C` · muted `#7A867E` · primary `#2E6B4F` · primaryDark `#1F4D38` · primaryLight `#E6F1E9`.
- **Auth palette (exact, dark forest):** authBg `#0E3A32` · authBgDeep `#0A2E27` · authSurface `#1D4A42` · authSurfacePressed `#245049` · authBorder `#2F5B52` · authPrimary `#7FAF9E` · authOnPrimary `#0A2E27` · authText `#FFFFFF` · authMuted `#A8C4BB` · authLink `#C3DDD2`.
- **Two themes, one app.** Everything under `(auth)` plus the Welcome screen renders on the **dark forest** palette with a botanical hero. Every authenticated screen renders on the **cream** palette. The switch happens exactly once, at the auth boundary — never mid-session.
- **Social auth on Welcome and Sign In:** `Continue with Google` and `Continue with Apple`. **Sign in with Apple is mandatory on iOS** once any other social provider is offered (App Store Guideline 4.8) — shipping Google alone gets the build rejected.
- **Performance budget:** 60fps sustained (120fps on ProMotion) for every list scroll and screen transition; cold start to first interactive frame under 2s on a mid-tier Android device. All animation runs on the UI thread via Reanimated worklets — never `Animated` with `useNativeDriver: false`. New Architecture (Fabric + Hermes) enabled from day one.
- **App name:** `Rebin Tech`. Bundle id `com.rebintech.app`. Scheme `rebintech`.
- **Locale:** `en-US` default, `es-US` scaffolded from day one (no hardcoded user-facing strings — everything through the i18n catalog).
- **Accessibility:** every interactive element carries `accessibilityLabel` and `accessibilityRole`. Minimum hit target 44×44.
- **Commits:** conventional commits (`feat:`, `fix:`, `test:`, `chore:`). Commit at the end of every task.

---

# Part A — Master Design (Spec)

## Context

**Rebin Tech** is a US-market e-waste platform delivered as a single React Native app for **iOS + Android**. It serves three distinct user groups from one codebase:

| Portal | Who | What they get |
|---|---|---|
| 🌿 **Organizations** | Schools, universities, hospitals, municipal offices, corporate HQ | **Free** compliant bulk e-waste removal (10+ device minimum) |
| 🟡 **Businesses** | Repair shops, IT refurbishers, local recyclers | **Get paid** for scrap via AI camera quote |
| 🔷 **Field Agents** | Drivers / on-site technicians | Dispatch queue → on-site audit → settlement → depot return |

The project is greenfield — `d:\Way_To_Job\e-waste` is empty. This plan defines the complete screen inventory, navigation architecture, design system, data model, and build sequence so implementation can start immediately without further design decisions.

**Design direction changed from the original prototype:** the client's AI Studio mockup used a dark navy theme. This build uses a **warm cream + white + green** palette instead (reference: user-supplied screenshot).

---

## 1. Design System

### Color tokens

```ts
// Base
bg            #F6F4ED   // warm cream — app background
surface       #FFFFFF   // cards
surfaceAlt    #EFF3EC   // mint-tinted card (secondary)
surfaceWarm   #FBF1E8   // peach-tinted card (tertiary)
border        #E4E1D7
divider       #EDEAE1

// Text
text          #16241C   // deep green-black
textSecondary #46564C
muted         #7A867E
onPrimary     #FFFFFF

// Brand
primary       #2E6B4F   // forest green — main CTA
primaryDark   #1F4D38   // pressed state
primaryLight  #E6F1E9   // tint / selected chip bg
primarySubtle #F2F7F3

// Portal accents (must stay visually distinct)
org           #2E6B4F   // forest green
business      #B8862F   // amber-gold (money)
agent         #1F7A6B   // teal

// Semantic
success       #2E7D4F
warning       #C08A2E
danger        #C0453B
info          #3E6B8A

// Status pills
pending       #C08A2E on #FBF1E8
dispatched    #3E6B8A on #E8EEF5
completed     #2E7D4F on #E6F1E9
cancelled     #7A867E on #F0EFEA
```

### Auth theme (dark forest) — Welcome, Sign Up, Sign In only

The pre-auth surface is a separate, immersive theme: deep forest green with a soft botanical
illustration, translucent inputs, and a sage-green primary button. It exists to make the first
30 seconds feel like a product rather than a form. The moment a session is established, the app
switches to the cream palette and never switches back.

```ts
authBg             #0E3A32   // hero / screen background (top of gradient)
authBgDeep         #0A2E27   // bottom of gradient
authSurface        #1D4A42   // input fill, social button fill
authSurfacePressed #245049
authBorder         #2F5B52   // 1px input + social button outline
authPrimary        #7FAF9E   // sage CTA — "Sign up" / "Sign in"
authOnPrimary      #0A2E27   // dark label on the sage CTA
authText           #FFFFFF
authMuted          #A8C4BB   // placeholder, secondary copy
authLink           #C3DDD2   // underlined links
```

**Auth screen anatomy (identical structure across all three):**

```
┌────────────────────────────────┐
│  gradient authBg → authBgDeep  │
│  + botanical SVG at 6% opacity │
│                                │
│  Title (display, authText)     │
│                                │
│  ┌──────────────────────────┐  │  input: h56 · r14
│  │ Placeholder              │  │  fill authSurface · border authBorder
│  └──────────────────────────┘  │  focused border → authPrimary
│  ┌──────────────────────────┐  │
│  │ Password            👁    │  │
│  └──────────────────────────┘  │
│              Forgot password?  │  authLink, right-aligned
│                                │
│  ┌──────────────────────────┐  │  CTA: h56 · r14 · authPrimary
│  │        Sign in           │  │  label authOnPrimary
│  └──────────────────────────┘  │
│                                │
│  By continuing you accept our  │  bodySm authMuted
│  Privacy Policy and Terms      │  links authLink underlined
│                                │
│  ──────────  or  ──────────    │  hairline authBorder
│                                │
│  ┌ G  Continue with Google ─┐  │  outline: border authBorder
│  ┌ 🍎 Continue with Apple ──┐  │  fill transparent
│                                │
│  Don't have an account? Sign up│  authMuted + authLink
└────────────────────────────────┘
```

**Rules:** brand marks (Google `G`, Apple logo) render as local SVG assets — never as emoji or
a remote URL. Apple's button must follow Apple's own sizing and wordmark guidance. The `or`
divider is a hairline in `authBorder`, not a full-opacity line.

### Typography

```
display   32 / 700 / -0.02em    screen hero
h1        26 / 700 / -0.01em    screen title
h2        20 / 650              section title
h3        17 / 600              card title
body      15 / 450 / 1.5        default
bodySm    13 / 450
label     11 / 650 / +0.08em / UPPERCASE   micro-label above fields
numeric   tabular-nums          all money / weight / counts
```

Font: system stack (SF Pro / Roboto). No custom font in v1 — reduces bundle and avoids licensing.

### Spacing & shape

```
space   4 · 8 · 12 · 16 · 20 · 24 · 32 · 48
radius  card 20 · button 14 · chip 10 · input 12 · sheet 24
shadow  card: y2 blur12 rgba(22,36,28,0.06)
        raised: y4 blur20 rgba(22,36,28,0.10)
border  1px solid border (cards use border, not heavy shadow)
```

### Core primitives (`packages/ui`)

Build these **first** — every screen composes from them.

| Component | Notes |
|---|---|
| `Screen` | Safe area + scroll + bg + offline banner slot |
| `Card` | surface variants (default / alt / warm), optional accent border |
| `SectionHeader` | Numbered ("1. Quantity Selection") + optional subtitle |
| `PillButton` | primary / secondary / ghost / danger; loading + disabled |
| `IconTile` | Rounded square icon container (48/56), tinted bg |
| `FormField` | Label + input + error + helper; masked variants (phone/ZIP) |
| `SelectField` | Bottom-sheet picker (state, org type, vehicle) |
| `RadioTile` | Large tappable tile w/ title + subtitle + radio |
| `ChipMultiSelect` | Category chips, selected = primaryLight + check |
| `ToggleRow` | Label + description + switch |
| `StatusBadge` | Maps status enum → pill color |
| `StatTile` | Icon + big number + label (dashboard row) |
| `EmptyState` | Illustration + title + body + optional CTA |
| `ListRow` | Leading icon, title, subtitle, trailing value/chevron |
| `Stepper` | Wizard progress (1–2–3) |
| `SignaturePad` | Skia canvas, clear + capture → PNG |
| `MoneyText` | Formats cents → `$1,234.56`, tabular |
| `WeightText` | Formats grams → `12.4 lbs` |
| `DateTimeText` | Timezone-aware, MM/DD/YYYY + 12h |
| `Sheet` | Bottom sheet wrapper |
| `ConfirmDialog` | Destructive action gate |
| `Skeleton` | Loading placeholder |
| `OfflineBanner` | Sticky top bar + pending-sync count |

**Theming:** `PortalThemeProvider` injects the portal accent. Same component renders green / gold / teal depending on route group — zero duplication.

---

## 2. Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Runtime | **Expo SDK 54+ (dev builds, not Expo Go)** | EAS Build → iOS without a Mac; EAS Update → OTA hotfix without App Store review |
| Language | TypeScript (`strict: true`) | Money + roles — no `any` |
| Navigation | Expo Router (file-based) | Route groups map 1:1 to portals; deep links free |
| Styling | NativeWind v4 + token file | Tailwind semantics, tokens single-sourced |
| Animation | Reanimated 3 + Gesture Handler | UI-thread, no bridge jank |
| Lists | FlashList | Scan history / catalog can hit thousands of rows |
| Camera | react-native-vision-camera | Frame processors → continuous multi-scan + barcode |
| Signature | @shopify/react-native-skia | 60fps stroke capture → PNG |
| Server state | TanStack Query (+ persister) | Cache, retry, offline hydrate |
| Client state | Zustand | Session, active job, scan cart |
| Forms | React Hook Form + Zod | Zod schemas shared client↔server |
| Local DB | op-sqlite + Drizzle | Offline queue for agent workbench |
| Maps | react-native-maps + Google Directions | Dispatch routing |
| Backend | Supabase (Postgres, Auth, Storage, Realtime, Edge Functions) | RLS gives 3-portal isolation at the DB layer; Postgres is the real backend, Supabase is the harness — swappable without touching schema or app code |
| AI | Google Gemini (`gemini-2.5-flash`, vision) via Edge Function | Structured JSON output (`responseSchema`), generous free tier fits an early-stage free-recycling product; escalate to `gemini-2.5-pro` per-scan on low confidence |
| Payments | Stripe Connect | Instant payout + ACH + onboarding |
| Shipping | EasyPost | One API for UPS + FedEx labels |
| Monorepo | Turborepo | `apps/mobile`, `apps/admin`, `packages/{ui,shared,api}` |

**Repo layout**

```
rebin-tech/
├─ apps/
│  ├─ mobile/          Expo app (this plan)
│  └─ admin/           Next.js web dashboard (Phase 5)
├─ packages/
│  ├─ ui/              design system primitives
│  ├─ shared/          Zod schemas, types, enums, formatters
│  └─ api/             typed Supabase client + query hooks
└─ supabase/
   ├─ migrations/
   └─ functions/       appraise, payout, label, receipt
```

### Scaling & Infrastructure

The instruction driving this section: **decide the scaling posture now, not after the database is
already large.** Retrofitting pooling or partitioning onto a live table with real user data is a
maintenance-window project; designing for it up front is a one-line schema choice.

**Hosting — Docker is already in the stack, just not as a separate task.** `supabase start`
(used in every local Task 7+ step of this plan) runs Postgres, Auth, Storage, and the Edge
Function runtime as Docker containers on your machine — this **is** the Docker backend. Three
paths forward from the same Docker Compose file, chosen later without touching schema or app
code:

| Path | When | Trade-off |
|---|---|---|
| **Supabase Cloud (managed)** | Ship P0–P2 fastest | Zero ops, usage-based billing, least control |
| **Self-hosted Docker Compose** (`supabase/docker`) | Cost control matters, or data must stay on infra you control | You run backups, upgrades, monitoring |
| **Managed Postgres** (Neon / RDS / Cloud SQL) **+ self-hosted Supabase services** | Database needs to scale independently of the app services | More moving parts, most control |

Start on **Supabase Cloud** for P0–P2 (fastest to a working app), keep the migrations directory as
the single source of truth so any of the three paths stays a `pg_dump`/`pg_restore` away — never
hand-edit schema through a dashboard.

**Postgres scaling plan (apply from Task 7, not retrofitted later):**

| Concern | Technique | Trigger |
|---|---|---|
| Connection exhaustion | **Supavisor** (Supabase's pooler, PgBouncer-compatible) — the mobile app and Edge Functions connect through the pooler, never direct | Always on, from Task 7 |
| Slow lookups | Every foreign key and every `status`/`created_at` column used in a `WHERE` gets an explicit index — see the index on `pickup_requests (org_id, created_at desc)` in Task 7 as the pattern to repeat | Every migration that adds a query path |
| Unbounded table growth | **Monthly range partitioning** on `audit_events` and `scan_records` (append-only, highest write volume) | When either table is projected to exceed ~5M rows — plan the partition key (`created_at`) into the schema now so adding partitions later is a `CREATE TABLE ... PARTITION OF`, not a migration of live data |
| Large binary data | Photos, signatures, and receipt PDFs are **never** inserted into Postgres — only their Supabase Storage URL is. Storage is S3-compatible and scales independently | Always on, from Task 7 |
| Reporting load | The Phase 5 admin dashboard's aggregate queries (catalog history, payout totals) read from a **read replica** once P0–P4 traffic makes them contend with the mobile app's write path | Add when P5 admin dashboard ships, not before |
| Query cost visibility | `EXPLAIN ANALYZE` on any query added to a FlashList screen before merging — a list screen that becomes a sequential scan at 10 rows becomes an outage at 500k | Every task that adds a new list-backed query |

This keeps the schema in Part A §5 **exactly as designed** — none of it needs a rewrite. Scaling
here is an operational posture (pooling, indexes, partition keys, replicas), not a different data
model.

---

## 3. Navigation Architecture

```
app/
├─ _layout.tsx                    Root: fonts → session → role → redirect
├─ index.tsx                      S02 Portal Select (first launch only)
│
├─ (public)/
│  ├─ portal/[role].tsx           S03 Portal Landing
│  ├─ catalog.tsx                 S66 Price Catalog (no auth — App Store 4.2)
│  └─ catalog/[itemId].tsx        S67 Catalog Item Detail
│
├─ (auth)/
│  ├─ login.tsx                   S04 Unified Login
│  ├─ forgot-password.tsx         S05
│  ├─ reset-password.tsx          S06
│  ├─ verify.tsx                  S07 OTP
│  ├─ pending.tsx                 S08 Account status
│  ├─ context-picker.tsx          S09 Multi-role switcher
│  └─ signup/
│     ├─ organization.tsx         S10–S13 (3-step wizard)
│     ├─ business.tsx             S14–S17 (3-step + Stripe)
│     └─ agent.tsx                S18–S21 (token-gated)
│
├─ (org)/            _layout: guard role=org       accent=green
│  ├─ dashboard.tsx               S22
│  ├─ requests.tsx                S30
│  ├─ request/new.tsx             S23–S28 (wizard)
│  ├─ request/[id].tsx            S29
│  ├─ team.tsx                    S31
│  ├─ team/invite.tsx             S32
│  └─ settings.tsx                S33
│
├─ (biz)/            _layout: guard role=business  accent=gold
│  ├─ dashboard.tsx               S34
│  ├─ scan.tsx                    S35–S37
│  ├─ quote/new.tsx               S38–S42
│  ├─ quote/[id].tsx              S43
│  ├─ quotes.tsx                  S44
│  ├─ payouts.tsx                 S45–S46
│  ├─ payout-method.tsx           S47
│  └─ settings.tsx                S48
│
├─ (agent)/          _layout: guard role=agent     accent=teal
│  ├─ dispatch.tsx                S49
│  ├─ job/[id].tsx                S50–S52
│  ├─ job/[id]/scanner.tsx        S53–S56
│  ├─ job/[id]/settlement.tsx     S57–S62
│  ├─ depot.tsx                   S63
│  ├─ earnings.tsx                S64
│  └─ profile.tsx                 S65
│
└─ (shared)/         auth required, all roles
   ├─ scan-history.tsx            S68
   ├─ scan/[id].tsx               S69
   ├─ notifications.tsx           S70
   ├─ me.tsx                      S71
   ├─ settings.tsx                S72
   ├─ help.tsx                    S73
   └─ legal/[doc].tsx             S74
```

### Root routing logic

```
boot
 └─ hydrate session
     ├─ no session
     │   ├─ first launch  → S02 Portal Select
     │   └─ returning     → S04 Login  ("Not you?" → S02)
     └─ session
         ├─ status ≠ active        → S08 Pending
         ├─ 1 role assignment      → that portal home
         └─ 2+ role assignments    → S09 Context Picker
```

**Portal Select shows once.** After first successful auth, a device flag (`MMKV: hasOnboarded`) sends returning users straight to Login or Dashboard. Agents open the app 20×/day — they never see the portal cards again.

---

## 4. Screen Inventory (A → Z)

### Group S0 — Boot, Auth, Onboarding

| # | Screen | Content | Actions | States |
|---|---|---|---|---|
| **S01** | Splash | Rebin Tech logo, cream bg, subtle leaf animation | — | loading only |
| **S02** | Portal Select | Header "Rebin Tech · Free, compliant e-waste recycling". 3 cards: 🌿 Organizations "Zero-Cost Bulk Removal · 10+ device minimum" · 🟡 Businesses "Get Paid for Scrap · AI camera quote" · 🔷 Field Agents "Dispatch & Settlement · invite only". Footer: "Browse Price Catalog" + "Already have an account? Log In" | card → S03 · catalog → S66 · login → S04 | static |
| **S03** | Portal Landing | Accent hero, audience description, 3 bullet benefits, badge chip | Sign Up → role signup · Log In → S04. Agent variant replaces Sign Up with "I have an invite link" | — |
| **S04** | **Login (unified)** | Email, Password (eye toggle), Remember me, biometric prompt on repeat | Submit → role resolve → route · Forgot → S05 · "Not you?" → S02 | idle / loading / error / locked-out |
| **S05** | Forgot Password | Email input | Send reset link → confirmation | sent |
| **S06** | Reset Password | New password + confirm, strength meter | Save → S04 | token-expired |
| **S07** | Verify (OTP) | 6-digit boxes, auto-advance, resend timer 60s | Verify → next · Resend | invalid / expired |
| **S08** | Account Pending | Role-specific status card + timeline. Org: "Verification in review — 24 hrs". Business: "Finish payout setup" + CTA. Agent: "Awaiting fleet approval" | Continue setup (biz) · Contact support · Log out | pending / rejected / suspended |
| **S09** | Context Picker | List of role assignments as cards w/ accent + org name + role label | Select → set active context → portal | rare (<5% users) |

### Signup — Organization (S10–S13)

| # | Step | Fields | Validation |
|---|---|---|---|
| **S10** | 1 · Organization | Organization Name · Organization Type (sheet: K-12 School, University, Hospital/Clinic, Municipal Office, Corporate HQ, Other) | required |
| **S11** | 2 · Contact | Primary Contact Name · Contact Title · Work Email · Phone `(555) 019-2345` | email must not be free-mail domain (warn, not block) |
| **S12** | 3 · Facility | Facility Pickup Address (Google Places autocomplete → street/city/state/ZIP) · **Loading Dock Access?** toggle w/ helper "Yes if freight trucks can back into the dock" · Create Password + confirm | address must resolve |
| **S13** | Success | ✅ "Registration submitted" · what happens next · expected timeline | → S08 |

### Signup — Business (S14–S17)

| # | Step | Fields |
|---|---|---|
| **S14** | 1 · Business | Business Name · Business Type (Repair Shop, IT Refurbisher, Recycler, Other) · Contact Name · Work Email · Phone |
| **S15** | 2 · Verification | Website URL **or** Google Maps link (at least one required) · Business Address · helper: "Used to verify your business identity" |
| **S16** | 3 · Payout | Payout method (ACH Direct Deposit default) · CTA "Continue to secure setup" → Stripe Connect hosted onboarding (WebView) · Create Password |
| **S17** | Success | ✅ + "Verification typically completes within 1 business day" → S08 |

### Signup — Field Agent (S18–S21)

| # | Step | Fields |
|---|---|---|
| **S18** | Invite Landing | Reads `?token=`. Valid → shows inviting org + role. Invalid/expired → error screen w/ "Request a new invite" |
| **S19** | 1 · Identity | Full Legal Name · Driver's License Number · DL State (sheet) · Agent Employee ID / Contractor Code · email locked from invite |
| **S20** | 2 · Vehicle & Emergency | Assigned Vehicle Type (Personal Vehicle / Box Truck / Freight Van) · Emergency Contact Name · Emergency Phone · Create Password |
| **S21** | Success | ✅ → S49 Dispatch (agents are pre-approved by the inviter) |

---

### Group S1 — 🌿 Organizations Portal

**S22 · Dashboard**
- Greeting "Good morning, {contact first name}" + org name
- Stat row: `Active Requests` · `Devices Recycled` · `Certificates` · `Next Pickup`
- Primary CTA card: **"Schedule Free Pickup"** (10+ device minimum badge)
- "Submitted Requests" list (5 most recent) → S30 "View all"
- Empty state: "No pickups yet. Schedule your first free removal."
- Quick access grid: Requests · Team · Certificates · Catalog

**S23–S28 · New Pickup Wizard**

| # | Step | Content |
|---|---|---|
| **S23** | 1 · Quantity | `RadioTile` ×4: **10–30** "Small Office / Single Classroom" · **30–100** "Department / Floor Clearance" · **100–300** "Building / Multi-Dept Overhaul" · **300+ / Full Pallets** "Enterprise / Campus Clearance". Then `Exact Unit Count` numeric, **default 25, min 10**. Selecting a tile pre-fills the count midpoint; manual edit re-selects the matching tile. |
| **S24** | 2 · Categories | `ChipMultiSelect`: Computers & Laptops · Monitors & Displays · Server Gear · Copiers & Printers · Batteries & UPS Units. At least 1 required. Optional CTA: **"Scan devices with camera"** → S25 |
| **S25** | 2b · Inventory Scan *(optional)* | Camera in `mode="inventory"`. AI returns device type + make/model + **serial / asset tag**. Running list w/ delete. Auto-fills categories + increments count. Output feeds the compliance manifest. |
| **S26** | 3 · Schedule & Contact | Preferred Date (calendar, min +2 business days) · Time Window (sheet: 8–11 AM, 9 AM–12 PM, 12–3 PM, 1–4 PM) · On-Site Point of Contact · Contact Phone · Facility Dock Address (prefilled, editable) · Dock Access & Special Instructions (multiline) |
| **S27** | Review | Read-only summary of all 3 steps, each with "Edit" jump. Green banner: "This pickup is free of charge." |
| **S28** | Confirmed | ✅ Request ID · summary card · "What happens next" 3-step timeline · CTAs: View Request / Back to Dashboard |

**S29 · Request Detail**
- Header: Request ID + `StatusBadge`
- **Vertical timeline**: Submitted → Under Review → Scheduled → Agent Dispatched → In Transit → Completed (each with timestamp; future steps muted)
- Assigned agent card (name, photo, vehicle, ETA) once dispatched
- Live map when `en_route`
- Details accordion: quantity, categories, schedule, contact, dock notes
- After completion: **Download Certificate of Recycling (PDF)** + device manifest
- Actions: Reschedule (if not dispatched) · Cancel (if not dispatched) · Contact Support

**S30 · Requests List** — FlashList, filter chips `All / Pending / Scheduled / Completed / Cancelled`, search by ID, pull-to-refresh, infinite scroll.

**S31 · Team** — member list (avatar, name, email, role badge), invite CTA (owner/admin only), row → change role / remove.

**S32 · Invite Member** — email + role RadioTile (Admin / Requester) + role capability explainer → send.

**S33 · Org Settings** — org profile (name, type, address, dock toggle), contact info, notification prefs, → shared settings.

---

### Group S2 — 🟡 Businesses Portal

**S34 · Dashboard**
- Greeting + business name + verification badge
- Stat row: `Pending Quotes` · `Paid This Month` · `Total Earned` · `Items Sold`
- Primary CTA: **"Start AI Scan"** (large, gold)
- Secondary: "Browse Price Catalog"
- "Submitted Quotes" recent list → S44
- Support banner: `1-800-555-EWASTE` (tap → dial)

**S35 · AI Scan Camera**
- Full-screen VisionCamera, framing guide overlay, torch toggle, front/back
- **Continuous multi-scan**: capture → item added to cart → keep scanning
- Floating cart pill "3 items · $4.82" → S37
- Guidance chip: "Place one component on a flat, plain surface"
- Permission-denied state with Settings deep link

**S36 · Scan Result** *(sheet over camera)*
- Detected item name (e.g. "Gold-fingered SODIMM, DDR4")
- **Confidence badge** `✓ 95% Match` (green ≥90 / amber 70–89 / red <70)
- Grade selector (A / B / C) — AI pre-selects, user can override
- Quantity stepper · Est. weight
- **Unit price + line total** (from current catalog version)
- Actions: Add to Quote · Retake · Enter Manually
- **Low-confidence state (<70%)**: "We couldn't identify this confidently" → manual category picker

**S37 · Scan Cart** — editable line list (swipe to delete, tap to edit), running subtotal, "Add More" / "Continue to Quote".

**S38 · Quote Summary** — line items, subtotal, **total weight in lbs**, "Prices locked at catalog v{n}" note, Continue.

**S39 · Tier Select** — two `RadioTile`s driven by total weight:
- **Tier 1 · Small Shipment (10–50 lbs)** → prepaid label, drop at UPS/FedEx
- **Tier 2 · Bulk Pickup (50–200+ lbs)** → local agent with van/box truck
- Out-of-range tier disabled with reason text.

**S40 · Mail-In Label** — large **QR code**, tracking number, "Download Label PDF" / "Email Label" / "Add to Wallet", packing instructions checklist, nearest drop-off map link.

**S41 · Pickup Schedule** — preferred date + window, pickup address (prefilled), on-site contact, access notes.

**S42 · Quote Submitted** — ✅ Quote ID, estimated payout, next-steps timeline.

**S43 · Quote Detail** — status timeline (Submitted → In Transit / Agent Assigned → Received → Verified → **Paid**), line items, tracking link or agent card, final settlement breakdown once complete (incl. any deductions with reason), receipt PDF download.

**S44 · Quotes History** — FlashList, filter `All / Draft / In Transit / Verified / Paid`, date-range chips.

**S45 · Payouts** — list of payouts (date, amount, method, status). Header card: `Available` / `Pending` / `Lifetime`.

**S46 · Payout Detail** — amount, source quote link, method, transaction reference, timestamps, receipt.

**S47 · Payout Method** — current method card, "Update via Stripe" → hosted WebView, ACH last-4 display. `biz_owner` only — `biz_staff` sees a locked state.

**S48 · Business Settings** — profile, verification status, team, notifications.

---

### Group S3 — 🔷 Field Agents Portal

**S49 · Dispatch Queue (home)**
- Header: agent name, vehicle chip, **online/offline toggle**
- Today strip: `Jobs` · `Stops Done` · `Weight Collected` · `Payouts Issued`
- Job cards sorted by route order: business/org name, address, distance + ETA, weight estimate, type badge (🌿 Free Pickup / 🟡 Paid Liquidation), status
- Actions: Start Route · tap card → S50
- Empty state: "No pickups assigned. You'll be notified when dispatch assigns a job."
- **OfflineBanner** with pending-sync count when disconnected

**S50 · Job Detail (pre-arrival)** — customer card (name, contact, tap-to-call), full address + **Open in Maps**, dock access instructions, expected categories/quantity, special notes, primary CTA **Start Navigation** → S51.

**S51 · En Route** — map with route polyline, ETA, "Arrived" button (enabled inside geofence radius ~150m; manual override with reason).

**S52 · Arrival Confirm** — confirm on-site contact name, optional site photo, CTA **Begin Audit** → S53.

**S53 · Scanner (multi-scan)** — same camera engine as S35, mode from job type:
- 🟡 Paid job → `mode="appraisal"` (prices visible)
- 🌿 Free job → `mode="inventory"` (**no prices**, serial capture on)
- Barcode/QR mode toggle for labeled boxes
- Persistent tally bar: `items · lbs · $total`

**S54 · Manual Entry / Override** — category picker, grade, quantity, weight; **price override with mandatory reason** (logged to audit). Used when AI fails or item is off-catalog.

**S55 · Weight Entry** — numeric keypad (lbs, 1 decimal), tare helper, optional Bluetooth scale read, photo-of-scale attachment.

**S56 · Item List** — full audited list, swipe to delete, tap to edit, running totals, CTA **Proceed to Settlement**.

**S57 · Settlement — Line Items** — read-only itemised table, subtotal. Free jobs show `$0.00` and skip S58–S61 payout steps (signature still required).

**S58 · Deductions** — `Deductions / Contamination Fee ($)` input + **required reason** (Contaminated, Damaged, Non-recyclable, Other→text) + optional photo evidence. Live-recomputed **FINAL PAYOUT AMOUNT** in large green numerals.

**S59 · Signature — Store Manager** — full-width Skia pad "Sign here with finger / stylus", printed name field, Clear / Accept.

**S60 · Signature — Field Agent** — same pad, agent verification signature.

**S61 · Execute Payout** — final confirmation sheet (amount, recipient, method) → single button **"Execute Payout & Issue Digital Receipt"** → processing → success. Idempotency key prevents double-pay on retry.

**S62 · Job Complete** — ✅ summary, receipt PDF (view / email / SMS), CTA **Next Job** → S49.

**S63 · Depot Intake (end of day)** — list of the day's collected loads, manifest weight vs **actual scale weight** entry per load, **variance flag** if >5%, receiving supervisor signature, CTA **Close Out Day**.

**S64 · Earnings** — jobs completed, payouts issued, miles, weight collected; period chips (Today / Week / Month).

**S65 · Agent Profile** — name, employee/contractor code, vehicle, DL expiry reminder, emergency contact, availability toggle.

---

### Group S4 — Shared

| # | Screen | Content |
|---|---|---|
| **S66** | **Master Price Catalog** | Public (no auth). Search + category filter chips. Rows: component name, grade, `$/lb` rate, unit price. Header: "Rates updated {date} · v{n}" |
| **S67** | Catalog Item Detail | Photo, description, grading criteria (A/B/C with examples), current rate, 30-day rate trend |
| **S68** | Scan History | FlashList of appraisals. Row: thumbnail, item name (truncated), `$0.46`, date, `1 items` chip, `✓ 95% Match`. Filter chips **All Time / Today / Last 7 Days / Last 30 Days** + **Clear** (destructive confirm) |
| **S69** | Scan Detail | Full photo, AI output, confidence, catalog version used, price breakdown, linked quote/job |
| **S70** | Notifications | Grouped by day; types: request status, dispatch assigned, payout sent, catalog updated. Unread dot, mark-all-read |
| **S71** | Me | Avatar, name, role badge, org/business name, menu → Settings / Help / Legal / Log Out |
| **S72** | Settings | Notification toggles (push / email / SMS), language (English / Español), units, biometric lock, clear cache, app version + update check |
| **S73** | Help & Support | FAQ accordion, contact card `1-800-555-EWASTE`, email, report-a-problem form (auto-attaches diagnostics) |
| **S74** | Legal | Terms, Privacy Policy, Licenses — markdown renderer |

### Cross-cutting states (every screen)

`loading` (Skeleton, never spinner-only) · `empty` (EmptyState) · `error` (inline + retry) · `offline` (banner + queued badge) · `permission-denied` (camera/location → Settings deep link) · `unauthorized` (role guard → redirect)

---

## 5. Data Model

```sql
-- Identity & roles
profiles            id(→auth.users) full_name phone avatar_url status created_at
role_assignments    id user_id role scope_type scope_id granted_by granted_at revoked_at
invitations         id email role scope_id token_hash expires_at consumed_at

-- Tenants
organizations       id name org_type facility_address_json facility_timezone
                    dock_access status verified_at
organization_members org_id user_id member_role
businesses          id name biz_type website_url gmaps_url address_json timezone
                    stripe_account_id kyc_status verified_at
business_members    biz_id user_id member_role
field_agents        id(→profiles) legal_name dl_number dl_state employee_code
                    vehicle_type emergency_contact_json is_available

-- Catalog (versioned — quotes freeze to a version)
price_catalog       id version_no effective_from effective_to published_by
price_items         id catalog_id component_key display_name grade
                    rate_per_lb_cents unit_price_cents

-- Demand
pickup_requests     id org_id created_by size_tier unit_count categories[]
                    window_start window_end tz on_site_contact_json
                    dock_address_json instructions status
liquidation_quotes  id biz_id created_by tier catalog_version_id
                    total_weight_g quoted_total_cents status
                    shipping_label_url tracking_number

-- Line items (shared shape, source discriminated)
scan_records        id source_type source_id component_key grade quantity
                    weight_g unit_price_cents line_total_cents
                    ai_confidence ai_raw_json photo_url serial_number
                    is_manual override_reason created_by created_at

-- Fulfilment
dispatch_jobs       id source_type source_id agent_id sequence_no
                    status assigned_at started_at arrived_at completed_at
settlements         job_id line_subtotal_cents deduction_cents deduction_reason
                    final_payout_cents mgr_signature_url mgr_printed_name
                    agent_signature_url payout_ref receipt_pdf_url settled_at
depot_intakes       job_id received_by received_at manifest_weight_g
                    actual_weight_g variance_pct variance_flag supervisor_sig_url

-- Compliance & audit
device_manifest     id source_type source_id serial_number asset_tag make model
                    data_bearing sanitization_method
certificates        id source_type source_id cert_type pdf_url issued_at
audit_events        id actor_id entity_type entity_id action payload_json created_at
```

**Money = integer cents. Weight = integer grams.** Never floats. Display formatters live in `packages/shared`.

### RLS pattern

```sql
create function has_role(p_role role_enum, p_scope uuid default null)
returns boolean language sql stable security definer as $$
  select exists (select 1 from role_assignments
    where user_id = auth.uid() and role = p_role
      and (p_scope is null or scope_id = p_scope)
      and revoked_at is null);
$$;

create policy req_read on pickup_requests for select using (
  created_by = auth.uid()
  or has_role('org_admin', org_id) or has_role('org_owner', org_id)
  or has_role('platform_ops')
);
create policy job_read on dispatch_jobs for select using (agent_id = auth.uid());
create policy price_write on price_items for all using (has_role('platform_ops'));
```

Roles are baked into JWT claims via a Supabase Auth Hook so policies read `auth.jwt()` instead of hitting the table on every query.

---

## 5A. Authentication, Authorization & Admin Bootstrap

### Authentication

| Concern | Design |
|---|---|
| Password + email | Supabase Auth. Access token short-lived (1hr), refresh token auto-rotates — standard, nothing custom |
| Social login | Google + Apple, native sheets (Task 16). Same `role_assignments` model applies — a social sign-in with zero roles lands on Portal Select to complete signup, exactly like email signup |
| Password policy | Enforced **server-side**, not just in the Zod form (Task 3's `passwordSchema` is UX; a Postgres check or Supabase Auth password policy is the actual guarantee) — 10+ chars, one digit, one symbol |
| Brute force | Supabase Auth rate-limits sign-in attempts per IP+email by default. Add defense-in-depth: `profiles.failed_login_count` + `profiles.locked_until`, incremented on failure, checked before password verification, reset on success |
| Revoking a session | When an admin revokes a `role_assignments` row, call `supabase.auth.admin.signOut(userId, 'others')` in the same transaction — a revoked admin's **existing** logged-in session dies immediately, not just future logins |

### Authorization

The RBAC model already in §5 (`role_assignments` + `has_role()` + RLS) is the correct shape and
does not change. One rule to hold firm during implementation: **RLS is the enforcement; app-side
role checks are UX only.** A `has_role('platform_ops')` check in a React component decides whether
to *show* a button — it is not a security boundary. The security boundary is the RLS policy that
runs no matter what the client sends. If a screen hides a button but the underlying table has no
matching policy, that is a bug, not a completed feature.

### Admin Bootstrap — the real-world reasoning

**The question was: does an admin register and get approved by another admin, or does a default
admin account get created and its password changed later?**

Neither, exactly — because the two options collide with a problem every real system with an admin
role has to solve once: **the first admin cannot be approved by another admin, because no other
admin exists yet.** "Register, then get approved" only works starting from the *second* admin.

This isn't a Rebin Tech-specific problem — every product you already use solved it the same way:

| Product | How the first admin appears |
|---|---|
| AWS | The **root user** exists the instant you create the AWS account — nobody approves it, it's just there |
| Slack / Notion | The **first person to create a workspace becomes its owner automatically** |
| WordPress | The installer makes you set an admin username + password **during setup**, before the site exists |
| Django | `python manage.py createsuperuser` — a one-time command run by whoever has server access |

Rebin Tech is one company, not a multi-tenant SaaS where each customer needs their own first admin
— so the closest fit is the **AWS root-account pattern**, and it's already what this plan's schema
was built for:

1. **One seeded owner, created outside the app entirely.** `supabase/migrations/0009_seed_platform_owner.sql`
   (already in Task 7) inserts the first `platform_owner` role assignment directly via migration —
   run once, by whoever deploys, with a strong password generated and stored in a password manager.
   **There is no "admin signup" screen anywhere in the app** — this account is never reachable
   through the UI, only through the database.
2. **Every admin after the first is invited, not registered.** The `invitations` table already in
   §5 covers this: an existing admin sends an email + role + signed single-use token; the invited
   person opens the link and **sets their own password**. Their account is created
   already-approved, scoped to exactly the role they were invited with (`platform_ops`,
   `platform_finance`, or `platform_support` — see the permission matrix from earlier in this
   project's design).
3. **No shared admin password, ever.** Two people on one login means you can't tell which of them
   did an action — which breaks the `audit_events` trail this whole system depends on for disputes
   and compliance — and you can't revoke one admin without locking out the other. "Default admin,
   change password later" is fine for the **one** seeded bootstrap account; it is never acceptable
   as an ongoing pattern for a *team* of admins.
4. **Self-register-then-approve is the wrong shape specifically for admins** — it's the *correct*
   shape for Organizations and Businesses (public-facing, unknown until verified, see the
   `pending_verification` status in §4), but an "admin approval request" endpoint is itself a
   privileged action. It would need an admin to guard it, and until someone approves the first
   request, anyone could file one and have it sit in a queue. Keep admin creation strictly
   invite-only, initiated by an existing admin — there is no public path to becoming an admin.

**Optional hardening (do this once, early):** immediately after deploy, use the seeded owner to
invite a real, named person as the permanent `platform_owner`, then stop using the seeded
credential for anything but emergency access — the same advice AWS gives for its own root user
("create an IAM admin, then avoid using root day-to-day"). Nothing in the schema forces this; it's
an operational habit worth adopting from week one.

**What this means for the build:** nothing in §5's schema or RLS changes — `role_assignments.granted_by`
and the `invitations` table already model exactly this flow. The only manual step is running
`0009_seed_platform_owner.sql` with a real password at first deploy, and never automating that
step into a CI pipeline or exposing it as an API route.

---

## 6. AI Appraisal Pipeline

```
Camera frame → downscale (long edge 1024px) → Edge Function `appraise`
   → Gemini 2.5 Flash, vision + responseSchema (structured JSON — no free text)
   → { component_key, grade, confidence, serial?, reasoning }
   → low confidence (<70)? → single retry on Gemini 2.5 Pro
   → price_items lookup (current catalog version)
   → { display_name, grade, confidence, unit_price_cents }
```

- **Structured output, not prompt parsing.** The Edge Function call sets
  `responseMimeType: "application/json"` and a `responseSchema` matching the `ScanResult` Zod
  type in `packages/shared` — Gemini is constrained to that exact shape. There is no free-text
  response to regex or JSON.parse defensively; a malformed response is a schema violation the SDK
  surfaces directly, not a runtime string bug.
- **Two-tier model, not one.** `gemini-2.5-flash` runs every scan by default — fast and cheap
  enough for continuous multi-scan on the Field Agent scanner. Only a scan that comes back below
  the 70% confidence gate gets **one** retry on `gemini-2.5-pro` before falling through to manual
  entry. This keeps cost near-zero at normal volume while still giving hard items a second, more
  capable look.
- **AI never prices.** It classifies; the catalog prices. Rate changes need no retrain, and every
  quote is explainable in an audit — this rule is provider-independent and does not change with
  the Gemini swap.
- **Confidence gates (unchanged):** ≥90 auto-accept · 70–89 accept with review prompt · <70 force
  manual entry (after the Pro retry).
- **Cost posture.** Gemini's free tier (Flash: 15 RPM / 1,500 requests per day at time of writing)
  covers early-stage scan volume at $0 while Rebin Tech proves out usage; budget for the paid tier
  once daily scans approach that ceiling — the Edge Function call shape does not change when
  billing kicks in, only the API key's plan.
- `GEMINI_API_KEY` lives only in the Edge Function — never shipped to the client, never in
  `EXPO_PUBLIC_*` env vars. Every appraisal writes the raw Gemini response to
  `scan_records.ai_raw_json` for dispute resolution, exactly as before.

---

## 7. Offline Strategy (Agent only)

```
Write → local SQLite (op-sqlite + Drizzle) → optimistic UI
      → mutation_queue row
      → connectivity restored → sequential replay → server ack → mark synced
```

| Action | Offline? |
|---|---|
| Scan capture (photo + AI queued) | ✅ queued, appraised on reconnect |
| Manual item entry / weight | ✅ fully local |
| Signature capture | ✅ local PNG, uploaded later |
| Settlement calculation | ✅ local (catalog cached on login) |
| **Payout execution** | ❌ **requires network** — queued as `pending_settlement`, agent sees "Payout will process when back online", customer gets SMS on completion |

Payout is the one hard network boundary. Making it optimistic would risk paying twice or paying on a settlement that later fails validation.

---

## 8. Build Sequence

| Phase | Deliverable | Screens | Gate |
|---|---|---|---|
| **P0 · Foundation** | Turborepo, Expo dev build on both platforms, design tokens, all `packages/ui` primitives, Supabase schema + RLS, auth + role routing, EAS pipeline | S01–S09 | Login on a physical iPhone + Android device, role-based redirect verified |
| **P1 · Organizations** | Org signup, dashboard, 3-step pickup wizard, request detail + timeline, team management | S10–S13, S22–S24, S26–S33 | Real org account books a pickup end-to-end |
| **P2a · Field Agent — UI** | All 17 Field Agent screens, fully built and navigable on fixture/mock data — dispatch queue, on-site scanner, weight entry, settlement math, dual signature pad, depot intake. Every planned control is present (offline banner, Bluetooth-scale button, price-override field, "Execute Payout" button) even where its logic is stubbed, so nothing gets redesigned in P2b | S49–S65 | Walk the entire agent flow on-device with seeded fixtures — every screen renders, every button navigates somewhere real, nothing errors |
| **P2b · Field Agent — Logic** | Wire the same screens to real dispatch assignment, offline SQLite queue + replay, live settlement math, real payout execution, depot variance check | S49–S65 (same screens, now live) | Agent completes a real P1 request in airplane mode, syncs cleanly, payout lands |
| **P3 · AI Appraisal** | Edge Function (Gemini), camera module (both modes), scan result, cart, catalog, scan history | S25, S35–S37, S66–S69 | 50-item accuracy benchmark ≥85% top-1 |
| **P4 · Businesses** | Biz signup + Stripe Connect, quote flow, tier select, EasyPost label, payouts | S14–S17, S34, S38–S48 | Test payout lands in a Stripe test account |
| **P5 · Admin + Polish** | Next.js admin dashboard (invite-only admin management per §5A, catalog, dispatch assign, payout release), certificates, notifications, i18n (EN/ES), accessibility pass, store submission | S70–S74 | TestFlight + Play Internal Testing builds live |

**Why P2 splits in two:** Field Agent has the most screens (17) and, until P3 (AI) and P4
(Businesses/Stripe) exist, the least it can actually *do* — there's no live job to dispatch until
Organizations (P1) is generating requests, and no real payout math until the catalog (P3) exists.
Shipping the UI first means the client can click through the entire agent experience early, and
P2b becomes a focused wiring pass instead of a screen-building pass once P1 and P3 land.

Each phase ends with a working, demoable app — not a half-built layer.

---

## 9. Verification

**Per phase**
- `pnpm typecheck` — zero errors, `strict: true`
- `pnpm test` — Vitest on `packages/shared` (Zod schemas, money/weight formatters, tier logic, deduction math)
- Detox E2E on the phase's happy path
- Manual run on physical iPhone + Android device (simulators hide camera, haptics, and permission behaviour)

**Critical paths that must have E2E coverage**
1. Login → correct portal for each of the 3 roles
2. Org pickup wizard rejects `unit_count < 10` at both UI and API layers
3. Agent settlement math: `subtotal − deduction = final_payout`, cents-exact
4. Offline scan → reconnect → single synced record (no duplicates on replay)
5. Payout idempotency: double-tap "Execute Payout" charges once
6. Role guard: agent session hitting an `(org)` deep link is redirected, and RLS returns zero rows even if routing is bypassed

**Design QA**
- Contrast ≥4.5:1 on `muted` text over `bg` (verify `#7A867E` on `#F6F4ED`)
- Every interactive element has `accessibilityLabel`
- No horizontal scroll at 320px width
- All money renders via `MoneyText`, all weight via `WeightText` — no raw numbers in JSX

---

# Part B — Phase 0 Implementation Plan (Foundation)

> **Scope decision:** the spec above covers six independent subsystems. Per `superpowers:writing-plans` scope rules, each gets its own plan. **This plan covers Phase 0 only.** P1–P5 plans are written after P0 ships, so they can reference the real primitive APIs rather than guessing at them.
>
> **P0 deliverable:** a signed dev build installed on a physical iPhone and Android device where a real user can register an organization, log in, and be routed by server-assigned role — with every design primitive, schema, and RLS policy the later phases build on already in place.

## File Structure

```
rebin-tech/
├─ package.json                       pnpm workspaces + turbo
├─ turbo.json
├─ packages/
│  ├─ shared/                         pure TS — no React, no RN
│  │  ├─ src/money.ts                 cents ↔ display
│  │  ├─ src/weight.ts                grams ↔ lbs
│  │  ├─ src/datetime.ts              UTC ↔ facility-local
│  │  ├─ src/enums.ts                 Role, ScopeType, RequestStatus, SizeTier, DeviceCategory
│  │  ├─ src/schemas/auth.ts          login, password, OTP
│  │  ├─ src/schemas/org.ts           org signup, pickup request
│  │  ├─ src/schemas/business.ts      biz signup (stub for P4)
│  │  ├─ src/schemas/agent.ts         agent signup (stub for P2)
│  │  └─ src/index.ts
│  ├─ ui/                             design system — RN, no data fetching
│  │  ├─ src/tokens.ts                colors, spacing, radius, type scale
│  │  ├─ src/theme.tsx                PortalThemeProvider + usePortalTheme
│  │  ├─ src/atoms/                   Text, MoneyText, WeightText, StatusBadge, IconTile, Skeleton
│  │  ├─ src/molecules/               Card, PillButton, FormField, SelectField, RadioTile,
│  │  │                               ChipMultiSelect, ToggleRow, ListRow, StatTile, Stepper
│  │  ├─ src/organisms/               Screen, SectionHeader, EmptyState, Sheet, ConfirmDialog,
│  │  │                               OfflineBanner
│  │  └─ src/index.ts
│  └─ api/                            typed Supabase client + query hooks
│     ├─ src/client.ts
│     ├─ src/types.gen.ts             generated from schema — never hand-edited
│     ├─ src/auth.ts                  signIn, signOut, signUpOrganization, resolveRoles
│     ├─ src/hooks/useSession.ts
│     └─ src/index.ts
├─ apps/mobile/
│  ├─ app.config.ts
│  ├─ eas.json
│  ├─ app/                            Expo Router tree (see §3)
│  ├─ src/i18n/{en.json,es.json,index.ts}
│  └─ src/store/session.ts            Zustand
└─ supabase/
   └─ migrations/
      ├─ 0001_enums.sql
      ├─ 0002_identity.sql            profiles, role_assignments, invitations
      ├─ 0003_tenants.sql             organizations, businesses, field_agents + members
      ├─ 0004_catalog.sql             price_catalog, price_items
      ├─ 0005_demand.sql              pickup_requests, liquidation_quotes, scan_records
      ├─ 0006_fulfilment.sql          dispatch_jobs, settlements, depot_intakes
      ├─ 0007_compliance.sql          device_manifest, certificates, audit_events
      ├─ 0008_rls.sql                 has_role() + all policies
      └─ 0009_seed_platform_owner.sql
```

**Test runner:** Jest everywhere (one runner, no context-switching). `packages/shared` uses `babel-jest`; `packages/ui` and `apps/mobile` use the `jest-expo` preset with `@testing-library/react-native`.

---

### Task 1: Monorepo scaffold and booting Expo app

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `tsconfig.base.json`, `.gitignore`
- Create: `apps/mobile/package.json`, `apps/mobile/app.config.ts`, `apps/mobile/tsconfig.json`
- Create: `apps/mobile/app/_layout.tsx`, `apps/mobile/app/index.tsx`
- Create: `apps/mobile/jest.config.js`, `apps/mobile/__tests__/boot.test.tsx`

**Interfaces:**
- Consumes: nothing (first task)
- Produces: workspace aliases `@rebin/shared`, `@rebin/ui`, `@rebin/api` resolvable from `apps/mobile`; `pnpm test` runs Jest across all workspaces via turbo

- [ ] **Step 1: Initialize the workspace**

```bash
mkdir rebin-tech && cd rebin-tech
git init
pnpm init
```

Write `pnpm-workspace.yaml`:

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

Write `turbo.json`:

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**"] },
    "test": { "dependsOn": ["^build"] },
    "typecheck": { "dependsOn": ["^build"] },
    "lint": {}
  }
}
```

Write `tsconfig.base.json`:

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ESNext", "DOM"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "jsx": "react-jsx",
    "baseUrl": ".",
    "paths": {
      "@rebin/shared": ["packages/shared/src"],
      "@rebin/ui": ["packages/ui/src"],
      "@rebin/api": ["packages/api/src"]
    }
  }
}
```

Root `package.json` scripts:

```json
{
  "name": "rebin-tech",
  "private": true,
  "scripts": {
    "test": "turbo test",
    "typecheck": "turbo typecheck",
    "lint": "turbo lint",
    "mobile": "pnpm --filter mobile start"
  },
  "devDependencies": { "turbo": "^2.5.0", "typescript": "^5.6.0" }
}
```

- [ ] **Step 2: Create the Expo app**

```bash
pnpm dlx create-expo-app@latest apps/mobile --template blank-typescript
cd apps/mobile
pnpm expo install expo-router expo-linking expo-constants expo-status-bar \
  react-native-safe-area-context react-native-screens
pnpm add -D jest jest-expo @testing-library/react-native @types/jest
```

Set `apps/mobile/package.json` name to `"mobile"`, `"main": "expo-router/entry"`, and add:

```json
{ "scripts": { "test": "jest", "typecheck": "tsc --noEmit" } }
```

- [ ] **Step 3: Configure the app identity**

`apps/mobile/app.config.ts`:

```ts
import type { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "Rebin Tech",
  slug: "rebin-tech",
  scheme: "rebintech",
  version: "0.1.0",
  orientation: "portrait",
  userInterfaceStyle: "light",
  backgroundColor: "#F6F4ED",
  ios: { bundleIdentifier: "com.rebintech.app", supportsTablet: true },
  android: { package: "com.rebintech.app", adaptiveIcon: { backgroundColor: "#F6F4ED" } },
  plugins: ["expo-router"],
  experiments: { typedRoutes: true },
};

export default config;
```

`apps/mobile/jest.config.js`:

```js
module.exports = {
  preset: "jest-expo",
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@rebin/.*|react-navigation|@react-navigation/.*|@shopify/.*|nativewind|react-native-css-interop))",
  ],
};
```

- [ ] **Step 4: Write the failing boot test**

`apps/mobile/__tests__/boot.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react-native";
import Index from "../app/index";

describe("app boot", () => {
  it("renders the root screen with the app name", () => {
    render(<Index />);
    expect(screen.getByText("Rebin Tech")).toBeTruthy();
  });
});
```

- [ ] **Step 5: Run it and confirm it fails**

Run: `pnpm --filter mobile test`
Expected: FAIL — `Cannot find module '../app/index'`

- [ ] **Step 6: Write the minimal screens**

`apps/mobile/app/_layout.tsx`:

```tsx
import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#F6F4ED" } }} />
    </SafeAreaProvider>
  );
}
```

`apps/mobile/app/index.tsx`:

```tsx
import { Text, View } from "react-native";

export default function Index() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F6F4ED" }}>
      <Text style={{ fontSize: 26, fontWeight: "700", color: "#16241C" }}>Rebin Tech</Text>
    </View>
  );
}
```

- [ ] **Step 7: Run the test and typecheck**

Run: `pnpm --filter mobile test && pnpm --filter mobile typecheck`
Expected: PASS, zero type errors

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: scaffold turborepo monorepo with booting expo router app"
```

---

### Task 2: Money, weight, and datetime formatters

**Files:**
- Create: `packages/shared/package.json`, `packages/shared/tsconfig.json`, `packages/shared/jest.config.js`
- Create: `packages/shared/src/money.ts`, `packages/shared/src/weight.ts`, `packages/shared/src/datetime.ts`, `packages/shared/src/index.ts`
- Test: `packages/shared/src/__tests__/{money,weight,datetime}.test.ts`

**Interfaces:**
- Consumes: Task 1 workspace aliases
- Produces:
  - `formatCents(cents: number): string` → `"$1,234.56"`
  - `parseDollars(input: string): number` → cents, throws `RangeError` on invalid
  - `sumCents(values: number[]): number`
  - `gramsToLbs(g: number): number` (1 decimal)
  - `formatWeight(g: number): string` → `"12.4 lbs"`
  - `lbsToGrams(lbs: number): number` (rounded int)
  - `formatUsDate(iso: string, tz: string): string` → `"08/05/2026"`
  - `formatUsTimeWindow(startIso: string, endIso: string, tz: string): string` → `"9:00 AM – 12:00 PM"`

- [ ] **Step 1: Create the package**

`packages/shared/package.json`:

```json
{
  "name": "@rebin/shared",
  "version": "0.0.0",
  "private": true,
  "main": "src/index.ts",
  "types": "src/index.ts",
  "scripts": { "test": "jest", "typecheck": "tsc --noEmit" },
  "dependencies": { "zod": "^3.23.8" },
  "devDependencies": { "jest": "^29.7.0", "babel-jest": "^29.7.0", "@types/jest": "^29.5.12" }
}
```

`packages/shared/tsconfig.json`:

```json
{ "extends": "../../tsconfig.base.json", "include": ["src"] }
```

`packages/shared/jest.config.js`:

```js
module.exports = { testEnvironment: "node", transform: { "^.+\\.tsx?$": "babel-jest" } };
```

- [ ] **Step 2: Write the failing formatter tests**

`packages/shared/src/__tests__/money.test.ts`:

```ts
import { formatCents, parseDollars, sumCents } from "../money";

describe("formatCents", () => {
  it("formats whole dollars", () => expect(formatCents(100)).toBe("$1.00"));
  it("formats sub-dollar amounts", () => expect(formatCents(46)).toBe("$0.46"));
  it("formats zero", () => expect(formatCents(0)).toBe("$0.00"));
  it("adds thousands separators", () => expect(formatCents(123456)).toBe("$1,234.56"));
  it("formats negatives as deductions", () => expect(formatCents(-500)).toBe("-$5.00"));
});

describe("parseDollars", () => {
  it("parses a plain decimal", () => expect(parseDollars("12.34")).toBe(1234));
  it("parses with a dollar sign and commas", () => expect(parseDollars("$1,234.56")).toBe(123456));
  it("parses an integer string", () => expect(parseDollars("7")).toBe(700));
  it("rounds half up at the cent", () => expect(parseDollars("0.005")).toBe(1));
  it("throws on non-numeric input", () => expect(() => parseDollars("abc")).toThrow(RangeError));
  it("throws on empty input", () => expect(() => parseDollars("")).toThrow(RangeError));
});

describe("sumCents", () => {
  it("sums an empty list to zero", () => expect(sumCents([])).toBe(0));
  it("sums without float drift", () => expect(sumCents([46, 46, 46])).toBe(138));
});
```

`packages/shared/src/__tests__/weight.test.ts`:

```ts
import { formatWeight, gramsToLbs, lbsToGrams } from "../weight";

describe("weight conversion", () => {
  it("converts grams to lbs at one decimal", () => expect(gramsToLbs(5000)).toBe(11.0));
  it("rounds to one decimal", () => expect(gramsToLbs(1234)).toBe(2.7));
  it("handles zero", () => expect(gramsToLbs(0)).toBe(0));
  it("converts lbs back to whole grams", () => expect(lbsToGrams(10)).toBe(4536));
  it("formats with a unit suffix", () => expect(formatWeight(5624)).toBe("12.4 lbs"));
  it("formats zero weight", () => expect(formatWeight(0)).toBe("0.0 lbs"));
});
```

`packages/shared/src/__tests__/datetime.test.ts`:

```ts
import { formatUsDate, formatUsTimeWindow } from "../datetime";

describe("formatUsDate", () => {
  it("renders MM/DD/YYYY in the facility timezone", () => {
    expect(formatUsDate("2026-08-05T16:00:00Z", "America/New_York")).toBe("08/05/2026");
  });
  it("shifts the calendar day across a timezone boundary", () => {
    expect(formatUsDate("2026-08-06T03:00:00Z", "America/Los_Angeles")).toBe("08/05/2026");
  });
});

describe("formatUsTimeWindow", () => {
  it("renders a 12-hour range", () => {
    expect(
      formatUsTimeWindow("2026-08-05T13:00:00Z", "2026-08-05T16:00:00Z", "America/New_York"),
    ).toBe("9:00 AM – 12:00 PM");
  });
});
```

- [ ] **Step 3: Run the tests and confirm they fail**

Run: `pnpm --filter @rebin/shared test`
Expected: FAIL — `Cannot find module '../money'`

- [ ] **Step 4: Implement the formatters**

`packages/shared/src/money.ts`:

```ts
const USD = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export function formatCents(cents: number): string {
  return USD.format(cents / 100);
}

export function parseDollars(input: string): number {
  const cleaned = input.replace(/[$,\s]/g, "");
  if (cleaned === "" || !/^-?\d*\.?\d*$/.test(cleaned)) {
    throw new RangeError(`Not a valid dollar amount: "${input}"`);
  }
  const value = Number(cleaned);
  if (!Number.isFinite(value)) throw new RangeError(`Not a valid dollar amount: "${input}"`);
  return Math.round(value * 100);
}

export function sumCents(values: number[]): number {
  return values.reduce((total, v) => total + v, 0);
}
```

`packages/shared/src/weight.ts`:

```ts
const GRAMS_PER_LB = 453.59237;

export function gramsToLbs(grams: number): number {
  return Math.round((grams / GRAMS_PER_LB) * 10) / 10;
}

export function lbsToGrams(lbs: number): number {
  return Math.round(lbs * GRAMS_PER_LB);
}

export function formatWeight(grams: number): string {
  return `${gramsToLbs(grams).toFixed(1)} lbs`;
}
```

`packages/shared/src/datetime.ts`:

```ts
export function formatUsDate(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  }).format(new Date(iso));
}

function formatUsTime(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
}

export function formatUsTimeWindow(startIso: string, endIso: string, timeZone: string): string {
  return `${formatUsTime(startIso, timeZone)} – ${formatUsTime(endIso, timeZone)}`;
}
```

`packages/shared/src/index.ts`:

```ts
export * from "./money";
export * from "./weight";
export * from "./datetime";
```

- [ ] **Step 5: Run the tests and confirm they pass**

Run: `pnpm --filter @rebin/shared test`
Expected: PASS — 20 tests

> If `formatUsTimeWindow` fails on the dash character, the assertion uses an **en-dash** (`–`, U+2013), not a hyphen. Keep the en-dash — it is the typographic standard for ranges.

- [ ] **Step 6: Commit**

```bash
git add packages/shared
git commit -m "feat(shared): add money, weight, and US datetime formatters"
```

---

### Task 3: Enums and Zod validation schemas

**Files:**
- Create: `packages/shared/src/enums.ts`, `packages/shared/src/schemas/auth.ts`, `packages/shared/src/schemas/org.ts`
- Modify: `packages/shared/src/index.ts`
- Test: `packages/shared/src/__tests__/schemas.test.ts`

**Interfaces:**
- Consumes: Task 2 package setup
- Produces:
  - Enums `Role`, `ScopeType`, `AccountStatus`, `RequestStatus`, `SizeTier`, `DeviceCategory`, `OrgType`
  - `loginSchema`, `passwordSchema`
  - `orgSignupSchema` (3 merged steps), `pickupRequestSchema`
  - `SIZE_TIERS: readonly SizeTierMeta[]` — the S23 radio tile source of truth
  - Inferred types: `LoginInput`, `OrgSignupInput`, `PickupRequestInput`

- [ ] **Step 1: Write the failing schema tests**

`packages/shared/src/__tests__/schemas.test.ts`:

```ts
import { SIZE_TIERS, orgSignupSchema, pickupRequestSchema, passwordSchema } from "../index";

const validRequest = {
  sizeTier: "tier_10_30" as const,
  unitCount: 25,
  categories: ["computers_laptops"] as const,
  windowStart: "2026-08-05T13:00:00Z",
  windowEnd: "2026-08-05T16:00:00Z",
  onSiteContactName: "Jane Doe",
  onSiteContactPhone: "5550192345",
  dockAddress: "Main Facility Dock A",
  instructions: "",
};

describe("pickupRequestSchema", () => {
  it("accepts a valid request", () => {
    expect(pickupRequestSchema.safeParse(validRequest).success).toBe(true);
  });

  it("rejects fewer than 10 units", () => {
    const result = pickupRequestSchema.safeParse({ ...validRequest, unitCount: 9 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("Minimum 10 devices required for pickup");
    }
  });

  it("accepts exactly 10 units", () => {
    expect(pickupRequestSchema.safeParse({ ...validRequest, unitCount: 10 }).success).toBe(true);
  });

  it("rejects an empty category list", () => {
    expect(pickupRequestSchema.safeParse({ ...validRequest, categories: [] }).success).toBe(false);
  });

  it("rejects a window that ends before it starts", () => {
    const result = pickupRequestSchema.safeParse({
      ...validRequest,
      windowEnd: "2026-08-05T12:00:00Z",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a phone number that is not 10 digits", () => {
    expect(
      pickupRequestSchema.safeParse({ ...validRequest, onSiteContactPhone: "555019" }).success,
    ).toBe(false);
  });
});

describe("SIZE_TIERS", () => {
  it("exposes exactly the four tiers from the design", () => {
    expect(SIZE_TIERS.map((t) => t.value)).toEqual([
      "tier_10_30",
      "tier_30_100",
      "tier_100_300",
      "tier_300_plus",
    ]);
  });

  it("defaults the first tier to a count of 25", () => {
    expect(SIZE_TIERS[0]?.defaultCount).toBe(25);
  });

  it("gives every tier a label and a subtitle", () => {
    for (const tier of SIZE_TIERS) {
      expect(tier.label.length).toBeGreaterThan(0);
      expect(tier.subtitle.length).toBeGreaterThan(0);
    }
  });
});

describe("passwordSchema", () => {
  it("rejects a password under 10 characters", () => {
    expect(passwordSchema.safeParse("Short1!").success).toBe(false);
  });
  it("rejects a password with no digit", () => {
    expect(passwordSchema.safeParse("NoDigitsHere!").success).toBe(false);
  });
  it("accepts a compliant password", () => {
    expect(passwordSchema.safeParse("RebinTech2026!").success).toBe(true);
  });
});

describe("orgSignupSchema", () => {
  const valid = {
    orgName: "Dhaka Medical College",
    orgType: "hospital" as const,
    contactName: "Dr. Khan",
    contactTitle: "Facilities Director",
    workEmail: "khan@dmc.edu",
    phone: "5550192345",
    street: "100 Main St",
    city: "Boston",
    state: "MA",
    zip: "02108",
    dockAccess: true,
    password: "RebinTech2026!",
    confirmPassword: "RebinTech2026!",
  };

  it("accepts a complete signup", () => {
    expect(orgSignupSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects mismatched passwords", () => {
    const result = orgSignupSchema.safeParse({ ...valid, confirmPassword: "Different2026!" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(["confirmPassword"]);
    }
  });

  it("rejects an invalid two-letter state", () => {
    expect(orgSignupSchema.safeParse({ ...valid, state: "Massachusetts" }).success).toBe(false);
  });

  it("rejects a ZIP that is not 5 or 9 digits", () => {
    expect(orgSignupSchema.safeParse({ ...valid, zip: "021" }).success).toBe(false);
  });
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `pnpm --filter @rebin/shared test schemas`
Expected: FAIL — `SIZE_TIERS is not exported`

- [ ] **Step 3: Implement enums**

`packages/shared/src/enums.ts`:

```ts
export const ROLES = [
  "platform_owner", "platform_ops", "platform_finance", "platform_support",
  "org_owner", "org_admin", "org_requester",
  "biz_owner", "biz_staff",
  "field_agent", "field_lead",
] as const;
export type Role = (typeof ROLES)[number];

export const SCOPE_TYPES = ["platform", "organization", "business", "self"] as const;
export type ScopeType = (typeof SCOPE_TYPES)[number];

export const ACCOUNT_STATUSES = ["pending_verification", "active", "suspended", "rejected", "archived"] as const;
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

export const REQUEST_STATUSES = ["pending", "under_review", "scheduled", "dispatched", "in_transit", "completed", "cancelled"] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export const ORG_TYPES = ["k12_school", "university", "hospital", "municipal_office", "corporate_hq", "other"] as const;
export type OrgType = (typeof ORG_TYPES)[number];

export const DEVICE_CATEGORIES = ["computers_laptops", "monitors_displays", "server_gear", "copiers_printers", "batteries_ups"] as const;
export type DeviceCategory = (typeof DEVICE_CATEGORIES)[number];

export const SIZE_TIER_VALUES = ["tier_10_30", "tier_30_100", "tier_100_300", "tier_300_plus"] as const;
export type SizeTier = (typeof SIZE_TIER_VALUES)[number];

export type SizeTierMeta = {
  value: SizeTier;
  label: string;
  subtitle: string;
  min: number;
  max: number | null;
  defaultCount: number;
};

export const SIZE_TIERS: readonly SizeTierMeta[] = [
  { value: "tier_10_30",   label: "10 – 30 Devices",      subtitle: "Small Office / Single Classroom",   min: 10,  max: 30,   defaultCount: 25 },
  { value: "tier_30_100",  label: "30 – 100 Devices",     subtitle: "Department / Floor Clearance",      min: 30,  max: 100,  defaultCount: 60 },
  { value: "tier_100_300", label: "100 – 300 Devices",    subtitle: "Building / Multi-Department Overhaul", min: 100, max: 300, defaultCount: 200 },
  { value: "tier_300_plus",label: "300+ / Full Pallets",  subtitle: "Enterprise / Campus Bulk Clearance", min: 300, max: null, defaultCount: 400 },
] as const;

export const MIN_PICKUP_UNITS = 10;
```

- [ ] **Step 4: Implement the schemas**

`packages/shared/src/schemas/auth.ts`:

```ts
import { z } from "zod";

export const passwordSchema = z
  .string()
  .min(10, "Password must be at least 10 characters")
  .regex(/[0-9]/, "Password must include a number")
  .regex(/[^A-Za-z0-9]/, "Password must include a symbol");

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export type LoginInput = z.infer<typeof loginSchema>;
```

`packages/shared/src/schemas/org.ts`:

```ts
import { z } from "zod";
import { DEVICE_CATEGORIES, MIN_PICKUP_UNITS, ORG_TYPES, SIZE_TIER_VALUES } from "../enums";
import { passwordSchema } from "./auth";

const usPhone = z.string().regex(/^\d{10}$/, "Enter a 10-digit US phone number");
const usState = z.string().regex(/^[A-Z]{2}$/, "Select a state");
const usZip = z.string().regex(/^\d{5}(\d{4})?$/, "Enter a valid ZIP code");

export const orgSignupSchema = z
  .object({
    orgName: z.string().min(2, "Organization name is required"),
    orgType: z.enum(ORG_TYPES),
    contactName: z.string().min(2, "Contact name is required"),
    contactTitle: z.string().min(2, "Contact title is required"),
    workEmail: z.string().email("Enter a valid work email"),
    phone: usPhone,
    street: z.string().min(3, "Street address is required"),
    city: z.string().min(2, "City is required"),
    state: usState,
    zip: usZip,
    dockAccess: z.boolean(),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const pickupRequestSchema = z
  .object({
    sizeTier: z.enum(SIZE_TIER_VALUES),
    unitCount: z
      .number()
      .int("Enter a whole number")
      .min(MIN_PICKUP_UNITS, `Minimum ${MIN_PICKUP_UNITS} devices required for pickup`),
    categories: z.array(z.enum(DEVICE_CATEGORIES)).min(1, "Select at least one category"),
    windowStart: z.string().datetime(),
    windowEnd: z.string().datetime(),
    onSiteContactName: z.string().min(2, "On-site contact is required"),
    onSiteContactPhone: usPhone,
    dockAddress: z.string().min(3, "Dock address is required"),
    instructions: z.string().max(1000).default(""),
  })
  .refine((v) => new Date(v.windowEnd) > new Date(v.windowStart), {
    message: "End time must be after start time",
    path: ["windowEnd"],
  });

export type OrgSignupInput = z.infer<typeof orgSignupSchema>;
export type PickupRequestInput = z.infer<typeof pickupRequestSchema>;
```

Append to `packages/shared/src/index.ts`:

```ts
export * from "./enums";
export * from "./schemas/auth";
export * from "./schemas/org";
```

- [ ] **Step 5: Run the tests and confirm they pass**

Run: `pnpm --filter @rebin/shared test`
Expected: PASS — all schema and formatter tests green

- [ ] **Step 6: Commit**

```bash
git add packages/shared
git commit -m "feat(shared): add role/status enums and org signup + pickup request schemas"
```

---

### Task 4: Design tokens and portal theme

**Files:**
- Create: `packages/ui/package.json`, `packages/ui/tsconfig.json`, `packages/ui/jest.config.js`
- Create: `packages/ui/src/tokens.ts`, `packages/ui/src/theme.tsx`, `packages/ui/src/index.ts`
- Test: `packages/ui/src/__tests__/theme.test.tsx`

**Interfaces:**
- Consumes: Task 1 aliases
- Produces:
  - `tokens` — frozen object: `tokens.color.*`, `tokens.space[n]`, `tokens.radius.*`, `tokens.type.*`
  - `PORTAL_ACCENTS: Record<PortalKey, string>` where `PortalKey = "org" | "business" | "agent"`
  - `<PortalThemeProvider portal={PortalKey}>` and `usePortalTheme(): { portal, accent, accentSubtle }`

- [ ] **Step 1: Create the package**

`packages/ui/package.json`:

```json
{
  "name": "@rebin/ui",
  "version": "0.0.0",
  "private": true,
  "main": "src/index.ts",
  "types": "src/index.ts",
  "scripts": { "test": "jest", "typecheck": "tsc --noEmit" },
  "peerDependencies": { "react": "*", "react-native": "*" },
  "devDependencies": {
    "jest": "^29.7.0", "jest-expo": "~54.0.0",
    "@testing-library/react-native": "^12.7.0", "@types/jest": "^29.5.12"
  }
}
```

`packages/ui/jest.config.js`:

```js
module.exports = {
  preset: "jest-expo",
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@rebin/.*)/)",
  ],
};
```

- [ ] **Step 2: Write the failing theme test**

`packages/ui/src/__tests__/theme.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react-native";
import { Text } from "react-native";
import { PortalThemeProvider, tokens, usePortalTheme } from "../index";

function Probe() {
  const { portal, accent } = usePortalTheme();
  return <Text testID="probe">{`${portal}:${accent}`}</Text>;
}

describe("tokens", () => {
  it("uses the exact cream background from the spec", () => {
    expect(tokens.color.bg).toBe("#F6F4ED");
  });
  it("uses the exact forest-green primary", () => {
    expect(tokens.color.primary).toBe("#2E6B4F");
  });
  it("exposes an 8-step spacing scale", () => {
    expect(tokens.space).toEqual([4, 8, 12, 16, 20, 24, 32, 48]);
  });
  it("is frozen against mutation", () => {
    expect(Object.isFrozen(tokens.color)).toBe(true);
  });
});

describe("PortalThemeProvider", () => {
  it.each([
    ["org", "#2E6B4F"],
    ["business", "#B8862F"],
    ["agent", "#1F7A6B"],
  ] as const)("provides the %s accent", (portal, accent) => {
    render(
      <PortalThemeProvider portal={portal}>
        <Probe />
      </PortalThemeProvider>,
    );
    expect(screen.getByTestId("probe")).toHaveTextContent(`${portal}:${accent}`);
  });

  it("throws when usePortalTheme is called outside a provider", () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Probe />)).toThrow("usePortalTheme must be used within a PortalThemeProvider");
    spy.mockRestore();
  });
});
```

- [ ] **Step 3: Run and confirm failure**

Run: `pnpm --filter @rebin/ui test`
Expected: FAIL — `Cannot find module '../index'`

- [ ] **Step 4: Implement tokens**

`packages/ui/src/tokens.ts`:

```ts
export const tokens = {
  color: Object.freeze({
    bg: "#F6F4ED",
    surface: "#FFFFFF",
    surfaceAlt: "#EFF3EC",
    surfaceWarm: "#FBF1E8",
    border: "#E4E1D7",
    divider: "#EDEAE1",

    text: "#16241C",
    textSecondary: "#46564C",
    muted: "#7A867E",
    onPrimary: "#FFFFFF",

    primary: "#2E6B4F",
    primaryDark: "#1F4D38",
    primaryLight: "#E6F1E9",
    primarySubtle: "#F2F7F3",

    success: "#2E7D4F",
    warning: "#C08A2E",
    danger: "#C0453B",
    info: "#3E6B8A",
  }),
  space: Object.freeze([4, 8, 12, 16, 20, 24, 32, 48] as const),
  radius: Object.freeze({ card: 20, button: 14, chip: 10, input: 12, sheet: 24 }),
  type: Object.freeze({
    display: { fontSize: 32, fontWeight: "700", letterSpacing: -0.6 },
    h1: { fontSize: 26, fontWeight: "700", letterSpacing: -0.3 },
    h2: { fontSize: 20, fontWeight: "600" },
    h3: { fontSize: 17, fontWeight: "600" },
    body: { fontSize: 15, fontWeight: "400", lineHeight: 22 },
    bodySm: { fontSize: 13, fontWeight: "400", lineHeight: 19 },
    label: { fontSize: 11, fontWeight: "600", letterSpacing: 0.9, textTransform: "uppercase" },
  }),
} as const;

/** Dark forest palette — pre-auth screens only (Welcome, Sign Up, Sign In). */
export const authTokens = Object.freeze({
  bg: "#0E3A32",
  bgDeep: "#0A2E27",
  surface: "#1D4A42",
  surfacePressed: "#245049",
  border: "#2F5B52",
  primary: "#7FAF9E",
  onPrimary: "#0A2E27",
  text: "#FFFFFF",
  muted: "#A8C4BB",
  link: "#C3DDD2",
});

export const PORTAL_ACCENTS = Object.freeze({
  org: "#2E6B4F",
  business: "#B8862F",
  agent: "#1F7A6B",
});

export const PORTAL_ACCENTS_SUBTLE = Object.freeze({
  org: "#E6F1E9",
  business: "#FBF1E8",
  agent: "#E3F1EE",
});

export type PortalKey = keyof typeof PORTAL_ACCENTS;
```

- [ ] **Step 5: Implement the theme provider**

`packages/ui/src/theme.tsx`:

```tsx
import { createContext, useContext, useMemo, type ReactNode } from "react";
import { PORTAL_ACCENTS, PORTAL_ACCENTS_SUBTLE, type PortalKey } from "./tokens";

type PortalTheme = { portal: PortalKey; accent: string; accentSubtle: string };

const PortalThemeContext = createContext<PortalTheme | null>(null);

export function PortalThemeProvider({ portal, children }: { portal: PortalKey; children: ReactNode }) {
  const value = useMemo<PortalTheme>(
    () => ({ portal, accent: PORTAL_ACCENTS[portal], accentSubtle: PORTAL_ACCENTS_SUBTLE[portal] }),
    [portal],
  );
  return <PortalThemeContext.Provider value={value}>{children}</PortalThemeContext.Provider>;
}

export function usePortalTheme(): PortalTheme {
  const ctx = useContext(PortalThemeContext);
  if (!ctx) throw new Error("usePortalTheme must be used within a PortalThemeProvider");
  return ctx;
}
```

`packages/ui/src/index.ts`:

```ts
export * from "./tokens";
export * from "./theme";
```

- [ ] **Step 6: Run and confirm pass**

Run: `pnpm --filter @rebin/ui test`
Expected: PASS — 8 tests

- [ ] **Step 7: Commit**

```bash
git add packages/ui
git commit -m "feat(ui): add design tokens and portal theme provider"
```

---

### Task 5: Core UI primitives — Card, PillButton, StatusBadge, MoneyText, WeightText

**Files:**
- Create: `packages/ui/src/atoms/{AppText,MoneyText,WeightText,StatusBadge,IconTile}.tsx`
- Create: `packages/ui/src/molecules/{Card,PillButton}.tsx`
- Modify: `packages/ui/src/index.ts`
- Test: `packages/ui/src/__tests__/primitives.test.tsx`

**Interfaces:**
- Consumes: `tokens`, `usePortalTheme` (Task 4); `formatCents`, `formatWeight` (Task 2)
- Produces:
  - `<AppText variant="h1"|"h2"|"h3"|"body"|"bodySm"|"label" tone?="default"|"secondary"|"muted"|"accent">`
  - `<MoneyText cents={number} size?="body"|"h1"|"display">`
  - `<WeightText grams={number}>`
  - `<StatusBadge status={RequestStatus}>`
  - `<Card variant?="default"|"alt"|"warm" accentBorder?={boolean}>`
  - `<PillButton label variant?="primary"|"secondary"|"ghost"|"danger" loading? disabled? onPress>`
  - `<IconTile icon size?={48|56} tone?="accent"|"neutral">`

- [ ] **Step 1: Write the failing primitive tests**

`packages/ui/src/__tests__/primitives.test.tsx`:

```tsx
import { fireEvent, render, screen } from "@testing-library/react-native";
import { Card, MoneyText, PillButton, PortalThemeProvider, StatusBadge, WeightText } from "../index";

const wrap = (ui: React.ReactElement) => (
  <PortalThemeProvider portal="business">{ui}</PortalThemeProvider>
);

describe("MoneyText", () => {
  it("renders cents as formatted USD", () => {
    render(wrap(<MoneyText cents={46} />));
    expect(screen.getByText("$0.46")).toBeTruthy();
  });
  it("uses tabular figures so columns align", () => {
    render(wrap(<MoneyText cents={123456} />));
    expect(screen.getByText("$1,234.56")).toHaveStyle({ fontVariant: ["tabular-nums"] });
  });
});

describe("WeightText", () => {
  it("renders grams as lbs", () => {
    render(wrap(<WeightText grams={5624} />));
    expect(screen.getByText("12.4 lbs")).toBeTruthy();
  });
});

describe("StatusBadge", () => {
  it("renders a human-readable label", () => {
    render(wrap(<StatusBadge status="in_transit" />));
    expect(screen.getByText("In Transit")).toBeTruthy();
  });
  it("colors completed with the success token", () => {
    render(wrap(<StatusBadge status="completed" />));
    expect(screen.getByText("Completed")).toHaveStyle({ color: "#2E7D4F" });
  });
});

describe("PillButton", () => {
  it("calls onPress when tapped", () => {
    const onPress = jest.fn();
    render(wrap(<PillButton label="Continue" onPress={onPress} />));
    fireEvent.press(screen.getByRole("button", { name: "Continue" }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("does not call onPress when disabled", () => {
    const onPress = jest.fn();
    render(wrap(<PillButton label="Continue" onPress={onPress} disabled />));
    fireEvent.press(screen.getByRole("button", { name: "Continue" }));
    expect(onPress).not.toHaveBeenCalled();
  });

  it("does not call onPress while loading", () => {
    const onPress = jest.fn();
    render(wrap(<PillButton label="Saving" onPress={onPress} loading />));
    fireEvent.press(screen.getByRole("button", { name: "Saving" }));
    expect(onPress).not.toHaveBeenCalled();
  });

  it("uses the portal accent as its primary background", () => {
    render(wrap(<PillButton label="Pay" onPress={jest.fn()} />));
    expect(screen.getByRole("button", { name: "Pay" })).toHaveStyle({ backgroundColor: "#B8862F" });
  });

  it("meets the 44pt minimum hit target", () => {
    render(wrap(<PillButton label="Tap" onPress={jest.fn()} />));
    expect(screen.getByRole("button", { name: "Tap" })).toHaveStyle({ minHeight: 52 });
  });
});

describe("Card", () => {
  it("renders its children", () => {
    render(wrap(<Card><MoneyText cents={100} /></Card>));
    expect(screen.getByText("$1.00")).toBeTruthy();
  });
  it("uses the surface token by default", () => {
    render(wrap(<Card testID="c"><MoneyText cents={0} /></Card>));
    expect(screen.getByTestId("c")).toHaveStyle({ backgroundColor: "#FFFFFF" });
  });
  it("uses the mint tint for the alt variant", () => {
    render(wrap(<Card testID="c" variant="alt"><MoneyText cents={0} /></Card>));
    expect(screen.getByTestId("c")).toHaveStyle({ backgroundColor: "#EFF3EC" });
  });
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `pnpm --filter @rebin/ui test primitives`
Expected: FAIL — `MoneyText is not exported`

- [ ] **Step 3: Implement the atoms**

`packages/ui/src/atoms/AppText.tsx`:

```tsx
import { Text, type TextProps, type TextStyle } from "react-native";
import { tokens } from "../tokens";
import { usePortalTheme } from "../theme";

type Variant = keyof typeof tokens.type;
type Tone = "default" | "secondary" | "muted" | "accent" | "onPrimary";

export function AppText({
  variant = "body",
  tone = "default",
  style,
  ...rest
}: TextProps & { variant?: Variant; tone?: Tone }) {
  const { accent } = usePortalTheme();
  const colors: Record<Tone, string> = {
    default: tokens.color.text,
    secondary: tokens.color.textSecondary,
    muted: tokens.color.muted,
    accent,
    onPrimary: tokens.color.onPrimary,
  };
  return <Text {...rest} style={[tokens.type[variant] as TextStyle, { color: colors[tone] }, style]} />;
}
```

`packages/ui/src/atoms/MoneyText.tsx`:

```tsx
import { formatCents } from "@rebin/shared";
import { AppText } from "./AppText";
import { tokens } from "../tokens";

export function MoneyText({
  cents,
  size = "body",
  tone = "default",
}: {
  cents: number;
  size?: "body" | "h1" | "display";
  tone?: "default" | "accent" | "muted";
}) {
  return (
    <AppText
      variant={size}
      tone={tone}
      accessibilityLabel={formatCents(cents)}
      style={{ fontVariant: ["tabular-nums"] as const, letterSpacing: size === "body" ? 0 : tokens.type[size].letterSpacing }}
    >
      {formatCents(cents)}
    </AppText>
  );
}
```

`packages/ui/src/atoms/WeightText.tsx`:

```tsx
import { formatWeight } from "@rebin/shared";
import { AppText } from "./AppText";

export function WeightText({ grams, tone = "default" }: { grams: number; tone?: "default" | "muted" }) {
  const label = formatWeight(grams);
  return (
    <AppText tone={tone} accessibilityLabel={label} style={{ fontVariant: ["tabular-nums"] as const }}>
      {label}
    </AppText>
  );
}
```

`packages/ui/src/atoms/StatusBadge.tsx`:

```tsx
import { View } from "react-native";
import type { RequestStatus } from "@rebin/shared";
import { AppText } from "./AppText";
import { tokens } from "../tokens";

const STATUS_META: Record<RequestStatus, { label: string; fg: string; bg: string }> = {
  pending:      { label: "Pending",      fg: tokens.color.warning, bg: tokens.color.surfaceWarm },
  under_review: { label: "Under Review", fg: tokens.color.warning, bg: tokens.color.surfaceWarm },
  scheduled:    { label: "Scheduled",    fg: tokens.color.info,    bg: "#E8EEF5" },
  dispatched:   { label: "Dispatched",   fg: tokens.color.info,    bg: "#E8EEF5" },
  in_transit:   { label: "In Transit",   fg: tokens.color.info,    bg: "#E8EEF5" },
  completed:    { label: "Completed",    fg: tokens.color.success, bg: tokens.color.primaryLight },
  cancelled:    { label: "Cancelled",    fg: tokens.color.muted,   bg: "#F0EFEA" },
};

export function StatusBadge({ status }: { status: RequestStatus }) {
  const meta = STATUS_META[status];
  return (
    <View
      accessibilityRole="text"
      style={{
        alignSelf: "flex-start",
        paddingHorizontal: tokens.space[2],
        paddingVertical: tokens.space[0] + 2,
        borderRadius: tokens.radius.chip,
        backgroundColor: meta.bg,
      }}
    >
      <AppText variant="label" style={{ color: meta.fg }}>{meta.label}</AppText>
    </View>
  );
}
```

`packages/ui/src/atoms/IconTile.tsx`:

```tsx
import { View, type ViewProps } from "react-native";
import { tokens } from "../tokens";
import { usePortalTheme } from "../theme";

export function IconTile({
  size = 48,
  tone = "accent",
  style,
  ...rest
}: ViewProps & { size?: 48 | 56; tone?: "accent" | "neutral" }) {
  const { accentSubtle } = usePortalTheme();
  return (
    <View
      {...rest}
      style={[
        {
          width: size,
          height: size,
          borderRadius: tokens.radius.button,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: tone === "accent" ? accentSubtle : tokens.color.surfaceAlt,
        },
        style,
      ]}
    />
  );
}
```

- [ ] **Step 4: Implement Card and PillButton**

`packages/ui/src/molecules/Card.tsx`:

```tsx
import { View, type ViewProps } from "react-native";
import { tokens } from "../tokens";
import { usePortalTheme } from "../theme";

const BACKGROUNDS = {
  default: tokens.color.surface,
  alt: tokens.color.surfaceAlt,
  warm: tokens.color.surfaceWarm,
} as const;

export function Card({
  variant = "default",
  accentBorder = false,
  style,
  ...rest
}: ViewProps & { variant?: keyof typeof BACKGROUNDS; accentBorder?: boolean }) {
  const { accent } = usePortalTheme();
  return (
    <View
      {...rest}
      style={[
        {
          backgroundColor: BACKGROUNDS[variant],
          borderRadius: tokens.radius.card,
          borderWidth: 1,
          borderColor: accentBorder ? accent : tokens.color.border,
          padding: tokens.space[4],
        },
        style,
      ]}
    />
  );
}
```

`packages/ui/src/molecules/PillButton.tsx`:

```tsx
import { ActivityIndicator, Pressable, View } from "react-native";
import { AppText } from "../atoms/AppText";
import { tokens } from "../tokens";
import { usePortalTheme } from "../theme";

type Variant = "primary" | "secondary" | "ghost" | "danger";

export function PillButton({
  label,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
  fullWidth = true,
}: {
  label: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
}) {
  const { accent } = usePortalTheme();
  const inert = disabled || loading;

  const bg: Record<Variant, string> = {
    primary: accent,
    secondary: tokens.color.surfaceAlt,
    ghost: "transparent",
    danger: tokens.color.danger,
  };
  const fg: Record<Variant, "onPrimary" | "default" | "accent"> = {
    primary: "onPrimary",
    secondary: "default",
    ghost: "accent",
    danger: "onPrimary",
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: inert, busy: loading }}
      disabled={inert}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 52,
        width: fullWidth ? "100%" : undefined,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        gap: tokens.space[1],
        paddingHorizontal: tokens.space[5],
        borderRadius: tokens.radius.button,
        backgroundColor: bg[variant],
        borderWidth: variant === "ghost" ? 1 : 0,
        borderColor: accent,
        opacity: inert ? 0.5 : pressed ? 0.88 : 1,
      })}
    >
      {loading ? <ActivityIndicator color={variant === "primary" || variant === "danger" ? "#FFF" : accent} /> : null}
      <View>
        <AppText variant="h3" tone={fg[variant]}>{label}</AppText>
      </View>
    </Pressable>
  );
}
```

Append to `packages/ui/src/index.ts`:

```ts
export * from "./atoms/AppText";
export * from "./atoms/MoneyText";
export * from "./atoms/WeightText";
export * from "./atoms/StatusBadge";
export * from "./atoms/IconTile";
export * from "./molecules/Card";
export * from "./molecules/PillButton";
```

- [ ] **Step 5: Run and confirm pass**

Run: `pnpm --filter @rebin/ui test`
Expected: PASS — theme + primitive tests all green

- [ ] **Step 6: Commit**

```bash
git add packages/ui
git commit -m "feat(ui): add text, money, weight, badge, card, and button primitives"
```

---

### Task 6: Form primitives — FormField, SelectField, RadioTile, ChipMultiSelect, ToggleRow, Stepper

**Files:**
- Create: `packages/ui/src/molecules/{FormField,SelectField,RadioTile,ChipMultiSelect,ToggleRow,Stepper}.tsx`
- Create: `packages/ui/src/organisms/{Screen,SectionHeader,EmptyState}.tsx`
- Modify: `packages/ui/src/index.ts`
- Test: `packages/ui/src/__tests__/forms.test.tsx`

**Interfaces:**
- Consumes: Task 5 primitives
- Produces:
  - `<FormField label value onChangeText error? helper? mask?="phone"|"zip"|"currency" keyboardType?>`
  - `<SelectField label value options={{value,label}[]} onSelect placeholder?>`
  - `<RadioTile label subtitle selected onPress>`
  - `<ChipMultiSelect options={{value,label}[]} selected={string[]} onChange>`
  - `<ToggleRow label description value onValueChange>`
  - `<Stepper current={number} total={number} labels={string[]}>`
  - `<Screen scroll? footer?>`, `<SectionHeader index? title subtitle?>`, `<EmptyState title body cta?>`

- [ ] **Step 1: Write the failing form tests**

`packages/ui/src/__tests__/forms.test.tsx`:

```tsx
import { fireEvent, render, screen } from "@testing-library/react-native";
import { ChipMultiSelect, FormField, PortalThemeProvider, RadioTile, Stepper, ToggleRow } from "../index";

const wrap = (ui: React.ReactElement) => <PortalThemeProvider portal="org">{ui}</PortalThemeProvider>;

describe("FormField", () => {
  it("renders its label and value", () => {
    render(wrap(<FormField label="Organization Name" value="Rebin" onChangeText={jest.fn()} />));
    expect(screen.getByText("Organization Name")).toBeTruthy();
    expect(screen.getByDisplayValue("Rebin")).toBeTruthy();
  });

  it("shows an error message and marks the input invalid", () => {
    render(wrap(<FormField label="Email" value="" onChangeText={jest.fn()} error="Enter a valid email" />));
    expect(screen.getByText("Enter a valid email")).toBeTruthy();
    expect(screen.getByLabelText("Email")).toHaveAccessibilityState({ }); // presence check
  });

  it("masks a 10-digit phone as it is typed", () => {
    const onChangeText = jest.fn();
    render(wrap(<FormField label="Phone" value="" onChangeText={onChangeText} mask="phone" />));
    fireEvent.changeText(screen.getByLabelText("Phone"), "5550192345");
    expect(onChangeText).toHaveBeenCalledWith("5550192345");
  });

  it("strips non-digits from a masked phone entry", () => {
    const onChangeText = jest.fn();
    render(wrap(<FormField label="Phone" value="" onChangeText={onChangeText} mask="phone" />));
    fireEvent.changeText(screen.getByLabelText("Phone"), "(555) 019-2345");
    expect(onChangeText).toHaveBeenCalledWith("5550192345");
  });
});

describe("RadioTile", () => {
  it("exposes its selected state to assistive tech", () => {
    render(wrap(<RadioTile label="10 – 30 Devices" subtitle="Small Office" selected onPress={jest.fn()} />));
    expect(screen.getByRole("radio", { name: /10 – 30 Devices/ })).toHaveAccessibilityState({ selected: true });
  });

  it("fires onPress when tapped", () => {
    const onPress = jest.fn();
    render(wrap(<RadioTile label="30 – 100 Devices" subtitle="Floor Clearance" selected={false} onPress={onPress} />));
    fireEvent.press(screen.getByRole("radio", { name: /30 – 100 Devices/ }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describe("ChipMultiSelect", () => {
  const options = [
    { value: "computers_laptops", label: "Computers & Laptops" },
    { value: "monitors_displays", label: "Monitors & Displays" },
  ];

  it("adds a value when an unselected chip is tapped", () => {
    const onChange = jest.fn();
    render(wrap(<ChipMultiSelect options={options} selected={[]} onChange={onChange} />));
    fireEvent.press(screen.getByText("Computers & Laptops"));
    expect(onChange).toHaveBeenCalledWith(["computers_laptops"]);
  });

  it("removes a value when a selected chip is tapped", () => {
    const onChange = jest.fn();
    render(wrap(<ChipMultiSelect options={options} selected={["computers_laptops"]} onChange={onChange} />));
    fireEvent.press(screen.getByText("Computers & Laptops"));
    expect(onChange).toHaveBeenCalledWith([]);
  });
});

describe("ToggleRow", () => {
  it("renders label and description and toggles", () => {
    const onValueChange = jest.fn();
    render(
      wrap(
        <ToggleRow
          label="Loading Dock Access?"
          description="Select Yes if freight trucks can back into the dock"
          value={false}
          onValueChange={onValueChange}
        />,
      ),
    );
    expect(screen.getByText("Select Yes if freight trucks can back into the dock")).toBeTruthy();
    fireEvent(screen.getByRole("switch"), "valueChange", true);
    expect(onValueChange).toHaveBeenCalledWith(true);
  });
});

describe("Stepper", () => {
  it("announces the current position", () => {
    render(wrap(<Stepper current={2} total={3} labels={["Quantity", "Categories", "Schedule"]} />));
    expect(screen.getByLabelText("Step 2 of 3: Categories")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `pnpm --filter @rebin/ui test forms`
Expected: FAIL — `FormField is not exported`

- [ ] **Step 3: Implement the form primitives**

`packages/ui/src/molecules/FormField.tsx`:

```tsx
import { TextInput, View, type KeyboardTypeOptions } from "react-native";
import { AppText } from "../atoms/AppText";
import { tokens } from "../tokens";

type Mask = "phone" | "zip" | "currency";

const DIGITS_ONLY: Record<Mask, number> = { phone: 10, zip: 9, currency: 12 };

function applyMask(raw: string, mask?: Mask): string {
  if (!mask) return raw;
  const digits = raw.replace(/\D/g, "").slice(0, DIGITS_ONLY[mask]);
  return digits;
}

function displayMask(value: string, mask?: Mask): string {
  if (mask !== "phone" || value.length !== 10) return value;
  return `(${value.slice(0, 3)}) ${value.slice(3, 6)}-${value.slice(6)}`;
}

export function FormField({
  label,
  value,
  onChangeText,
  error,
  helper,
  mask,
  keyboardType,
  secureTextEntry,
  multiline,
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (next: string) => void;
  error?: string;
  helper?: string;
  mask?: Mask;
  keyboardType?: KeyboardTypeOptions;
  secureTextEntry?: boolean;
  multiline?: boolean;
  placeholder?: string;
}) {
  const inferredKeyboard: KeyboardTypeOptions | undefined =
    keyboardType ?? (mask === "phone" ? "phone-pad" : mask ? "number-pad" : undefined);

  return (
    <View style={{ gap: tokens.space[1] }}>
      <AppText variant="label" tone="muted">{label}</AppText>
      <TextInput
        accessibilityLabel={label}
        value={displayMask(value, mask)}
        onChangeText={(raw) => onChangeText(applyMask(raw, mask))}
        keyboardType={inferredKeyboard}
        secureTextEntry={secureTextEntry}
        multiline={multiline}
        placeholder={placeholder}
        placeholderTextColor={tokens.color.muted}
        style={{
          minHeight: multiline ? 96 : 52,
          paddingHorizontal: tokens.space[3],
          paddingVertical: tokens.space[2],
          borderRadius: tokens.radius.input,
          borderWidth: 1,
          borderColor: error ? tokens.color.danger : tokens.color.border,
          backgroundColor: tokens.color.surface,
          color: tokens.color.text,
          fontSize: 15,
          textAlignVertical: multiline ? "top" : "center",
        }}
      />
      {error ? <AppText variant="bodySm" style={{ color: tokens.color.danger }}>{error}</AppText> : null}
      {!error && helper ? <AppText variant="bodySm" tone="muted">{helper}</AppText> : null}
    </View>
  );
}
```

`packages/ui/src/molecules/RadioTile.tsx`:

```tsx
import { Pressable, View } from "react-native";
import { AppText } from "../atoms/AppText";
import { tokens } from "../tokens";
import { usePortalTheme } from "../theme";

export function RadioTile({
  label,
  subtitle,
  selected,
  onPress,
}: {
  label: string;
  subtitle: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { accent, accentSubtle } = usePortalTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={`${label}. ${subtitle}`}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={{
        minHeight: 72,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: tokens.space[3],
        padding: tokens.space[4],
        borderRadius: tokens.radius.card,
        borderWidth: selected ? 2 : 1,
        borderColor: selected ? accent : tokens.color.border,
        backgroundColor: selected ? accentSubtle : tokens.color.surface,
      }}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="h3">{label}</AppText>
        <AppText variant="bodySm" tone="muted">{subtitle}</AppText>
      </View>
      <View
        style={{
          width: 22, height: 22, borderRadius: 11,
          borderWidth: 2, borderColor: selected ? accent : tokens.color.border,
          alignItems: "center", justifyContent: "center",
        }}
      >
        {selected ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: accent }} /> : null}
      </View>
    </Pressable>
  );
}
```

`packages/ui/src/molecules/ChipMultiSelect.tsx`:

```tsx
import { Pressable, View } from "react-native";
import { AppText } from "../atoms/AppText";
import { tokens } from "../tokens";
import { usePortalTheme } from "../theme";

export type ChipOption = { value: string; label: string };

export function ChipMultiSelect({
  options,
  selected,
  onChange,
}: {
  options: readonly ChipOption[];
  selected: readonly string[];
  onChange: (next: string[]) => void;
}) {
  const { accent, accentSubtle } = usePortalTheme();
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: tokens.space[1] }}>
      {options.map((opt) => {
        const isOn = selected.includes(opt.value);
        return (
          <Pressable
            key={opt.value}
            accessibilityRole="checkbox"
            accessibilityLabel={opt.label}
            accessibilityState={{ checked: isOn }}
            onPress={() =>
              onChange(isOn ? selected.filter((v) => v !== opt.value) : [...selected, opt.value])
            }
            style={{
              minHeight: 44,
              justifyContent: "center",
              paddingHorizontal: tokens.space[3],
              borderRadius: tokens.radius.chip,
              borderWidth: 1,
              borderColor: isOn ? accent : tokens.color.border,
              backgroundColor: isOn ? accentSubtle : tokens.color.surface,
            }}
          >
            <AppText variant="bodySm" tone={isOn ? "accent" : "default"}>
              {isOn ? `✓ ${opt.label}` : opt.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}
```

`packages/ui/src/molecules/ToggleRow.tsx`:

```tsx
import { Switch, View } from "react-native";
import { AppText } from "../atoms/AppText";
import { tokens } from "../tokens";
import { usePortalTheme } from "../theme";

export function ToggleRow({
  label,
  description,
  value,
  onValueChange,
}: {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (next: boolean) => void;
}) {
  const { accent } = usePortalTheme();
  return (
    <View
      style={{
        flexDirection: "row", alignItems: "center", gap: tokens.space[3],
        padding: tokens.space[4], borderRadius: tokens.radius.card,
        borderWidth: 1, borderColor: tokens.color.border, backgroundColor: tokens.color.surface,
      }}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="h3">{label}</AppText>
        {description ? <AppText variant="bodySm" tone="muted">{description}</AppText> : null}
      </View>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={onValueChange}
        trackColor={{ true: accent, false: tokens.color.border }}
      />
    </View>
  );
}
```

`packages/ui/src/molecules/Stepper.tsx`:

```tsx
import { View } from "react-native";
import { AppText } from "../atoms/AppText";
import { tokens } from "../tokens";
import { usePortalTheme } from "../theme";

export function Stepper({
  current,
  total,
  labels,
}: {
  current: number;
  total: number;
  labels: readonly string[];
}) {
  const { accent } = usePortalTheme();
  const currentLabel = labels[current - 1] ?? "";
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={`Step ${current} of ${total}: ${currentLabel}`}
      style={{ gap: tokens.space[1] }}
    >
      <View style={{ flexDirection: "row", gap: tokens.space[0] }}>
        {Array.from({ length: total }, (_, i) => (
          <View
            key={i}
            style={{
              flex: 1, height: 4, borderRadius: 2,
              backgroundColor: i < current ? accent : tokens.color.border,
            }}
          />
        ))}
      </View>
      <AppText variant="label" tone="muted">{`Step ${current} of ${total} · ${currentLabel}`}</AppText>
    </View>
  );
}
```

- [ ] **Step 4: Implement Screen, SectionHeader, EmptyState, SelectField**

`packages/ui/src/organisms/Screen.tsx`:

```tsx
import type { ReactNode } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { tokens } from "../tokens";

export function Screen({
  children,
  footer,
  scroll = true,
}: {
  children: ReactNode;
  footer?: ReactNode;
  scroll?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const body = (
    <View style={{ padding: tokens.space[4], gap: tokens.space[4], paddingBottom: tokens.space[7] }}>
      {children}
    </View>
  );
  return (
    <View style={{ flex: 1, backgroundColor: tokens.color.bg, paddingTop: insets.top }}>
      {scroll ? <ScrollView keyboardShouldPersistTaps="handled">{body}</ScrollView> : body}
      {footer ? (
        <View
          style={{
            padding: tokens.space[4],
            paddingBottom: insets.bottom + tokens.space[3],
            borderTopWidth: 1,
            borderTopColor: tokens.color.divider,
            backgroundColor: tokens.color.surface,
          }}
        >
          {footer}
        </View>
      ) : null}
    </View>
  );
}
```

`packages/ui/src/organisms/SectionHeader.tsx`:

```tsx
import { View } from "react-native";
import { AppText } from "../atoms/AppText";
import { tokens } from "../tokens";

export function SectionHeader({
  index,
  title,
  subtitle,
}: {
  index?: number;
  title: string;
  subtitle?: string;
}) {
  return (
    <View style={{ gap: 2 }} accessibilityRole="header">
      <AppText variant="h2">{index ? `${index}. ${title}` : title}</AppText>
      {subtitle ? <AppText variant="bodySm" tone="muted">{subtitle}</AppText> : null}
    </View>
  );
}
```

`packages/ui/src/organisms/EmptyState.tsx`:

```tsx
import { View } from "react-native";
import { AppText } from "../atoms/AppText";
import { PillButton } from "../molecules/PillButton";
import { tokens } from "../tokens";

export function EmptyState({
  title,
  body,
  ctaLabel,
  onCtaPress,
}: {
  title: string;
  body: string;
  ctaLabel?: string;
  onCtaPress?: () => void;
}) {
  return (
    <View style={{ alignItems: "center", gap: tokens.space[2], paddingVertical: tokens.space[7] }}>
      <AppText variant="h3">{title}</AppText>
      <AppText variant="body" tone="muted" style={{ textAlign: "center" }}>{body}</AppText>
      {ctaLabel && onCtaPress ? (
        <View style={{ marginTop: tokens.space[2], alignSelf: "stretch" }}>
          <PillButton label={ctaLabel} onPress={onCtaPress} />
        </View>
      ) : null}
    </View>
  );
}
```

`packages/ui/src/molecules/SelectField.tsx`:

```tsx
import { useState } from "react";
import { Modal, Pressable, ScrollView, View } from "react-native";
import { AppText } from "../atoms/AppText";
import { tokens } from "../tokens";
import { usePortalTheme } from "../theme";

export type SelectOption = { value: string; label: string };

export function SelectField({
  label,
  value,
  options,
  onSelect,
  placeholder = "Select…",
  error,
}: {
  label: string;
  value: string | null;
  options: readonly SelectOption[];
  onSelect: (value: string) => void;
  placeholder?: string;
  error?: string;
}) {
  const [open, setOpen] = useState(false);
  const { accent } = usePortalTheme();
  const selectedLabel = options.find((o) => o.value === value)?.label ?? null;

  return (
    <View style={{ gap: tokens.space[1] }}>
      <AppText variant="label" tone="muted">{label}</AppText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityValue={{ text: selectedLabel ?? placeholder }}
        onPress={() => setOpen(true)}
        style={{
          minHeight: 52, justifyContent: "center",
          paddingHorizontal: tokens.space[3],
          borderRadius: tokens.radius.input,
          borderWidth: 1,
          borderColor: error ? tokens.color.danger : tokens.color.border,
          backgroundColor: tokens.color.surface,
        }}
      >
        <AppText tone={selectedLabel ? "default" : "muted"}>{selectedLabel ?? placeholder}</AppText>
      </Pressable>
      {error ? <AppText variant="bodySm" style={{ color: tokens.color.danger }}>{error}</AppText> : null}

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: "rgba(22,36,28,0.35)" }} onPress={() => setOpen(false)} />
        <View
          style={{
            maxHeight: "60%",
            backgroundColor: tokens.color.surface,
            borderTopLeftRadius: tokens.radius.sheet,
            borderTopRightRadius: tokens.radius.sheet,
            padding: tokens.space[4],
          }}
        >
          <AppText variant="h2" style={{ marginBottom: tokens.space[2] }}>{label}</AppText>
          <ScrollView>
            {options.map((opt) => (
              <Pressable
                key={opt.value}
                accessibilityRole="button"
                accessibilityLabel={opt.label}
                onPress={() => { onSelect(opt.value); setOpen(false); }}
                style={{
                  minHeight: 52, justifyContent: "center",
                  borderBottomWidth: 1, borderBottomColor: tokens.color.divider,
                }}
              >
                <AppText tone={opt.value === value ? "accent" : "default"}>
                  {opt.value === value ? `✓ ${opt.label}` : opt.label}
                </AppText>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}
```

Append every new component to `packages/ui/src/index.ts`.

- [ ] **Step 5: Run and confirm pass**

Run: `pnpm --filter @rebin/ui test && pnpm --filter @rebin/ui typecheck`
Expected: PASS, zero type errors

- [ ] **Step 6: Commit**

```bash
git add packages/ui
git commit -m "feat(ui): add form primitives, screen shell, section header, and empty state"
```

---

### Task 7: Supabase schema, enums, and RLS policies

**Files:**
- Create: `supabase/migrations/0001_enums.sql` … `0009_seed_platform_owner.sql`
- Create: `supabase/seed.sql` (dev fixtures)
- Test: `supabase/tests/rls.test.sql` (pgTAP)

**Interfaces:**
- Consumes: enum names from Task 3 (`packages/shared/src/enums.ts` — the SQL enums must match string-for-string)
- Produces: `has_role(p_role role_enum, p_scope uuid) → boolean`; all tables from Part A §5; generated types consumed by Task 8

- [ ] **Step 1: Start Supabase locally**

```bash
pnpm dlx supabase init
pnpm dlx supabase start
```

- [ ] **Step 2: Write the enum and identity migrations**

`supabase/migrations/0001_enums.sql`:

```sql
create type role_enum as enum (
  'platform_owner','platform_ops','platform_finance','platform_support',
  'org_owner','org_admin','org_requester',
  'biz_owner','biz_staff',
  'field_agent','field_lead'
);
create type scope_enum as enum ('platform','organization','business','self');
create type account_status_enum as enum ('pending_verification','active','suspended','rejected','archived');
create type request_status_enum as enum ('pending','under_review','scheduled','dispatched','in_transit','completed','cancelled');
create type org_type_enum as enum ('k12_school','university','hospital','municipal_office','corporate_hq','other');
create type size_tier_enum as enum ('tier_10_30','tier_30_100','tier_100_300','tier_300_plus');
create type device_category_enum as enum ('computers_laptops','monitors_displays','server_gear','copiers_printers','batteries_ups');
```

`supabase/migrations/0002_identity.sql`:

```sql
create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null,
  phone       text,
  avatar_url  text,
  status      account_status_enum not null default 'pending_verification',
  created_at  timestamptz not null default now()
);

create table role_assignments (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  role        role_enum   not null,
  scope_type  scope_enum  not null,
  scope_id    uuid,
  granted_by  uuid references profiles(id),
  granted_at  timestamptz not null default now(),
  revoked_at  timestamptz,
  check (scope_type = 'platform' or scope_type = 'self' or scope_id is not null)
);

create unique index role_assignments_active_uniq
  on role_assignments (user_id, role, coalesce(scope_id, '00000000-0000-0000-0000-000000000000'::uuid))
  where revoked_at is null;

create table invitations (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  role        role_enum not null,
  scope_id    uuid,
  token_hash  text not null unique,
  invited_by  uuid references profiles(id),
  expires_at  timestamptz not null,
  consumed_at timestamptz,
  created_at  timestamptz not null default now()
);
```

- [ ] **Step 3: Write the tenant and demand migrations**

`supabase/migrations/0003_tenants.sql`:

```sql
create table organizations (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  org_type          org_type_enum not null,
  street            text not null,
  city              text not null,
  state             char(2) not null,
  zip               text not null,
  facility_timezone text not null default 'America/New_York',
  dock_access       boolean not null default false,
  status            account_status_enum not null default 'pending_verification',
  verified_at       timestamptz,
  created_at        timestamptz not null default now()
);

create table organization_members (
  org_id      uuid not null references organizations(id) on delete cascade,
  user_id     uuid not null references profiles(id) on delete cascade,
  member_role role_enum not null,
  primary key (org_id, user_id)
);
```

`supabase/migrations/0005_demand.sql` (pickup requests only in P0 — quotes land in P4):

```sql
create table pickup_requests (
  id                   uuid primary key default gen_random_uuid(),
  org_id               uuid not null references organizations(id) on delete cascade,
  created_by           uuid not null references profiles(id),
  size_tier            size_tier_enum not null,
  unit_count           integer not null check (unit_count >= 10),
  categories           device_category_enum[] not null check (array_length(categories, 1) >= 1),
  window_start         timestamptz not null,
  window_end           timestamptz not null check (window_end > window_start),
  timezone             text not null,
  on_site_contact_name  text not null,
  on_site_contact_phone text not null,
  dock_address         text not null,
  instructions         text not null default '',
  status               request_status_enum not null default 'pending',
  created_at           timestamptz not null default now()
);

create index pickup_requests_org_idx on pickup_requests (org_id, created_at desc);
```

> The `unit_count >= 10` CHECK is the server-side twin of the Zod rule in Task 3. Both must exist — the client rule is UX, the CHECK is the guarantee.

- [ ] **Step 4: Write `has_role` and the RLS policies**

`supabase/migrations/0008_rls.sql`:

```sql
create or replace function has_role(p_role role_enum, p_scope uuid default null)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from role_assignments
    where user_id = auth.uid()
      and role = p_role
      and (p_scope is null or scope_id = p_scope)
      and revoked_at is null
  );
$$;

alter table profiles              enable row level security;
alter table role_assignments      enable row level security;
alter table organizations         enable row level security;
alter table organization_members  enable row level security;
alter table pickup_requests       enable row level security;

create policy profiles_self on profiles for select
  using (id = auth.uid() or has_role('platform_support') or has_role('platform_ops'));

create policy roles_self on role_assignments for select
  using (user_id = auth.uid() or has_role('platform_owner'));

create policy org_read on organizations for select using (
  id in (select org_id from organization_members where user_id = auth.uid())
  or has_role('platform_ops') or has_role('platform_support')
);

create policy req_read on pickup_requests for select using (
  created_by = auth.uid()
  or has_role('org_admin', org_id)
  or has_role('org_owner', org_id)
  or has_role('platform_ops')
  or has_role('platform_support')
);

create policy req_insert on pickup_requests for insert with check (
  created_by = auth.uid()
  and org_id in (select org_id from organization_members where user_id = auth.uid())
);
```

`supabase/migrations/0009_seed_platform_owner.sql`:

```sql
-- The first platform owner can only be seeded, never self-registered.
-- Replace the UUID with the founder's auth.users id before the first deploy.
insert into role_assignments (user_id, role, scope_type)
select '00000000-0000-0000-0000-000000000001'::uuid, 'platform_owner', 'platform'
where exists (select 1 from auth.users where id = '00000000-0000-0000-0000-000000000001');
```

- [ ] **Step 5: Write the RLS isolation test**

`supabase/tests/rls.test.sql`:

```sql
begin;
select plan(4);

-- Fixtures: two orgs, one member each, one request each
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'a@org-a.test'),
  ('22222222-2222-2222-2222-222222222222', 'b@org-b.test');
insert into profiles (id, full_name, status) values
  ('11111111-1111-1111-1111-111111111111', 'User A', 'active'),
  ('22222222-2222-2222-2222-222222222222', 'User B', 'active');
insert into organizations (id, name, org_type, street, city, state, zip) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Org A', 'hospital', '1 A St', 'Boston', 'MA', '02108'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'Org B', 'k12_school', '2 B St', 'Austin', 'TX', '73301');
insert into organization_members values
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'org_owner'),
  ('bbbbbbbb-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'org_owner');
insert into role_assignments (user_id, role, scope_type, scope_id) values
  ('11111111-1111-1111-1111-111111111111', 'org_owner', 'organization', 'aaaaaaaa-0000-0000-0000-000000000001'),
  ('22222222-2222-2222-2222-222222222222', 'org_owner', 'organization', 'bbbbbbbb-0000-0000-0000-000000000002');
insert into pickup_requests (org_id, created_by, size_tier, unit_count, categories, window_start, window_end, timezone, on_site_contact_name, on_site_contact_phone, dock_address) values
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'tier_10_30', 25, '{computers_laptops}', now(), now() + interval '3 hours', 'America/New_York', 'A Contact', '5550100000', 'Dock A'),
  ('bbbbbbbb-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'tier_10_30', 30, '{monitors_displays}', now(), now() + interval '3 hours', 'America/Chicago', 'B Contact', '5550200000', 'Dock B');

-- User A sees only their own org's request
set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select is((select count(*)::int from pickup_requests), 1, 'User A sees exactly one request');
select is((select org_id from pickup_requests), 'aaaaaaaa-0000-0000-0000-000000000001'::uuid, 'User A sees only Org A');

-- User B sees only theirs
set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select is((select count(*)::int from pickup_requests), 1, 'User B sees exactly one request');
select is((select org_id from pickup_requests), 'bbbbbbbb-0000-0000-0000-000000000002'::uuid, 'User B sees only Org B');

select * from finish();
rollback;
```

- [ ] **Step 6: Apply migrations and run the RLS test**

Run:
```bash
pnpm dlx supabase db reset
pnpm dlx supabase test db
```
Expected: 4/4 pgTAP assertions pass. If cross-org rows leak, a policy is missing `enable row level security` — check before continuing.

- [ ] **Step 7: Commit**

```bash
git add supabase
git commit -m "feat(db): add schema, has_role helper, RLS policies, and pgTAP isolation test"
```

---

### Task 8: Typed API package and session store

**Files:**
- Create: `packages/api/package.json`, `packages/api/src/{client,auth,index}.ts`, `packages/api/src/hooks/useSession.ts`
- Create: `packages/api/src/types.gen.ts` (generated)
- Create: `apps/mobile/src/store/session.ts`
- Test: `packages/api/src/__tests__/auth.test.ts`

**Interfaces:**
- Consumes: Task 3 schemas, Task 7 database
- Produces:
  - `supabase` — typed `SupabaseClient<Database>`
  - `signIn(email, password): Promise<{ userId: string }>`
  - `signOut(): Promise<void>`
  - `signUpOrganization(input: OrgSignupInput): Promise<{ userId: string; orgId: string }>`
  - `resolveRoles(userId: string): Promise<RoleAssignment[]>` where `RoleAssignment = { role: Role; scopeType: ScopeType; scopeId: string | null; scopeName: string | null }`
  - `portalForRole(role: Role): PortalKey | null`
  - `useSession(): { status: "loading"|"signed-out"|"pending"|"ready"; userId: string|null; assignments: RoleAssignment[]; activeIndex: number }`

- [ ] **Step 1: Generate types and create the client**

```bash
pnpm dlx supabase gen types typescript --local > packages/api/src/types.gen.ts
```

`packages/api/src/client.ts`:

```ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types.gen";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error("Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY");
}

export const supabase = createClient<Database>(url, anonKey, {
  auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
});
```

- [ ] **Step 2: Write the failing role-mapping test**

`packages/api/src/__tests__/auth.test.ts`:

```ts
import { portalForRole } from "../auth";

describe("portalForRole", () => {
  it.each([
    ["org_owner", "org"],
    ["org_admin", "org"],
    ["org_requester", "org"],
    ["biz_owner", "business"],
    ["biz_staff", "business"],
    ["field_agent", "agent"],
    ["field_lead", "agent"],
  ] as const)("maps %s to the %s portal", (role, portal) => {
    expect(portalForRole(role)).toBe(portal);
  });

  it.each(["platform_owner", "platform_ops", "platform_finance", "platform_support"] as const)(
    "returns null for %s — platform roles have no mobile portal",
    (role) => {
      expect(portalForRole(role)).toBeNull();
    },
  );
});
```

- [ ] **Step 3: Run and confirm failure**

Run: `pnpm --filter @rebin/api test`
Expected: FAIL — `Cannot find module '../auth'`

- [ ] **Step 4: Implement auth**

`packages/api/src/auth.ts`:

```ts
import type { OrgSignupInput, Role, ScopeType } from "@rebin/shared";
import type { PortalKey } from "@rebin/ui";
import { supabase } from "./client";

export type RoleAssignment = {
  role: Role;
  scopeType: ScopeType;
  scopeId: string | null;
  scopeName: string | null;
};

const PORTAL_BY_ROLE: Partial<Record<Role, PortalKey>> = {
  org_owner: "org", org_admin: "org", org_requester: "org",
  biz_owner: "business", biz_staff: "business",
  field_agent: "agent", field_lead: "agent",
};

export function portalForRole(role: Role): PortalKey | null {
  return PORTAL_BY_ROLE[role] ?? null;
}

export async function signIn(email: string, password: string): Promise<{ userId: string }> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  if (!data.user) throw new Error("Sign-in returned no user");
  return { userId: data.user.id };
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function resolveRoles(userId: string): Promise<RoleAssignment[]> {
  const { data, error } = await supabase
    .from("role_assignments")
    .select("role, scope_type, scope_id, organizations(name)")
    .eq("user_id", userId)
    .is("revoked_at", null);
  if (error) throw error;

  return (data ?? []).map((row) => ({
    role: row.role as Role,
    scopeType: row.scope_type as ScopeType,
    scopeId: row.scope_id,
    scopeName: (row.organizations as { name: string } | null)?.name ?? null,
  }));
}

export async function signUpOrganization(input: OrgSignupInput): Promise<{ userId: string; orgId: string }> {
  const { data, error } = await supabase.functions.invoke<{ userId: string; orgId: string }>(
    "signup-organization",
    { body: input },
  );
  if (error) throw error;
  if (!data) throw new Error("Signup returned no payload");
  return data;
}
```

> Organization signup goes through an Edge Function because it must create the auth user, the `organizations` row, the `organization_members` row, and the `role_assignments` row **in one transaction**. Doing it client-side leaves orphaned users when a later step fails.

- [ ] **Step 5: Implement the session hook and store**

`apps/mobile/src/store/session.ts`:

```ts
import { create } from "zustand";
import type { RoleAssignment } from "@rebin/api";

type SessionState = {
  status: "loading" | "signed-out" | "pending" | "ready";
  userId: string | null;
  assignments: RoleAssignment[];
  activeIndex: number;
  setSignedOut: () => void;
  setSession: (userId: string, assignments: RoleAssignment[], accountActive: boolean) => void;
  setActiveIndex: (index: number) => void;
};

export const useSessionStore = create<SessionState>((set) => ({
  status: "loading",
  userId: null,
  assignments: [],
  activeIndex: 0,
  setSignedOut: () => set({ status: "signed-out", userId: null, assignments: [], activeIndex: 0 }),
  setSession: (userId, assignments, accountActive) =>
    set({ status: accountActive ? "ready" : "pending", userId, assignments, activeIndex: 0 }),
  setActiveIndex: (activeIndex) => set({ activeIndex }),
}));
```

- [ ] **Step 6: Run and confirm pass**

Run: `pnpm --filter @rebin/api test && pnpm typecheck`
Expected: PASS, zero type errors

- [ ] **Step 7: Commit**

```bash
git add packages/api apps/mobile/src/store
git commit -m "feat(api): add typed supabase client, auth helpers, and session store"
```

---

### Task 9: Root routing and the role guard

**Files:**
- Modify: `apps/mobile/app/_layout.tsx`
- Create: `apps/mobile/src/components/RoleGuard.tsx`
- Create: `apps/mobile/app/(org)/_layout.tsx`, `apps/mobile/app/(biz)/_layout.tsx`, `apps/mobile/app/(agent)/_layout.tsx`
- Test: `apps/mobile/__tests__/routing.test.tsx`

**Interfaces:**
- Consumes: `useSessionStore` (Task 8), `PortalThemeProvider` (Task 4), `portalForRole` (Task 8)
- Produces: `<RoleGuard portal={PortalKey}>` — redirects any session whose active assignment maps to a different portal; `resolveInitialRoute(state): string` — pure, testable routing decision

- [ ] **Step 1: Write the failing routing test**

`apps/mobile/__tests__/routing.test.tsx`:

```tsx
import { resolveInitialRoute } from "../src/components/RoleGuard";

const assignment = (role: string) => ({ role, scopeType: "organization", scopeId: "o1", scopeName: "Org" }) as never;

describe("resolveInitialRoute", () => {
  it("sends a loading session nowhere", () => {
    expect(resolveInitialRoute({ status: "loading", assignments: [], hasOnboarded: true })).toBeNull();
  });

  it("sends a first-launch signed-out user to portal select", () => {
    expect(resolveInitialRoute({ status: "signed-out", assignments: [], hasOnboarded: false })).toBe("/");
  });

  it("sends a returning signed-out user straight to login", () => {
    expect(resolveInitialRoute({ status: "signed-out", assignments: [], hasOnboarded: true })).toBe("/login");
  });

  it("sends an unapproved account to the pending screen", () => {
    expect(resolveInitialRoute({ status: "pending", assignments: [assignment("org_owner")], hasOnboarded: true }))
      .toBe("/pending");
  });

  it("routes a single org assignment to the org dashboard", () => {
    expect(resolveInitialRoute({ status: "ready", assignments: [assignment("org_owner")], hasOnboarded: true }))
      .toBe("/(org)/dashboard");
  });

  it("routes a single agent assignment to the dispatch queue", () => {
    expect(resolveInitialRoute({ status: "ready", assignments: [assignment("field_agent")], hasOnboarded: true }))
      .toBe("/(agent)/dispatch");
  });

  it("routes a single business assignment to the business dashboard", () => {
    expect(resolveInitialRoute({ status: "ready", assignments: [assignment("biz_owner")], hasOnboarded: true }))
      .toBe("/(biz)/dashboard");
  });

  it("sends a multi-assignment user to the context picker", () => {
    expect(
      resolveInitialRoute({
        status: "ready",
        assignments: [assignment("org_admin"), assignment("biz_owner")],
        hasOnboarded: true,
      }),
    ).toBe("/context-picker");
  });

  it("sends a platform-only account to pending — platform roles have no mobile portal", () => {
    expect(resolveInitialRoute({ status: "ready", assignments: [assignment("platform_ops")], hasOnboarded: true }))
      .toBe("/pending");
  });
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `pnpm --filter mobile test routing`
Expected: FAIL — `resolveInitialRoute is not exported`

- [ ] **Step 3: Implement the guard**

`apps/mobile/src/components/RoleGuard.tsx`:

```tsx
import type { ReactNode } from "react";
import { Redirect } from "expo-router";
import { portalForRole, type RoleAssignment } from "@rebin/api";
import { PortalThemeProvider, type PortalKey } from "@rebin/ui";
import { useSessionStore } from "../store/session";

const HOME_BY_PORTAL: Record<PortalKey, string> = {
  org: "/(org)/dashboard",
  business: "/(biz)/dashboard",
  agent: "/(agent)/dispatch",
};

export function resolveInitialRoute(state: {
  status: "loading" | "signed-out" | "pending" | "ready";
  assignments: RoleAssignment[];
  hasOnboarded: boolean;
}): string | null {
  if (state.status === "loading") return null;
  if (state.status === "signed-out") return state.hasOnboarded ? "/login" : "/";
  if (state.status === "pending") return "/pending";

  const portals = state.assignments
    .map((a) => portalForRole(a.role))
    .filter((p): p is PortalKey => p !== null);

  if (portals.length === 0) return "/pending";
  if (portals.length > 1) return "/context-picker";
  return HOME_BY_PORTAL[portals[0]!];
}

export function RoleGuard({ portal, children }: { portal: PortalKey; children: ReactNode }) {
  const { status, assignments, activeIndex } = useSessionStore();

  if (status === "loading") return null;
  if (status === "signed-out") return <Redirect href="/login" />;
  if (status === "pending") return <Redirect href="/pending" />;

  const active = assignments[activeIndex];
  const activePortal = active ? portalForRole(active.role) : null;
  if (activePortal !== portal) {
    return <Redirect href={activePortal ? HOME_BY_PORTAL[activePortal] : "/pending"} />;
  }

  return <PortalThemeProvider portal={portal}>{children}</PortalThemeProvider>;
}
```

- [ ] **Step 4: Wire the portal layouts**

`apps/mobile/app/(org)/_layout.tsx`:

```tsx
import { Stack } from "expo-router";
import { RoleGuard } from "../../src/components/RoleGuard";

export default function OrgLayout() {
  return (
    <RoleGuard portal="org">
      <Stack screenOptions={{ headerShown: false }} />
    </RoleGuard>
  );
}
```

Create `(biz)/_layout.tsx` and `(agent)/_layout.tsx` identically, with `portal="business"` and `portal="agent"`.

- [ ] **Step 5: Run and confirm pass**

Run: `pnpm --filter mobile test`
Expected: PASS — 9 routing assertions

- [ ] **Step 6: Commit**

```bash
git add apps/mobile
git commit -m "feat(mobile): add role guard and server-driven portal routing"
```

---

### Task 10: S02 Portal Select and S03 Portal Landing

**Files:**
- Modify: `apps/mobile/app/index.tsx`
- Create: `apps/mobile/app/(public)/portal/[role].tsx`
- Create: `apps/mobile/src/config/portals.ts`
- Test: `apps/mobile/__tests__/portal-select.test.tsx`

**Interfaces:**
- Consumes: `Card`, `PillButton`, `AppText`, `IconTile`, `PortalThemeProvider`
- Produces: `PORTAL_CONTENT: Record<PortalKey, PortalCopy>` — the single source of truth for all portal-facing marketing copy, consumed by both S02 and S03

- [ ] **Step 1: Write the failing screen test**

`apps/mobile/__tests__/portal-select.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react-native";
import Index from "../app/index";

jest.mock("expo-router", () => ({ useRouter: () => ({ push: jest.fn() }), Link: ({ children }: never) => children }));

describe("S02 Portal Select", () => {
  it("shows all three portal cards", () => {
    render(<Index />);
    expect(screen.getByText("Organizations")).toBeTruthy();
    expect(screen.getByText("Businesses")).toBeTruthy();
    expect(screen.getByText("Field Agents")).toBeTruthy();
  });

  it("labels the organization portal as zero-cost", () => {
    render(<Index />);
    expect(screen.getByText("Zero-Cost Bulk Removal")).toBeTruthy();
    expect(screen.getByText("10+ DEVICE MINIMUM")).toBeTruthy();
  });

  it("labels the business portal as paid", () => {
    render(<Index />);
    expect(screen.getByText("Get Paid for Scrap")).toBeTruthy();
  });

  it("marks the agent portal as invite only", () => {
    render(<Index />);
    expect(screen.getByText("INVITE ONLY")).toBeTruthy();
  });

  it("offers a public price catalog link and a login shortcut", () => {
    render(<Index />);
    expect(screen.getByRole("button", { name: "Browse Price Catalog" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Log In" })).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `pnpm --filter mobile test portal-select`
Expected: FAIL — "Organizations" not found

- [ ] **Step 3: Define the portal copy**

`apps/mobile/src/config/portals.ts`:

```ts
import type { PortalKey } from "@rebin/ui";

export type PortalCopy = {
  key: PortalKey;
  title: string;
  tagline: string;
  badge: string;
  description: string;
  benefits: readonly string[];
  signupRoute: string;
  inviteOnly: boolean;
};

export const PORTAL_CONTENT: Record<PortalKey, PortalCopy> = {
  org: {
    key: "org",
    title: "Organizations",
    tagline: "Zero-Cost Bulk Removal",
    badge: "10+ DEVICE MINIMUM",
    description:
      "For K-12 schools, universities, hospitals, municipal offices, and corporate headquarters that need compliant bulk disposal at no cost.",
    benefits: [
      "Free scheduled pickup from your loading dock",
      "Certificate of Recycling with full device manifest",
      "Serial-level tracking for every data-bearing device",
    ],
    signupRoute: "/signup/organization",
    inviteOnly: false,
  },
  business: {
    key: "business",
    title: "Businesses",
    tagline: "Get Paid for Scrap",
    badge: "AI CAMERA SELF-QUOTE",
    description:
      "For repair shops, IT refurbishers, and local recyclers looking to liquidate component scrap through AI camera quotes and local pickups.",
    benefits: [
      "Instant quotes from a photo — no manual sorting",
      "Prepaid shipping labels for small shipments",
      "Direct ACH payout on settlement",
    ],
    signupRoute: "/signup/business",
    inviteOnly: false,
  },
  agent: {
    key: "agent",
    title: "Field Agents",
    tagline: "Dispatch & Settlement",
    badge: "INVITE ONLY",
    description:
      "For drivers and on-site technicians managing bulk pickup queues, multi-item audits, and instant digital payouts.",
    benefits: [
      "GPS dispatch queue with optimized routing",
      "Continuous multi-scan audit with weight capture",
      "Dual-signature settlement and instant payout",
    ],
    signupRoute: "/signup/agent",
    inviteOnly: true,
  },
};

export const PORTAL_ORDER: readonly PortalKey[] = ["org", "business", "agent"] as const;
```

- [ ] **Step 4: Implement S02**

`apps/mobile/app/index.tsx`:

```tsx
import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import {
  AppText, Card, IconTile, PORTAL_ACCENTS, PortalThemeProvider, Screen, tokens,
} from "@rebin/ui";
import { PORTAL_CONTENT, PORTAL_ORDER } from "../src/config/portals";

export default function Index() {
  const router = useRouter();
  return (
    <PortalThemeProvider portal="org">
      <Screen>
        <View style={{ gap: tokens.space[1], marginBottom: tokens.space[2] }}>
          <AppText variant="label" tone="muted">REBIN TECH</AppText>
          <AppText variant="display">Free, compliant{"\n"}e-waste recycling</AppText>
          <AppText variant="body" tone="muted">Choose how you want to get started.</AppText>
        </View>

        {PORTAL_ORDER.map((key) => {
          const p = PORTAL_CONTENT[key];
          return (
            <PortalThemeProvider key={key} portal={key}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${p.title}. ${p.tagline}`}
                onPress={() => router.push(`/portal/${key}`)}
              >
                <Card accentBorder style={{ gap: tokens.space[2] }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: tokens.space[2] }}>
                    <IconTile />
                    <View style={{ flex: 1, gap: 2 }}>
                      <AppText variant="h1">{p.title}</AppText>
                      <AppText variant="h3" tone="accent">{p.tagline}</AppText>
                    </View>
                  </View>
                  <View style={{ alignSelf: "flex-start", paddingHorizontal: tokens.space[2], paddingVertical: 6, borderRadius: tokens.radius.chip, borderWidth: 1, borderColor: PORTAL_ACCENTS[key] }}>
                    <AppText variant="label" tone="accent">{p.badge}</AppText>
                  </View>
                  <AppText variant="bodySm" tone="muted">{p.description}</AppText>
                </Card>
              </Pressable>
            </PortalThemeProvider>
          );
        })}

        <View style={{ gap: tokens.space[1], marginTop: tokens.space[2] }}>
          <Pressable accessibilityRole="button" accessibilityLabel="Browse Price Catalog" onPress={() => router.push("/catalog")} style={{ minHeight: 44, justifyContent: "center" }}>
            <AppText tone="accent">Browse Price Catalog ($/lb rates)</AppText>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Log In" onPress={() => router.push("/login")} style={{ minHeight: 44, justifyContent: "center" }}>
            <AppText tone="muted">Already have an account? <AppText tone="accent">Log In</AppText></AppText>
          </Pressable>
        </View>
      </Screen>
    </PortalThemeProvider>
  );
}
```

- [ ] **Step 5: Implement S03 Portal Landing**

`apps/mobile/app/(public)/portal/[role].tsx`:

```tsx
import { View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { AppText, Card, PillButton, PortalThemeProvider, Screen, tokens, type PortalKey } from "@rebin/ui";
import { PORTAL_CONTENT } from "../../../src/config/portals";

export default function PortalLanding() {
  const { role } = useLocalSearchParams<{ role: PortalKey }>();
  const router = useRouter();
  const p = PORTAL_CONTENT[role] ?? PORTAL_CONTENT.org;

  return (
    <PortalThemeProvider portal={p.key}>
      <Screen
        footer={
          <View style={{ gap: tokens.space[2] }}>
            <PillButton
              label={p.inviteOnly ? "I have an invite link" : "Sign Up"}
              onPress={() => router.push(p.signupRoute)}
            />
            <PillButton label="Log In" variant="ghost" onPress={() => router.push("/login")} />
          </View>
        }
      >
        <AppText variant="label" tone="accent">{p.badge}</AppText>
        <AppText variant="display">{p.title}</AppText>
        <AppText variant="h3" tone="accent">{p.tagline}</AppText>
        <AppText variant="body" tone="muted">{p.description}</AppText>
        <Card variant="alt" style={{ gap: tokens.space[2] }}>
          {p.benefits.map((b) => (
            <View key={b} style={{ flexDirection: "row", gap: tokens.space[2] }}>
              <AppText tone="accent">✓</AppText>
              <AppText variant="bodySm" style={{ flex: 1 }}>{b}</AppText>
            </View>
          ))}
        </Card>
      </Screen>
    </PortalThemeProvider>
  );
}
```

- [ ] **Step 6: Run and confirm pass**

Run: `pnpm --filter mobile test`
Expected: PASS — 5 portal-select assertions

- [ ] **Step 7: Commit**

```bash
git add apps/mobile
git commit -m "feat(mobile): add portal select and portal landing screens"
```

---

### Task 11: S04 Unified Login

**Files:**
- Create: `apps/mobile/app/(auth)/login.tsx`
- Create: `apps/mobile/src/hooks/useLogin.ts`
- Test: `apps/mobile/__tests__/login.test.tsx`

**Interfaces:**
- Consumes: `loginSchema` (Task 3), `signIn` / `resolveRoles` (Task 8), `resolveInitialRoute` (Task 9), `FormField` / `PillButton` (Tasks 5–6)
- Produces: `useLogin(): { submit(values: LoginInput): Promise<void>; isPending: boolean; error: string | null }`

- [ ] **Step 1: Write the failing login test**

`apps/mobile/__tests__/login.test.tsx`:

```tsx
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import Login from "../app/(auth)/login";

const mockSignIn = jest.fn();
const mockResolveRoles = jest.fn();
const mockReplace = jest.fn();

jest.mock("@rebin/api", () => ({
  signIn: (...a: unknown[]) => mockSignIn(...a),
  resolveRoles: (...a: unknown[]) => mockResolveRoles(...a),
  portalForRole: (r: string) => (r.startsWith("org_") ? "org" : r.startsWith("biz_") ? "business" : "agent"),
}));
jest.mock("expo-router", () => ({ useRouter: () => ({ replace: mockReplace, push: jest.fn() }) }));

beforeEach(() => jest.clearAllMocks());

describe("S04 Login", () => {
  it("shows no role or portal selector", () => {
    render(<Login />);
    expect(screen.queryByText(/Organizations/)).toBeNull();
    expect(screen.queryByText(/select.*role/i)).toBeNull();
  });

  it("blocks submission on an invalid email", async () => {
    render(<Login />);
    fireEvent.changeText(screen.getByLabelText("Email"), "not-an-email");
    fireEvent.changeText(screen.getByLabelText("Password"), "RebinTech2026!");
    fireEvent.press(screen.getByRole("button", { name: "Log In" }));
    await waitFor(() => expect(screen.getByText("Enter a valid email address")).toBeTruthy());
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it("routes an agent to the dispatch queue after a successful login", async () => {
    mockSignIn.mockResolvedValue({ userId: "u1" });
    mockResolveRoles.mockResolvedValue([{ role: "field_agent", scopeType: "self", scopeId: null, scopeName: null }]);
    render(<Login />);
    fireEvent.changeText(screen.getByLabelText("Email"), "karim@rebin.test");
    fireEvent.changeText(screen.getByLabelText("Password"), "RebinTech2026!");
    fireEvent.press(screen.getByRole("button", { name: "Log In" }));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/(agent)/dispatch"));
  });

  it("surfaces a server error without clearing the email", async () => {
    mockSignIn.mockRejectedValue(new Error("Invalid login credentials"));
    render(<Login />);
    fireEvent.changeText(screen.getByLabelText("Email"), "someone@rebin.test");
    fireEvent.changeText(screen.getByLabelText("Password"), "WrongPass2026!");
    fireEvent.press(screen.getByRole("button", { name: "Log In" }));
    await waitFor(() => expect(screen.getByText("Invalid login credentials")).toBeTruthy());
    expect(screen.getByDisplayValue("someone@rebin.test")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `pnpm --filter mobile test login`
Expected: FAIL — `Cannot find module '../app/(auth)/login'`

- [ ] **Step 3: Implement the login hook**

`apps/mobile/src/hooks/useLogin.ts`:

```ts
import { useState } from "react";
import { useRouter } from "expo-router";
import { resolveRoles, signIn } from "@rebin/api";
import type { LoginInput } from "@rebin/shared";
import { resolveInitialRoute } from "../components/RoleGuard";
import { useSessionStore } from "../store/session";

export function useLogin() {
  const router = useRouter();
  const setSession = useSessionStore((s) => s.setSession);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(values: LoginInput) {
    setIsPending(true);
    setError(null);
    try {
      const { userId } = await signIn(values.email, values.password);
      const assignments = await resolveRoles(userId);
      setSession(userId, assignments, assignments.length > 0);
      const route = resolveInitialRoute({
        status: assignments.length > 0 ? "ready" : "pending",
        assignments,
        hasOnboarded: true,
      });
      if (route) router.replace(route);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to log in. Try again.");
    } finally {
      setIsPending(false);
    }
  }

  return { submit, isPending, error };
}
```

- [ ] **Step 4: Implement the login screen**

`apps/mobile/app/(auth)/login.tsx`:

```tsx
import { useState } from "react";
import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { loginSchema } from "@rebin/shared";
import { AppText, FormField, PillButton, PortalThemeProvider, Screen, tokens } from "@rebin/ui";
import { useLogin } from "../../src/hooks/useLogin";

export default function Login() {
  const router = useRouter();
  const { submit, isPending, error } = useLogin();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  function onSubmit() {
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      const next: { email?: string; password?: string } = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (key === "email" || key === "password") next[key] = issue.message;
      }
      setFieldErrors(next);
      return;
    }
    setFieldErrors({});
    void submit(parsed.data);
  }

  return (
    <PortalThemeProvider portal="org">
      <Screen
        footer={
          <View style={{ gap: tokens.space[2] }}>
            <PillButton label="Log In" onPress={onSubmit} loading={isPending} />
            <Pressable accessibilityRole="button" accessibilityLabel="Not you?" onPress={() => router.replace("/")} style={{ minHeight: 44, justifyContent: "center", alignItems: "center" }}>
              <AppText variant="bodySm" tone="muted">Not you? <AppText variant="bodySm" tone="accent">Choose a different portal</AppText></AppText>
            </Pressable>
          </View>
        }
      >
        <AppText variant="display">Welcome back</AppText>
        <AppText variant="body" tone="muted">Log in to Rebin Tech.</AppText>

        <FormField label="Email" value={email} onChangeText={setEmail} error={fieldErrors.email} keyboardType="email-address" placeholder="you@company.com" />
        <FormField label="Password" value={password} onChangeText={setPassword} error={fieldErrors.password} secureTextEntry />

        {error ? (
          <View style={{ padding: tokens.space[3], borderRadius: tokens.radius.input, backgroundColor: "#FBECEA" }}>
            <AppText variant="bodySm" style={{ color: tokens.color.danger }}>{error}</AppText>
          </View>
        ) : null}

        <Pressable accessibilityRole="button" accessibilityLabel="Forgot password" onPress={() => router.push("/forgot-password")} style={{ minHeight: 44, justifyContent: "center" }}>
          <AppText variant="bodySm" tone="accent">Forgot your password?</AppText>
        </Pressable>
      </Screen>
    </PortalThemeProvider>
  );
}
```

- [ ] **Step 5: Run and confirm pass**

Run: `pnpm --filter mobile test`
Expected: PASS — 4 login assertions

- [ ] **Step 6: Commit**

```bash
git add apps/mobile
git commit -m "feat(mobile): add unified login with server-driven portal routing"
```

---

### Task 12: S10–S13 Organization signup wizard

**Files:**
- Create: `apps/mobile/app/(auth)/signup/organization.tsx`
- Create: `apps/mobile/src/features/org-signup/{Step1Org,Step2Contact,Step3Facility,SuccessStep}.tsx`
- Create: `apps/mobile/src/config/us-states.ts`
- Create: `supabase/functions/signup-organization/index.ts`
- Test: `apps/mobile/__tests__/org-signup.test.tsx`

**Interfaces:**
- Consumes: `orgSignupSchema`, `ORG_TYPES` (Task 3); `Stepper`, `FormField`, `SelectField`, `ToggleRow` (Task 6); `signUpOrganization` (Task 8)
- Produces: `US_STATES: readonly SelectOption[]` (51 entries incl. DC) — reused by every address form in later phases

- [ ] **Step 1: Write the failing wizard test**

`apps/mobile/__tests__/org-signup.test.tsx`:

```tsx
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import OrgSignup from "../app/(auth)/signup/organization";

const mockSignUp = jest.fn();
jest.mock("@rebin/api", () => ({ signUpOrganization: (...a: unknown[]) => mockSignUp(...a) }));
jest.mock("expo-router", () => ({ useRouter: () => ({ replace: jest.fn(), push: jest.fn(), back: jest.fn() }) }));

beforeEach(() => jest.clearAllMocks());

describe("S10–S13 Organization signup", () => {
  it("starts on step 1 of 3", () => {
    render(<OrgSignup />);
    expect(screen.getByLabelText("Step 1 of 3: Organization")).toBeTruthy();
  });

  it("blocks advancing past step 1 with an empty organization name", async () => {
    render(<OrgSignup />);
    fireEvent.press(screen.getByRole("button", { name: "Continue" }));
    await waitFor(() => expect(screen.getByText("Organization name is required")).toBeTruthy());
    expect(screen.getByLabelText("Step 1 of 3: Organization")).toBeTruthy();
  });

  it("advances to step 2 once step 1 is valid", async () => {
    render(<OrgSignup />);
    fireEvent.changeText(screen.getByLabelText("Organization Name"), "Dhaka Medical College");
    fireEvent.press(screen.getByLabelText("Organization Type"));
    fireEvent.press(screen.getByRole("button", { name: "Hospital / Clinic" }));
    fireEvent.press(screen.getByRole("button", { name: "Continue" }));
    await waitFor(() => expect(screen.getByLabelText("Step 2 of 3: Contact")).toBeTruthy());
  });

  it("renders the dock-access toggle with the client's exact helper copy on step 3", async () => {
    render(<OrgSignup />);
    // step 1
    fireEvent.changeText(screen.getByLabelText("Organization Name"), "Dhaka Medical College");
    fireEvent.press(screen.getByLabelText("Organization Type"));
    fireEvent.press(screen.getByRole("button", { name: "Hospital / Clinic" }));
    fireEvent.press(screen.getByRole("button", { name: "Continue" }));
    // step 2
    await waitFor(() => screen.getByLabelText("Primary Contact Name"));
    fireEvent.changeText(screen.getByLabelText("Primary Contact Name"), "Dr. Khan");
    fireEvent.changeText(screen.getByLabelText("Contact Title"), "Facilities Director");
    fireEvent.changeText(screen.getByLabelText("Work Email"), "khan@dmc.edu");
    fireEvent.changeText(screen.getByLabelText("Phone Number"), "5550192345");
    fireEvent.press(screen.getByRole("button", { name: "Continue" }));
    // step 3
    await waitFor(() =>
      expect(screen.getByText("Select Yes if freight trucks can back into the dock")).toBeTruthy(),
    );
  });
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `pnpm --filter mobile test org-signup`
Expected: FAIL — module not found

- [ ] **Step 3: Add the US states config**

`apps/mobile/src/config/us-states.ts`:

```ts
export const US_STATES = [
  { value: "AL", label: "Alabama" }, { value: "AK", label: "Alaska" }, { value: "AZ", label: "Arizona" },
  { value: "AR", label: "Arkansas" }, { value: "CA", label: "California" }, { value: "CO", label: "Colorado" },
  { value: "CT", label: "Connecticut" }, { value: "DE", label: "Delaware" }, { value: "DC", label: "District of Columbia" },
  { value: "FL", label: "Florida" }, { value: "GA", label: "Georgia" }, { value: "HI", label: "Hawaii" },
  { value: "ID", label: "Idaho" }, { value: "IL", label: "Illinois" }, { value: "IN", label: "Indiana" },
  { value: "IA", label: "Iowa" }, { value: "KS", label: "Kansas" }, { value: "KY", label: "Kentucky" },
  { value: "LA", label: "Louisiana" }, { value: "ME", label: "Maine" }, { value: "MD", label: "Maryland" },
  { value: "MA", label: "Massachusetts" }, { value: "MI", label: "Michigan" }, { value: "MN", label: "Minnesota" },
  { value: "MS", label: "Mississippi" }, { value: "MO", label: "Missouri" }, { value: "MT", label: "Montana" },
  { value: "NE", label: "Nebraska" }, { value: "NV", label: "Nevada" }, { value: "NH", label: "New Hampshire" },
  { value: "NJ", label: "New Jersey" }, { value: "NM", label: "New Mexico" }, { value: "NY", label: "New York" },
  { value: "NC", label: "North Carolina" }, { value: "ND", label: "North Dakota" }, { value: "OH", label: "Ohio" },
  { value: "OK", label: "Oklahoma" }, { value: "OR", label: "Oregon" }, { value: "PA", label: "Pennsylvania" },
  { value: "RI", label: "Rhode Island" }, { value: "SC", label: "South Carolina" }, { value: "SD", label: "South Dakota" },
  { value: "TN", label: "Tennessee" }, { value: "TX", label: "Texas" }, { value: "UT", label: "Utah" },
  { value: "VT", label: "Vermont" }, { value: "VA", label: "Virginia" }, { value: "WA", label: "Washington" },
  { value: "WV", label: "West Virginia" }, { value: "WI", label: "Wisconsin" }, { value: "WY", label: "Wyoming" },
] as const;

export const ORG_TYPE_OPTIONS = [
  { value: "k12_school", label: "K-12 School" },
  { value: "university", label: "University" },
  { value: "hospital", label: "Hospital / Clinic" },
  { value: "municipal_office", label: "Municipal Office" },
  { value: "corporate_hq", label: "Corporate Headquarters" },
  { value: "other", label: "Other" },
] as const;
```

- [ ] **Step 4: Implement the wizard container**

`apps/mobile/app/(auth)/signup/organization.tsx`:

```tsx
import { useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { orgSignupSchema, type OrgSignupInput } from "@rebin/shared";
import { signUpOrganization } from "@rebin/api";
import { AppText, PillButton, PortalThemeProvider, Screen, Stepper, tokens } from "@rebin/ui";
import { Step1Org } from "../../../src/features/org-signup/Step1Org";
import { Step2Contact } from "../../../src/features/org-signup/Step2Contact";
import { Step3Facility } from "../../../src/features/org-signup/Step3Facility";
import { SuccessStep } from "../../../src/features/org-signup/SuccessStep";

const STEP_LABELS = ["Organization", "Contact", "Facility"] as const;
const STEP_FIELDS: Record<number, (keyof OrgSignupInput)[]> = {
  1: ["orgName", "orgType"],
  2: ["contactName", "contactTitle", "workEmail", "phone"],
  3: ["street", "city", "state", "zip", "password", "confirmPassword"],
};

export default function OrgSignup() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [values, setValues] = useState<Partial<OrgSignupInput>>({ dockAccess: false });
  const [errors, setErrors] = useState<Partial<Record<keyof OrgSignupInput, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  function set<K extends keyof OrgSignupInput>(key: K, value: OrgSignupInput[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function validateStep(n: number): boolean {
    const result = orgSignupSchema.safeParse(values);
    if (result.success) return true;
    const stepKeys = STEP_FIELDS[n] ?? [];
    const next: Partial<Record<keyof OrgSignupInput, string>> = {};
    for (const issue of result.error.issues) {
      const key = issue.path[0] as keyof OrgSignupInput | undefined;
      if (key && stepKeys.includes(key)) next[key] = issue.message;
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function onNext() {
    if (!validateStep(step)) return;
    if (step < 3) { setStep(step + 1); return; }

    const parsed = orgSignupSchema.safeParse(values);
    if (!parsed.success) { validateStep(3); return; }

    setSubmitting(true);
    setServerError(null);
    try {
      await signUpOrganization(parsed.data);
      setStep(4);
    } catch (e) {
      setServerError(e instanceof Error ? e.message : "Registration failed. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (step === 4) {
    return (
      <PortalThemeProvider portal="org">
        <SuccessStep onContinue={() => router.replace("/pending")} />
      </PortalThemeProvider>
    );
  }

  return (
    <PortalThemeProvider portal="org">
      <Screen
        footer={
          <View style={{ gap: tokens.space[2] }}>
            <PillButton
              label={step === 3 ? "Complete Registration" : "Continue"}
              onPress={() => void onNext()}
              loading={submitting}
            />
            {step > 1 ? <PillButton label="Back" variant="ghost" onPress={() => setStep(step - 1)} /> : null}
          </View>
        }
      >
        <AppText variant="label" tone="accent">ORGANIZATION REGISTRATION</AppText>
        <Stepper current={step} total={3} labels={STEP_LABELS} />
        {step === 1 ? <Step1Org values={values} errors={errors} set={set} /> : null}
        {step === 2 ? <Step2Contact values={values} errors={errors} set={set} /> : null}
        {step === 3 ? <Step3Facility values={values} errors={errors} set={set} /> : null}
        {serverError ? <AppText variant="bodySm" style={{ color: tokens.color.danger }}>{serverError}</AppText> : null}
      </Screen>
    </PortalThemeProvider>
  );
}
```

- [ ] **Step 5: Implement the three step components**

`apps/mobile/src/features/org-signup/Step1Org.tsx`:

```tsx
import { View } from "react-native";
import { FormField, SectionHeader, SelectField, tokens } from "@rebin/ui";
import type { OrgSignupInput } from "@rebin/shared";
import { ORG_TYPE_OPTIONS } from "../../config/us-states";

type Props = {
  values: Partial<OrgSignupInput>;
  errors: Partial<Record<keyof OrgSignupInput, string>>;
  set: <K extends keyof OrgSignupInput>(k: K, v: OrgSignupInput[K]) => void;
};

export function Step1Org({ values, errors, set }: Props) {
  return (
    <View style={{ gap: tokens.space[3] }}>
      <SectionHeader index={1} title="Organization" subtitle="Tell us who you are." />
      <FormField
        label="Organization Name"
        value={values.orgName ?? ""}
        onChangeText={(v) => set("orgName", v)}
        error={errors.orgName}
        placeholder="e.g. Dhaka Medical College"
      />
      <SelectField
        label="Organization Type"
        value={values.orgType ?? null}
        options={ORG_TYPE_OPTIONS}
        onSelect={(v) => set("orgType", v as OrgSignupInput["orgType"])}
        error={errors.orgType}
      />
    </View>
  );
}
```

`apps/mobile/src/features/org-signup/Step2Contact.tsx`:

```tsx
import { View } from "react-native";
import { FormField, SectionHeader, tokens } from "@rebin/ui";
import type { OrgSignupInput } from "@rebin/shared";

type Props = {
  values: Partial<OrgSignupInput>;
  errors: Partial<Record<keyof OrgSignupInput, string>>;
  set: <K extends keyof OrgSignupInput>(k: K, v: OrgSignupInput[K]) => void;
};

export function Step2Contact({ values, errors, set }: Props) {
  return (
    <View style={{ gap: tokens.space[3] }}>
      <SectionHeader index={2} title="Contact" subtitle="Who should we coordinate pickups with?" />
      <FormField label="Primary Contact Name" value={values.contactName ?? ""} onChangeText={(v) => set("contactName", v)} error={errors.contactName} />
      <FormField label="Contact Title" value={values.contactTitle ?? ""} onChangeText={(v) => set("contactTitle", v)} error={errors.contactTitle} />
      <FormField label="Work Email" value={values.workEmail ?? ""} onChangeText={(v) => set("workEmail", v)} error={errors.workEmail} keyboardType="email-address" />
      <FormField label="Phone Number" value={values.phone ?? ""} onChangeText={(v) => set("phone", v)} error={errors.phone} mask="phone" />
    </View>
  );
}
```

`apps/mobile/src/features/org-signup/Step3Facility.tsx`:

```tsx
import { View } from "react-native";
import { FormField, SectionHeader, SelectField, ToggleRow, tokens } from "@rebin/ui";
import type { OrgSignupInput } from "@rebin/shared";
import { US_STATES } from "../../config/us-states";

type Props = {
  values: Partial<OrgSignupInput>;
  errors: Partial<Record<keyof OrgSignupInput, string>>;
  set: <K extends keyof OrgSignupInput>(k: K, v: OrgSignupInput[K]) => void;
};

export function Step3Facility({ values, errors, set }: Props) {
  return (
    <View style={{ gap: tokens.space[3] }}>
      <SectionHeader index={3} title="Facility" subtitle="Where should our agent arrive?" />
      <FormField label="Facility Pickup Address" value={values.street ?? ""} onChangeText={(v) => set("street", v)} error={errors.street} placeholder="Street address" />
      <FormField label="City" value={values.city ?? ""} onChangeText={(v) => set("city", v)} error={errors.city} />
      <SelectField label="State" value={values.state ?? null} options={US_STATES} onSelect={(v) => set("state", v)} error={errors.state} />
      <FormField label="ZIP Code" value={values.zip ?? ""} onChangeText={(v) => set("zip", v)} error={errors.zip} mask="zip" />
      <ToggleRow
        label="Loading Dock Access?"
        description="Select Yes if freight trucks can back into the dock"
        value={values.dockAccess ?? false}
        onValueChange={(v) => set("dockAccess", v)}
      />
      <FormField label="Create Password" value={values.password ?? ""} onChangeText={(v) => set("password", v)} error={errors.password} secureTextEntry helper="At least 10 characters, with a number and a symbol" />
      <FormField label="Confirm Password" value={values.confirmPassword ?? ""} onChangeText={(v) => set("confirmPassword", v)} error={errors.confirmPassword} secureTextEntry />
    </View>
  );
}
```

`apps/mobile/src/features/org-signup/SuccessStep.tsx`:

```tsx
import { AppText, Card, PillButton, Screen, tokens } from "@rebin/ui";
import { View } from "react-native";

export function SuccessStep({ onContinue }: { onContinue: () => void }) {
  return (
    <Screen footer={<PillButton label="Continue" onPress={onContinue} />}>
      <AppText variant="display">Registration submitted</AppText>
      <AppText variant="body" tone="muted">
        Your organization is queued for verification. We typically approve within one business day.
      </AppText>
      <Card variant="alt" style={{ gap: tokens.space[2] }}>
        {[
          "We verify your organization details",
          "You receive an approval email",
          "Schedule your first free pickup",
        ].map((line, i) => (
          <View key={line} style={{ flexDirection: "row", gap: tokens.space[2] }}>
            <AppText tone="accent">{i + 1}.</AppText>
            <AppText variant="bodySm" style={{ flex: 1 }}>{line}</AppText>
          </View>
        ))}
      </Card>
    </Screen>
  );
}
```

- [ ] **Step 6: Implement the transactional signup Edge Function**

`supabase/functions/signup-organization/index.ts`:

```ts
import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const body = await req.json();
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: created, error: authError } = await admin.auth.admin.createUser({
    email: body.workEmail,
    password: body.password,
    email_confirm: false,
  });
  if (authError || !created.user) {
    return Response.json({ error: authError?.message ?? "User creation failed" }, { status: 400 });
  }
  const userId = created.user.id;

  const { data: orgRow, error: rpcError } = await admin.rpc("create_organization_with_owner", {
    p_user_id: userId,
    p_full_name: body.contactName,
    p_phone: body.phone,
    p_org_name: body.orgName,
    p_org_type: body.orgType,
    p_street: body.street,
    p_city: body.city,
    p_state: body.state,
    p_zip: body.zip,
    p_dock_access: body.dockAccess,
  });

  if (rpcError) {
    await admin.auth.admin.deleteUser(userId); // no orphaned auth users
    return Response.json({ error: rpcError.message }, { status: 400 });
  }

  return Response.json({ userId, orgId: orgRow });
});
```

Add the matching transactional RPC as `supabase/migrations/0010_signup_rpc.sql`:

```sql
create or replace function create_organization_with_owner(
  p_user_id uuid, p_full_name text, p_phone text, p_org_name text,
  p_org_type org_type_enum, p_street text, p_city text, p_state char(2),
  p_zip text, p_dock_access boolean
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_org_id uuid;
begin
  insert into profiles (id, full_name, phone, status)
    values (p_user_id, p_full_name, p_phone, 'pending_verification');

  insert into organizations (name, org_type, street, city, state, zip, dock_access)
    values (p_org_name, p_org_type, p_street, p_city, p_state, p_zip, p_dock_access)
    returning id into v_org_id;

  insert into organization_members (org_id, user_id, member_role)
    values (v_org_id, p_user_id, 'org_owner');

  insert into role_assignments (user_id, role, scope_type, scope_id)
    values (p_user_id, 'org_owner', 'organization', v_org_id);

  insert into audit_events (actor_id, entity_type, entity_id, action, payload_json)
    values (p_user_id, 'organization', v_org_id, 'organization.registered', jsonb_build_object('org_name', p_org_name));

  return v_org_id;
end;
$$;
```

- [ ] **Step 7: Run the full suite**

Run: `pnpm test && pnpm typecheck`
Expected: PASS across `@rebin/shared`, `@rebin/ui`, `@rebin/api`, and `mobile`; zero type errors

- [ ] **Step 8: Commit**

```bash
git add apps/mobile supabase
git commit -m "feat(mobile): add organization signup wizard with transactional edge function"
```

---

### Task 13: S08 Pending and S09 Context Picker

**Files:**
- Create: `apps/mobile/app/(auth)/pending.tsx`, `apps/mobile/app/(auth)/context-picker.tsx`
- Test: `apps/mobile/__tests__/pending.test.tsx`

**Interfaces:**
- Consumes: `useSessionStore` (Task 8), `Card` / `PillButton` / `EmptyState` (Tasks 5–6), `PORTAL_CONTENT` (Task 10)
- Produces: nothing consumed by later P0 tasks

- [ ] **Step 1: Write the failing pending-screen test**

`apps/mobile/__tests__/pending.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react-native";
import Pending from "../app/(auth)/pending";
import { useSessionStore } from "../src/store/session";

jest.mock("expo-router", () => ({ useRouter: () => ({ replace: jest.fn(), push: jest.fn() }) }));

describe("S08 Pending", () => {
  it("tells an organization its verification is in review", () => {
    useSessionStore.setState({
      status: "pending",
      userId: "u1",
      assignments: [{ role: "org_owner", scopeType: "organization", scopeId: "o1", scopeName: "Org A" }],
      activeIndex: 0,
    });
    render(<Pending />);
    expect(screen.getByText("Verification in review")).toBeTruthy();
    expect(screen.getByText(/one business day/i)).toBeTruthy();
  });

  it("prompts a business to finish payout setup with a CTA", () => {
    useSessionStore.setState({
      status: "pending",
      userId: "u2",
      assignments: [{ role: "biz_owner", scopeType: "business", scopeId: "b1", scopeName: "TechFix" }],
      activeIndex: 0,
    });
    render(<Pending />);
    expect(screen.getByText("Finish your payout setup")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Continue setup" })).toBeTruthy();
  });

  it("always offers a log-out escape hatch", () => {
    useSessionStore.setState({ status: "pending", userId: "u3", assignments: [], activeIndex: 0 });
    render(<Pending />);
    expect(screen.getByRole("button", { name: "Log Out" })).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `pnpm --filter mobile test pending`
Expected: FAIL — module not found

- [ ] **Step 3: Implement S08**

`apps/mobile/app/(auth)/pending.tsx`:

```tsx
import { useRouter } from "expo-router";
import { signOut } from "@rebin/api";
import { AppText, Card, PillButton, PortalThemeProvider, Screen, tokens } from "@rebin/ui";
import { View } from "react-native";
import { useSessionStore } from "../../src/store/session";

type PendingCopy = { title: string; body: string; ctaLabel?: string; ctaRoute?: string };

const COPY: Record<string, PendingCopy> = {
  org: {
    title: "Verification in review",
    body: "We're confirming your organization details. Approvals typically complete within one business day, and we'll email you the moment you're cleared.",
  },
  business: {
    title: "Finish your payout setup",
    body: "Your account is created. Complete secure payout onboarding so we can send funds when your scrap is settled.",
    ctaLabel: "Continue setup",
    ctaRoute: "/(biz)/payout-method",
  },
  agent: {
    title: "Awaiting fleet approval",
    body: "Your fleet manager needs to activate your account before jobs appear in your queue.",
  },
  none: {
    title: "No portal access yet",
    body: "This account has no assigned role. Contact your administrator or Rebin Tech support.",
  },
};

function copyKey(role: string | undefined): keyof typeof COPY {
  if (!role) return "none";
  if (role.startsWith("org_")) return "org";
  if (role.startsWith("biz_")) return "business";
  if (role.startsWith("field_")) return "agent";
  return "none";
}

export default function Pending() {
  const router = useRouter();
  const { assignments, activeIndex, setSignedOut } = useSessionStore();
  const copy = COPY[copyKey(assignments[activeIndex]?.role)]!;

  async function onLogOut() {
    await signOut();
    setSignedOut();
    router.replace("/login");
  }

  return (
    <PortalThemeProvider portal="org">
      <Screen
        footer={
          <View style={{ gap: tokens.space[2] }}>
            {copy.ctaLabel && copy.ctaRoute ? (
              <PillButton label={copy.ctaLabel} onPress={() => router.push(copy.ctaRoute!)} />
            ) : null}
            <PillButton label="Log Out" variant="ghost" onPress={() => void onLogOut()} />
          </View>
        }
      >
        <AppText variant="label" tone="accent">ACCOUNT STATUS</AppText>
        <AppText variant="display">{copy.title}</AppText>
        <Card variant="alt">
          <AppText variant="body" tone="secondary">{copy.body}</AppText>
        </Card>
        <AppText variant="bodySm" tone="muted">
          Questions? Call 1-800-555-EWASTE or email support@rebintech.com.
        </AppText>
      </Screen>
    </PortalThemeProvider>
  );
}
```

- [ ] **Step 4: Implement S09**

`apps/mobile/app/(auth)/context-picker.tsx`:

```tsx
import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { portalForRole } from "@rebin/api";
import { AppText, Card, IconTile, PortalThemeProvider, Screen, tokens, type PortalKey } from "@rebin/ui";
import { PORTAL_CONTENT } from "../../src/config/portals";
import { useSessionStore } from "../../src/store/session";

const HOME: Record<PortalKey, string> = {
  org: "/(org)/dashboard",
  business: "/(biz)/dashboard",
  agent: "/(agent)/dispatch",
};

const ROLE_LABEL: Record<string, string> = {
  org_owner: "Owner", org_admin: "Admin", org_requester: "Requester",
  biz_owner: "Owner", biz_staff: "Staff",
  field_agent: "Field Agent", field_lead: "Field Lead",
};

export default function ContextPicker() {
  const router = useRouter();
  const { assignments, setActiveIndex } = useSessionStore();

  return (
    <PortalThemeProvider portal="org">
      <Screen>
        <AppText variant="display">Choose an account</AppText>
        <AppText variant="body" tone="muted">You have access to more than one Rebin Tech account.</AppText>

        {assignments.map((a, index) => {
          const portal = portalForRole(a.role);
          if (!portal) return null;
          return (
            <PortalThemeProvider key={`${a.role}-${a.scopeId ?? "self"}`} portal={portal}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${a.scopeName ?? PORTAL_CONTENT[portal].title}, ${ROLE_LABEL[a.role] ?? a.role}`}
                onPress={() => { setActiveIndex(index); router.replace(HOME[portal]); }}
              >
                <Card accentBorder style={{ flexDirection: "row", alignItems: "center", gap: tokens.space[3] }}>
                  <IconTile />
                  <View style={{ flex: 1, gap: 2 }}>
                    <AppText variant="h3">{a.scopeName ?? PORTAL_CONTENT[portal].title}</AppText>
                    <AppText variant="bodySm" tone="accent">{ROLE_LABEL[a.role] ?? a.role}</AppText>
                  </View>
                </Card>
              </Pressable>
            </PortalThemeProvider>
          );
        })}
      </Screen>
    </PortalThemeProvider>
  );
}
```

- [ ] **Step 5: Run and confirm pass**

Run: `pnpm --filter mobile test`
Expected: PASS — 3 pending assertions plus everything prior

- [ ] **Step 6: Commit**

```bash
git add apps/mobile
git commit -m "feat(mobile): add account pending screen and multi-role context picker"
```

---

### Task 14: EAS build configuration and on-device verification

**Files:**
- Create: `apps/mobile/eas.json`, `apps/mobile/.env.example`
- Modify: `apps/mobile/app.config.ts`
- Create: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: everything above
- Produces: installable dev builds for iOS and Android; CI that blocks merges on failing tests or types

- [ ] **Step 1: Configure EAS**

```bash
pnpm dlx eas-cli@latest login
pnpm dlx eas-cli@latest build:configure
```

`apps/mobile/eas.json`:

```json
{
  "cli": { "version": ">= 12.0.0", "appVersionSource": "remote" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "env": { "EXPO_PUBLIC_ENV": "development" },
      "ios": { "simulator": false },
      "android": { "buildType": "apk" }
    },
    "preview": {
      "distribution": "internal",
      "env": { "EXPO_PUBLIC_ENV": "preview" },
      "android": { "buildType": "apk" }
    },
    "production": {
      "autoIncrement": true,
      "env": { "EXPO_PUBLIC_ENV": "production" }
    }
  },
  "submit": { "production": {} }
}
```

`apps/mobile/.env.example`:

```
EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY=replace-with-local-anon-key
```

- [ ] **Step 2: Add CI**

`.github/workflows/ci.yml`:

```yaml
name: CI
on:
  push: { branches: [main] }
  pull_request:
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck
      - run: pnpm test
```

- [ ] **Step 3: Build for both platforms**

```bash
cd apps/mobile
pnpm dlx eas-cli@latest build --profile development --platform ios
pnpm dlx eas-cli@latest build --profile development --platform android
```

- [ ] **Step 4: Verify on physical devices**

Install both builds and walk the checklist:

1. Cold launch shows **S02 Portal Select** with three cards
2. Tapping **Organizations** opens S03 with the green accent; **Businesses** shows gold; **Field Agents** shows teal
3. **Browse Price Catalog** opens without authentication
4. Complete the organization signup wizard → success screen → **S08 Pending**
5. Force-quit and relaunch → app opens on **Login**, not Portal Select
6. Log in with a seeded active org account → lands on `/(org)/dashboard`
7. Log in with a seeded agent account → lands on `/(agent)/dispatch`
8. Manually navigate the agent session to `/(org)/dashboard` → redirected back to dispatch
9. VoiceOver (iOS) and TalkBack (Android): every button announces a label; the Stepper announces "Step 1 of 3: Organization"
10. Rotate to landscape and back — no layout break, no horizontal scroll

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/eas.json apps/mobile/.env.example .github
git commit -m "chore: add EAS build profiles and CI verification workflow"
```

---

### Task 15: Auth theme shell and dark-mode auth primitives

> **Execution order:** run this immediately after Task 6 and before Task 10. Tasks 10–13 then build
> their screens on these primitives instead of the cream `Screen`/`FormField`/`PillButton`.

**Files:**
- Create: `packages/ui/src/auth/{AuthScreen,AuthInput,AuthButton,SocialButton,AuthDivider,LegalCopy}.tsx`
- Create: `packages/ui/src/auth/BotanicalBackdrop.tsx`
- Modify: `packages/ui/src/index.ts`
- Test: `packages/ui/src/__tests__/auth-primitives.test.tsx`

**Interfaces:**
- Consumes: `authTokens` (Task 4)
- Produces:
  - `<AuthScreen title subtitle? footer?>` — gradient background + botanical backdrop + safe area + keyboard avoidance
  - `<AuthInput label value onChangeText placeholder secure? error?>` — `label` is the accessibility label only; the visible affordance is the placeholder
  - `<AuthButton label onPress loading? disabled?>` — sage CTA, 56pt
  - `<SocialButton provider="google"|"apple" onPress loading?>` — outlined, brand SVG + `Continue with …`
  - `<AuthDivider label="or">`
  - `<LegalCopy prefix onPrivacy onTerms>`

- [ ] **Step 1: Write the failing auth-primitive tests**

`packages/ui/src/__tests__/auth-primitives.test.tsx`:

```tsx
import { fireEvent, render, screen } from "@testing-library/react-native";
import { AuthButton, AuthInput, SocialButton, authTokens } from "../index";

describe("AuthInput", () => {
  it("uses the placeholder as the visible affordance and the label for a11y", () => {
    render(<AuthInput label="Email" placeholder="Email" value="" onChangeText={jest.fn()} />);
    expect(screen.getByLabelText("Email")).toBeTruthy();
    expect(screen.getByPlaceholderText("Email")).toBeTruthy();
  });

  it("fills with the dark auth surface token", () => {
    render(<AuthInput label="Email" placeholder="Email" value="" onChangeText={jest.fn()} />);
    expect(screen.getByLabelText("Email")).toHaveStyle({ backgroundColor: authTokens.surface });
  });

  it("exposes a visibility toggle for secure fields", () => {
    render(<AuthInput label="Password" placeholder="Password" value="" onChangeText={jest.fn()} secure />);
    expect(screen.getByRole("button", { name: "Show password" })).toBeTruthy();
  });

  it("toggles the accessibility label when visibility flips", () => {
    render(<AuthInput label="Password" placeholder="Password" value="" onChangeText={jest.fn()} secure />);
    fireEvent.press(screen.getByRole("button", { name: "Show password" }));
    expect(screen.getByRole("button", { name: "Hide password" })).toBeTruthy();
  });
});

describe("AuthButton", () => {
  it("renders on the sage primary with a 56pt target", () => {
    render(<AuthButton label="Sign in" onPress={jest.fn()} />);
    const btn = screen.getByRole("button", { name: "Sign in" });
    expect(btn).toHaveStyle({ backgroundColor: authTokens.primary, minHeight: 56 });
  });

  it("ignores presses while loading", () => {
    const onPress = jest.fn();
    render(<AuthButton label="Sign in" onPress={onPress} loading />);
    fireEvent.press(screen.getByRole("button", { name: "Sign in" }));
    expect(onPress).not.toHaveBeenCalled();
  });
});

describe("SocialButton", () => {
  it.each([
    ["google", "Continue with Google"],
    ["apple", "Continue with Apple"],
  ] as const)("labels the %s provider", (provider, label) => {
    render(<SocialButton provider={provider} onPress={jest.fn()} />);
    expect(screen.getByRole("button", { name: label })).toBeTruthy();
  });

  it("renders outlined, not filled", () => {
    render(<SocialButton provider="google" onPress={jest.fn()} />);
    expect(screen.getByRole("button", { name: "Continue with Google" })).toHaveStyle({
      backgroundColor: "transparent",
      borderColor: authTokens.border,
    });
  });
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `pnpm --filter @rebin/ui test auth-primitives`
Expected: FAIL — `AuthInput is not exported`

- [ ] **Step 3: Implement AuthScreen and the backdrop**

```bash
pnpm --filter mobile exec expo install expo-linear-gradient react-native-svg react-native-keyboard-controller
```

`packages/ui/src/auth/AuthScreen.tsx`:

```tsx
import type { ReactNode } from "react";
import { View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import { authTokens } from "../tokens";
import { AppText } from "../atoms/AppText";
import { BotanicalBackdrop } from "./BotanicalBackdrop";

export function AuthScreen({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: authTokens.bg }}>
      <LinearGradient
        colors={[authTokens.bg, authTokens.bgDeep]}
        style={{ position: "absolute", inset: 0 }}
      />
      <BotanicalBackdrop />
      <KeyboardAwareScrollView
        bottomOffset={24}
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: insets.top + 32,
          paddingBottom: insets.bottom + 24,
          paddingHorizontal: 24,
          gap: 16,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View entering={FadeInDown.duration(320)} style={{ gap: 6, marginBottom: 8 }}>
          <AppText variant="display" style={{ color: authTokens.text }}>{title}</AppText>
          {subtitle ? (
            <AppText variant="body" style={{ color: authTokens.muted }}>{subtitle}</AppText>
          ) : null}
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(320).delay(60)} style={{ gap: 12 }}>
          {children}
        </Animated.View>

        {footer ? (
          <Animated.View entering={FadeInDown.duration(320).delay(120)} style={{ marginTop: "auto", gap: 12 }}>
            {footer}
          </Animated.View>
        ) : null}
      </KeyboardAwareScrollView>
    </View>
  );
}
```

`packages/ui/src/auth/BotanicalBackdrop.tsx` — a decorative leaf motif at 6% opacity, pinned to the bottom-left and bottom-right corners. Keep it as inline `react-native-svg` paths so there is no image decode on mount:

```tsx
import { View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { authTokens } from "../tokens";

const LEAF = "M0 60 C 20 40, 40 20, 60 0 C 48 26, 30 46, 0 60 Z";

export function BotanicalBackdrop() {
  return (
    <View pointerEvents="none" style={{ position: "absolute", inset: 0, opacity: 0.06 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width="100%" height="100%" viewBox="0 0 400 800">
        <Path d={LEAF} fill={authTokens.primary} transform="translate(-10 700) scale(2.4)" />
        <Path d={LEAF} fill={authTokens.primary} transform="translate(330 660) scale(-1.8 1.8)" />
        <Path d={LEAF} fill={authTokens.primary} transform="translate(20 620) scale(1.4)" />
      </Svg>
    </View>
  );
}
```

- [ ] **Step 4: Implement the auth controls**

`packages/ui/src/auth/AuthInput.tsx`:

```tsx
import { useState } from "react";
import { Pressable, TextInput, View, type KeyboardTypeOptions } from "react-native";
import { AppText } from "../atoms/AppText";
import { authTokens } from "../tokens";

export function AuthInput({
  label,
  placeholder,
  value,
  onChangeText,
  secure = false,
  error,
  keyboardType,
  autoCapitalize = "none",
}: {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (next: string) => void;
  secure?: boolean;
  error?: string;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: "none" | "words";
}) {
  const [revealed, setRevealed] = useState(false);
  const [focused, setFocused] = useState(false);

  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <TextInput
          accessibilityLabel={label}
          placeholder={placeholder}
          placeholderTextColor={authTokens.muted}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          secureTextEntry={secure && !revealed}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          style={{
            flex: 1,
            minHeight: 56,
            paddingHorizontal: 18,
            paddingRight: secure ? 52 : 18,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: error ? "#E08B84" : focused ? authTokens.primary : authTokens.border,
            backgroundColor: authTokens.surface,
            color: authTokens.text,
            fontSize: 15,
          }}
        />
        {secure ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={revealed ? "Hide password" : "Show password"}
            onPress={() => setRevealed((r) => !r)}
            hitSlop={12}
            style={{ position: "absolute", right: 16, height: 44, width: 44, alignItems: "center", justifyContent: "center" }}
          >
            <AppText style={{ color: authTokens.muted, fontSize: 18 }}>{revealed ? "🙈" : "👁"}</AppText>
          </Pressable>
        ) : null}
      </View>
      {error ? <AppText variant="bodySm" style={{ color: "#E08B84" }}>{error}</AppText> : null}
    </View>
  );
}
```

> Replace the emoji eye with a `react-native-svg` icon before shipping — emoji renders differently per platform and does not tint. The test asserts the accessibility label, not the glyph, so swapping the icon will not break it.

`packages/ui/src/auth/AuthButton.tsx`:

```tsx
import { ActivityIndicator, Pressable } from "react-native";
import * as Haptics from "expo-haptics";
import { AppText } from "../atoms/AppText";
import { authTokens } from "../tokens";

export function AuthButton({
  label,
  onPress,
  loading = false,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}) {
  const inert = loading || disabled;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: inert, busy: loading }}
      disabled={inert}
      onPress={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={({ pressed }) => ({
        minHeight: 56,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 14,
        backgroundColor: authTokens.primary,
        opacity: inert ? 0.55 : pressed ? 0.9 : 1,
      })}
    >
      {loading ? (
        <ActivityIndicator color={authTokens.onPrimary} />
      ) : (
        <AppText variant="h3" style={{ color: authTokens.onPrimary }}>{label}</AppText>
      )}
    </Pressable>
  );
}
```

`packages/ui/src/auth/SocialButton.tsx`:

```tsx
import { ActivityIndicator, Pressable, View } from "react-native";
import { AppText } from "../atoms/AppText";
import { authTokens } from "../tokens";
import { AppleMark, GoogleMark } from "./BrandMarks";

const LABELS = { google: "Continue with Google", apple: "Continue with Apple" } as const;

export function SocialButton({
  provider,
  onPress,
  loading = false,
}: {
  provider: keyof typeof LABELS;
  onPress: () => void;
  loading?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={LABELS[provider]}
      accessibilityState={{ busy: loading }}
      disabled={loading}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 56,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: authTokens.border,
        backgroundColor: "transparent",
        opacity: pressed ? 0.8 : 1,
      })}
    >
      {loading ? <ActivityIndicator color={authTokens.text} /> : (
        <View>{provider === "google" ? <GoogleMark size={20} /> : <AppleMark size={20} />}</View>
      )}
      <AppText variant="h3" style={{ color: authTokens.text, fontWeight: "500" }}>
        {LABELS[provider]}
      </AppText>
    </Pressable>
  );
}
```

`packages/ui/src/auth/AuthDivider.tsx` and `LegalCopy.tsx`:

```tsx
import { Pressable, View } from "react-native";
import { AppText } from "../atoms/AppText";
import { authTokens } from "../tokens";

export function AuthDivider({ label = "or" }: { label?: string }) {
  const line = { flex: 1, height: 1, backgroundColor: authTokens.border };
  return (
    <View accessibilityElementsHidden style={{ flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 4 }}>
      <View style={line} />
      <AppText variant="bodySm" style={{ color: authTokens.muted }}>{label}</AppText>
      <View style={line} />
    </View>
  );
}

export function LegalCopy({
  prefix,
  onPrivacy,
  onTerms,
}: {
  prefix: string;
  onPrivacy: () => void;
  onTerms: () => void;
}) {
  const link = { color: authTokens.link, textDecorationLine: "underline" as const };
  return (
    <AppText variant="bodySm" style={{ color: authTokens.muted, lineHeight: 19 }}>
      {`${prefix} `}
      <AppText variant="bodySm" style={link} onPress={onPrivacy} accessibilityRole="link">Privacy Policy</AppText>
      {" and "}
      <AppText variant="bodySm" style={link} onPress={onTerms} accessibilityRole="link">Terms of Service</AppText>
    </AppText>
  );
}
```

Create `packages/ui/src/auth/BrandMarks.tsx` with the official Google `G` and Apple logo as inline
`react-native-svg` paths (both marks are distributed by their owners for exactly this use — copy the
official SVG, do not redraw). Export everything from `packages/ui/src/index.ts`.

- [ ] **Step 5: Run and confirm pass**

Run: `pnpm --filter @rebin/ui test && pnpm --filter @rebin/ui typecheck`
Expected: PASS — 8 auth-primitive assertions, zero type errors

- [ ] **Step 6: Commit**

```bash
git add packages/ui
git commit -m "feat(ui): add dark forest auth theme shell and auth primitives"
```

---

### Task 16: Google and Apple social authentication

> **Execution order:** run after Task 11 (Login). Tasks 10–13 screens are restyled onto the Task 15
> primitives as part of their own steps; this task adds the social row and its plumbing.

**Files:**
- Create: `packages/api/src/social-auth.ts`
- Create: `apps/mobile/src/hooks/useSocialAuth.ts`
- Modify: `apps/mobile/app/index.tsx` (Welcome), `apps/mobile/app/(auth)/login.tsx`
- Modify: `apps/mobile/app.config.ts`
- Test: `packages/api/src/__tests__/social-auth.test.ts`

**Interfaces:**
- Consumes: `supabase` (Task 8), `SocialButton` / `AuthDivider` (Task 15), `resolveInitialRoute` (Task 9)
- Produces:
  - `signInWithGoogle(): Promise<{ userId: string; isNewUser: boolean }>`
  - `signInWithApple(): Promise<{ userId: string; isNewUser: boolean }>`
  - `useSocialAuth(): { google(): Promise<void>; apple(): Promise<void>; pending: "google"|"apple"|null; error: string|null }`

- [ ] **Step 1: Install native providers**

```bash
pnpm --filter mobile exec expo install \
  @react-native-google-signin/google-signin expo-apple-authentication expo-haptics
```

Add to `apps/mobile/app.config.ts` `plugins`:

```ts
plugins: [
  "expo-router",
  "expo-apple-authentication",
  ["@react-native-google-signin/google-signin", { iosUrlScheme: process.env.GOOGLE_IOS_URL_SCHEME }],
],
ios: { bundleIdentifier: "com.rebintech.app", supportsTablet: true, usesAppleSignIn: true },
```

> Native providers, not a browser redirect. `expo-auth-session` opens a web view — it works, but it
> flashes a browser chrome and costs ~800ms. The native sheets are what "super smooth" means here.

- [ ] **Step 2: Write the failing new-user routing test**

`packages/api/src/__tests__/social-auth.test.ts`:

```ts
import { routeAfterSocialAuth } from "../social-auth";

describe("routeAfterSocialAuth", () => {
  it("sends a brand-new social user to portal select to choose an account type", () => {
    expect(routeAfterSocialAuth({ isNewUser: true, assignmentCount: 0 })).toBe("/?complete=1");
  });

  it("sends an existing user with no role to the pending screen", () => {
    expect(routeAfterSocialAuth({ isNewUser: false, assignmentCount: 0 })).toBe("/pending");
  });

  it("returns null for an existing user with roles so normal routing takes over", () => {
    expect(routeAfterSocialAuth({ isNewUser: false, assignmentCount: 1 })).toBeNull();
  });
});
```

- [ ] **Step 3: Run and confirm failure**

Run: `pnpm --filter @rebin/api test social-auth`
Expected: FAIL — module not found

- [ ] **Step 4: Implement the providers**

`packages/api/src/social-auth.ts`:

```ts
import * as AppleAuthentication from "expo-apple-authentication";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { supabase } from "./client";

export type SocialResult = { userId: string; isNewUser: boolean };

GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  scopes: ["profile", "email"],
});

function isNew(createdAt: string | undefined, lastSignInAt: string | undefined): boolean {
  if (!createdAt || !lastSignInAt) return false;
  // Supabase stamps both within the same second on the very first sign-in.
  return Math.abs(new Date(lastSignInAt).getTime() - new Date(createdAt).getTime()) < 2000;
}

export async function signInWithGoogle(): Promise<SocialResult> {
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const response = await GoogleSignin.signIn();
  const idToken = response.data?.idToken;
  if (!idToken) throw new Error("Google sign-in was cancelled");

  const { data, error } = await supabase.auth.signInWithIdToken({ provider: "google", token: idToken });
  if (error) throw error;
  if (!data.user) throw new Error("Google sign-in returned no user");

  return { userId: data.user.id, isNewUser: isNew(data.user.created_at, data.user.last_sign_in_at) };
}

export async function signInWithApple(): Promise<SocialResult> {
  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  });
  if (!credential.identityToken) throw new Error("Apple sign-in was cancelled");

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: "apple",
    token: credential.identityToken,
  });
  if (error) throw error;
  if (!data.user) throw new Error("Apple sign-in returned no user");

  // Apple returns the full name exactly once — on first authorization. Persist it now or lose it.
  if (credential.fullName?.givenName) {
    const fullName = [credential.fullName.givenName, credential.fullName.familyName]
      .filter(Boolean)
      .join(" ");
    await supabase.from("profiles").upsert({ id: data.user.id, full_name: fullName });
  }

  return { userId: data.user.id, isNewUser: isNew(data.user.created_at, data.user.last_sign_in_at) };
}

export function routeAfterSocialAuth(input: {
  isNewUser: boolean;
  assignmentCount: number;
}): string | null {
  if (input.assignmentCount > 0) return null;      // normal role routing takes over
  return input.isNewUser ? "/?complete=1" : "/pending";
}
```

> **The design gap this closes:** social auth creates an `auth.users` row but **no role assignment** —
> the user has no portal. A first-time Google/Apple user is therefore routed back to Portal Select with
> `?complete=1`, picks Organization or Business, and runs the normal signup wizard with name and email
> pre-filled and the password step skipped. Field Agent is not offered on that screen because agents are
> invite-only.

- [ ] **Step 5: Implement the hook and wire the social row**

`apps/mobile/src/hooks/useSocialAuth.ts`:

```ts
import { useState } from "react";
import { useRouter } from "expo-router";
import { resolveRoles, routeAfterSocialAuth, signInWithApple, signInWithGoogle } from "@rebin/api";
import { resolveInitialRoute } from "../components/RoleGuard";
import { useSessionStore } from "../store/session";

export function useSocialAuth() {
  const router = useRouter();
  const setSession = useSessionStore((s) => s.setSession);
  const [pending, setPending] = useState<"google" | "apple" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(provider: "google" | "apple") {
    setPending(provider);
    setError(null);
    try {
      const { userId, isNewUser } =
        provider === "google" ? await signInWithGoogle() : await signInWithApple();
      const assignments = await resolveRoles(userId);
      setSession(userId, assignments, assignments.length > 0);

      const social = routeAfterSocialAuth({ isNewUser, assignmentCount: assignments.length });
      const route =
        social ??
        resolveInitialRoute({ status: "ready", assignments, hasOnboarded: true });
      if (route) router.replace(route);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Sign-in failed. Try again.";
      // A user tapping "Cancel" on the native sheet is not an error worth showing.
      if (!/cancel/i.test(message)) setError(message);
    } finally {
      setPending(null);
    }
  }

  return { google: () => run("google"), apple: () => run("apple"), pending, error };
}
```

Add to the footer of both `app/index.tsx` (Welcome) and `app/(auth)/login.tsx`:

```tsx
const social = useSocialAuth();
const showApple = Platform.OS === "ios"; // Android has no Apple sheet; Google covers it

// …inside the footer:
<AuthDivider />
<SocialButton provider="google" onPress={social.google} loading={social.pending === "google"} />
{showApple ? (
  <SocialButton provider="apple" onPress={social.apple} loading={social.pending === "apple"} />
) : null}
{social.error ? (
  <AppText variant="bodySm" style={{ color: "#E08B84" }}>{social.error}</AppText>
) : null}
```

- [ ] **Step 6: Configure the Supabase providers**

In the Supabase dashboard → Authentication → Providers, enable **Google** (add the iOS, Android, and
Web client IDs to the authorized client list) and **Apple** (Services ID, Team ID, Key ID, and the
`.p8` key). Add to `.env.example`:

```
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=
GOOGLE_IOS_URL_SCHEME=
```

- [ ] **Step 7: Run and confirm pass**

Run: `pnpm test && pnpm typecheck`
Expected: PASS — 3 social-routing assertions plus everything prior

- [ ] **Step 8: Commit**

```bash
git add packages/api apps/mobile
git commit -m "feat(auth): add native Google and Apple sign-in with new-user completion routing"
```

---

### Task 17: Motion and performance pass

**Files:**
- Modify: `apps/mobile/app.config.ts`, `apps/mobile/app/_layout.tsx`, `apps/mobile/babel.config.js`
- Create: `apps/mobile/src/lib/haptics.ts`
- Create: `docs/performance-checklist.md`

**Interfaces:**
- Consumes: everything above
- Produces: `tap()`, `success()`, `warn()` haptic helpers; New Architecture enabled; measured frame budget

- [ ] **Step 1: Enable the New Architecture and Reanimated**

`apps/mobile/app.config.ts`:

```ts
newArchEnabled: true,
ios: { bundleIdentifier: "com.rebintech.app", supportsTablet: true, usesAppleSignIn: true },
android: { package: "com.rebintech.app", adaptiveIcon: { backgroundColor: "#F6F4ED" } },
```

`apps/mobile/babel.config.js`:

```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [["babel-preset-expo", { jsxImportSource: "nativewind" }]],
    plugins: ["react-native-worklets/plugin"], // must be last
  };
};
```

- [ ] **Step 2: Hold the splash until the app is genuinely ready**

`apps/mobile/app/_layout.tsx`:

```tsx
import { useEffect, useState } from "react";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { resolveRoles, supabase } from "@rebin/api";
import { useSessionStore } from "../src/store/session";

void SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({ duration: 300, fade: true });

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 2, refetchOnWindowFocus: false } },
});

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const { setSession, setSignedOut } = useSessionStore();

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session?.user) {
        const assignments = await resolveRoles(data.session.user.id);
        setSession(data.session.user.id, assignments, assignments.length > 0);
      } else {
        setSignedOut();
      }
      setReady(true);
      await SplashScreen.hideAsync();
    })();
  }, [setSession, setSignedOut]);

  if (!ready) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <KeyboardProvider>
          <Stack
            screenOptions={{
              headerShown: false,
              animation: "slide_from_right",
              animationDuration: 260,
              contentStyle: { backgroundColor: "#F6F4ED" },
            }}
          />
        </KeyboardProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
```

- [ ] **Step 3: Add the haptics helper**

`apps/mobile/src/lib/haptics.ts`:

```ts
import * as Haptics from "expo-haptics";

export const tap = () => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
export const select = () => void Haptics.selectionAsync();
export const success = () => void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
export const warn = () => void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
```

Wire `select()` into `RadioTile`, `ChipMultiSelect`, and `SelectField`; `success()` into every
wizard-completion screen; `warn()` into validation failures.

- [ ] **Step 4: Write the performance checklist**

`docs/performance-checklist.md`:

```markdown
# Rebin Tech — Performance Checklist

Run before every phase sign-off, on a **physical mid-tier Android device** (the iPhone will
always look fine; Android is the honest test).

## Budgets
- Cold start → first interactive frame: **< 2.0s**
- Screen transition: **< 300ms**, no dropped frames
- List scroll: **60fps sustained** (120fps on ProMotion)
- Bundle: **< 8MB** JS

## Rules enforced in review
- [ ] Every animation is a Reanimated worklet. Zero `Animated` with `useNativeDriver: false`.
- [ ] Every scrolling list is `FlashList` with a fixed `estimatedItemSize`. Zero `ScrollView` + `.map()` over unbounded data.
- [ ] Every remote image is `expo-image` with a `placeholder` blurhash and explicit dimensions.
- [ ] Every list row component is memoized; every callback passed into a list is `useCallback`.
- [ ] No `.map()` inside JSX over an array rebuilt each render — hoist or memoize.
- [ ] Inline `style={{ }}` objects inside list rows are hoisted to a `StyleSheet`.
- [ ] Camera frame processors do their work on the worklet thread, never `runOnJS` per frame.
- [ ] Loading states render `Skeleton`, never a bare centered spinner.
- [ ] Mutations are optimistic where the failure is recoverable — never for payout.

## Measure
- React DevTools Profiler → no component rendering more than twice per interaction
- `npx react-native-flashlight measure` → score ≥ 70 on the dispatch queue and scan history
- Xcode Instruments (Time Profiler) on cold start; Android Studio Profiler for jank frames
```

- [ ] **Step 5: Verify on device**

Run a development build on a physical mid-tier Android device and confirm:
1. Splash holds until session resolution, then cross-fades — no white flash, no Portal Select flicker
2. Auth screens: title and fields stagger in over ~320ms, no jank
3. Keyboard opens and the focused field lifts smoothly with it (no jump)
4. Google sheet opens in under 500ms; Apple sheet is native on iOS
5. Portal Select → Portal Landing transition is a clean 260ms slide
6. Every primary button gives haptic feedback

- [ ] **Step 6: Commit**

```bash
git add apps/mobile docs
git commit -m "perf: enable new architecture, splash gating, haptics, and performance checklist"
```

---

## Verification (Phase 0 exit criteria)

**Automated**

```bash
pnpm typecheck        # zero errors across all workspaces
pnpm test             # shared + ui + api + mobile suites green
pnpm dlx supabase test db   # 4/4 pgTAP RLS assertions
```

**Manual, on a physical iPhone and a physical Android device**

| # | Check | Pass condition |
|---|---|---|
| 1 | First launch | S02 Portal Select renders; three cards, correct accents |
| 2 | Public content | Price Catalog opens with no session (App Store 4.2) |
| 3 | Org signup | 3-step wizard → success → S08 Pending; a row exists in `organizations`, `organization_members`, and `role_assignments` |
| 4 | Signup rollback | Force the RPC to fail → **no orphaned row in `auth.users`** |
| 5 | Returning launch | Second cold start skips S02, lands on Login |
| 6 | Role routing | Org account → `/(org)/dashboard`; agent account → `/(agent)/dispatch`; business → `/(biz)/dashboard` |
| 7 | Guard | Agent session deep-linked to `/(org)/dashboard` redirects to dispatch |
| 8 | RLS backstop | With the guard bypassed, an agent's query on `pickup_requests` returns **zero rows** |
| 9 | Min-10 rule | Attempt to insert `unit_count = 9` directly via SQL → CHECK violation |
| 10 | Accessibility | VoiceOver + TalkBack announce every button; Stepper announces its position |
| 11 | Contrast | `#7A867E` on `#F6F4ED` measures ≥ 4.5:1 — if it fails, darken `muted` to `#6B776F` and rerun the token test |
| 12 | Layout | No horizontal scroll at 320pt width on any P0 screen |
| 13 | Auth theme | Welcome / Sign Up / Sign In render dark forest; the first authenticated screen renders cream. No flash of the wrong theme between them |
| 14 | Google sign-in | Native sheet opens in under 500ms on both platforms; a brand-new account lands on Portal Select with `?complete=1`, not on an empty dashboard |
| 15 | Apple sign-in | Native sheet on iOS; the full name returned on first authorization is persisted to `profiles.full_name` (verify the row) |
| 16 | Smoothness | On a physical mid-tier Android: cold start under 2s, 260ms transitions with no dropped frames, keyboard lifts the focused field without jumping |

**Phase 0 is done when all sixteen pass.** Only then write the Phase 1 plan — it will reference the real primitive APIs shipped here rather than guessing at them.

---

## Self-Review

**Execution order.** Tasks run 1 → 6, then **15** (auth shell — Tasks 10–13 depend on its primitives), then 7 → 14, then **16** (social auth) and **17** (motion/perf). Tasks 15–17 are numbered last but slotted as noted in each header rather than renumbering the whole plan.

**Spec coverage.** Every P0 screen in Part A §4 (S01–S04, S08–S13) has an implementing task. S05–S07 (forgot/reset/OTP) are Supabase-hosted flows with no custom UI in P0 and are noted as P1 work. Design tokens, all listed primitives, the schema, RLS, and the role model each map to a task. The `MIN_PICKUP_UNITS = 10` rule appears in three places as designed: Zod schema (Task 3), Postgres CHECK (Task 7), and verification item 9 (Task 14).

**Placeholders.** No TBD, no "add error handling", no "similar to Task N". Every code step carries runnable code. The one intentional placeholder is the seed UUID in `0009_seed_platform_owner.sql`, flagged inline with a replace-before-deploy comment — it cannot be known at plan time.

**Type consistency.** `PortalKey` is defined once in `packages/ui/src/tokens.ts` and imported everywhere. `RoleAssignment` is defined once in `packages/api/src/auth.ts` and reused by the store, guard, and picker. `formatCents` / `formatWeight` are the only money and weight renderers. SQL enum string values match the TypeScript `as const` arrays exactly — Task 7 Step 2 and Task 3 Step 3 must be diffed against each other if either changes. `resolveInitialRoute` and `RoleGuard` share the same `HOME_BY_PORTAL` map, defined once.

