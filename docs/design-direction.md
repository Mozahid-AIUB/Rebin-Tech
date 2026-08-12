# Rebin Tech — visual direction

Written before the redesign, so the decisions behind it survive it.

## The diagnosis

The app currently reads as generic, and the reason is specific: **it dresses an
industrial logistics product as a wellness app.**

```
bg #F6F4ED (cream) · primary #2E6B4F (green) · Plus Jakarta Sans · 20px radius
```

Cream, a mid green, and rounded white cards is the most-produced look in
software right now. Every recycling app, every sustainability landing page,
every AI-generated "eco" mockup arrives at it. It isn't wrong — it just isn't a
choice, and it says nothing true about this product.

What this product actually is: asset recovery with a chain of custody. Its
world is circuit boards, copper, anodised racks, pallets, weighbridges, asset
tags, serial numbers, manifests, dockets. A hospital uses it because it needs
to prove a specific drive was destroyed. A repair shop uses it to get paid by
weight and grade. Neither is buying herbal tea.

So the direction is **industrial record-keeping**, not eco lifestyle. Enough
green to say recycling; everything else drawn from the materials.

---

## 1 · Colour

Cream → steel. Gold → real copper. The same message, in metal.

| Token | Hex | Role |
|---|---|---|
| `ink` | `#141A17` | Text, dark surfaces. Graphite, never pure black. |
| `steel` | `#EDEEEA` | App background. Cool where cream was warm. |
| `surface` | `#FFFFFF` | Raised cards. |
| `line` | `#DCDED8` | Hairlines, the workhorse of the data layer. |
| `oxide` | `#2A5F45` | 🌿 Organization accent — oxidised green. |
| `copper` | `#A65E2E` | 🟡 Business accent — actual copper, not gold. |
| `patina` | `#1B6E62` | 🔷 Agent accent — copper's weathering. |
| `signal` | `#D08A1E` | Warning. An instrument lamp, not a highlighter. |
| `alarm` | `#B3423A` | Destructive. |

The three portal accents stay three, because the portals genuinely are three
products. They move from "green / gold / teal" to a copper oxidation story:
fresh oxide, raw copper, patina. Related by chemistry rather than by hue
rotation.

The dark auth palette (`#0E3A32`) is the one part of the current design with a
point of view. It stays, retuned to the new neutrals.

## 2 · Typography

The largest single change, and the one that does most of the work.

| Role | Face | Why |
|---|---|---|
| Display | **IBM Plex Sans Condensed**, Bold | Engineered, compressed, stencil-adjacent. Reads like plant signage. |
| Body | **IBM Plex Sans**, Regular / Medium | Drafting-table character; a workhorse with an accent. |
| Data | **IBM Plex Mono**, Medium | Serials, IDs, money, counts, timestamps. |

Plus Jakarta Sans goes. It is a good face and it is in every SaaS product
shipped since 2021; it makes this app look like all of them.

**Monospace for the data layer is the thesis.** This product's entire value is
that `ABC123XYZ` was collected, graded `working`, and paid at `$120.00`. Those
are records, not prose. Setting them in mono makes the app look like what it
is — and it is the one typographic move nobody arrives at by default for a
"recycling app".

Rules:
- Every serial, asset tag, quote id, request id → mono.
- Every money figure → mono, tabular figures, so columns align.
- Every count that sits in a column → mono.
- Never mono for sentences.

Scale keeps the current sizes; only families and letter-spacing change.
Condensed display allows a larger size in the same width, so `display` goes
32 → 34.

## 3 · Structure

Today everything is a white card with a 20px radius on cream, which flattens
hierarchy: a booking CTA and a read-only address block have identical weight.

Three surface levels instead:

| Level | Treatment | Used for |
|---|---|---|
| Floating | Blur + hairline top border, large soft shadow | Footer CTA, tab bar, sheets |
| Raised | White, radius 12, 1px `line`, small shadow | Actions, single objects |
| Flat | No fill, hairline rules between rows | Data — manifests, quote lines, details |

Radius 20 → 12. Less friendly, more instrument.

## 4 · Signature — the collection docket

Quotes and completed jobs render as a printed collection docket rather than as
a card of labelled fields.

```
┌─────────────────────────────────┐
│ REBIN · COLLECTION DOCKET       │
│ ─────────────────────────────── │
│ QT-9B832977          2026-08-11 │
│                                 │
│ 3 ×  Business laptop    working │
│      ABC123XYZ          $360.00 │
│ 2 ×  LCD monitor         broken │
│      —                   $10.00 │
│ ─────────────────────────────── │
│ TOTAL                   $370.00 │
│                                 │
│           ╭──────────╮          │
│           │ COLLECTED│  −2°     │
│           ╰──────────╯          │
└╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┘   ← torn edge, SVG
```

- Perforated bottom edge, drawn in SVG.
- Status as a **stamp** — boxed, mono, rotated −2°, ink-coloured — not a pill.
- Hairline rules, mono figures, right-aligned money.

This is the thing someone remembers, and it is derived from the product rather
than applied to it: a chain-of-custody business hands people dockets.

## 5 · Motion

Motion earns its place by doing one of three jobs: **confirm** a touch,
**orient** you to what changed, or **reveal** structure. Anything else is
decoration, and decoration is what makes an app feel cheap rather than
expensive.

Built on `react-native-reanimated` 4, already a dependency.

### Where motion goes

| Moment | Motion | Job it does |
|---|---|---|
| Screen enters | Stat tiles rise 8px + fade, 60ms apart | Orient: draws the eye across the row once |
| Stat value arrives | Count up from 0 over 500ms, ease-out | Reveal: a number that climbs registers; one that appears does not |
| Button press | Spring scale to 0.97, instant | Confirm: answers the finger before the network does |
| List row enters | Fade + 12px slide, staggered 40ms | Orient: shows what is new without a badge |
| Sheet opens | Spring (damping 18, stiffness 180) | Physical rather than mechanical |
| Status changes | Stamp cross-fades and settles from 1.06 scale | Orient: the state changed, and here is where |
| Job completed | Stamp lands with a spring + success haptic | The emotional peak of the product — the one flourish that is earned |
| Pull to refresh | Platform default | Familiarity beats invention |

### Where motion does not go

- Not on every card on every render — that is noise, and it janks on the cheap
  Android an agent carries in a warehouse.
- Not on text. Animated copy is never easier to read.
- Not on navigation beyond the platform transition.
- Nothing over 500ms. A field agent taps and moves; a slow animation is a
  slow app.

### Non-negotiables

- `useReducedMotion()` respected everywhere: transforms become instant, opacity
  stays.
- Every animation is interruptible. A spring mid-flight must accept a new
  touch.
- No animation blocks input.

## 6 · Haptics

`expo-haptics`, already installed. For the agent this is not decoration — it is
confirmation through a glove, in a warehouse where the phone cannot be heard.

| Action | Feedback |
|---|---|
| Claim a job | `impactAsync(Medium)` |
| Mark collected | `notificationAsync(Success)` |
| Accept a quote | `notificationAsync(Success)` |
| Submit a booking | `notificationAsync(Success)` |
| Refused action | `notificationAsync(Error)` |
| Chip / toggle | `selectionAsync()` |

## 7 · Glass

Translucency is current again, and it is meaningful **only where content passes
underneath**. Two surfaces qualify:

- The footer CTA, which floats over a scrolling list.
- The tab bar.

Cards do not get glass. There is nothing behind a card but flat background, so
blurring it is ornament — and ornament is exactly what reads as cheap.

Needs `expo-blur`. Falls back to an opaque surface where blur is unsupported or
performance is poor.

## 8 · Per-role treatment

The three portals are three products with three users. They share a system and
diverge deliberately.

| | 🌿 Organization | 🟡 Business | 🔷 Agent |
|---|---|---|---|
| Accent | `oxide` | `copper` | `patina` |
| Theme | Light | Light | **Dark** |
| Emphasis | The record — dockets, certificates, proof | The number — money largest on screen | The next action — one thing, huge |
| Density | Comfortable | Comfortable | Loose, one-handed |
| Touch targets | 44pt | 44pt | **56pt** |

**Why the agent portal goes dark — the one real risk here.**

A field agent works outdoors, often before dawn or after dark at a loading
dock, one-handed, sometimes gloved. A cream screen at night destroys night
vision and glares under a sodium lamp. Driver and logistics apps are almost
universally dark, and the reason is operational rather than fashionable. It
also saves meaningful battery on the OLED phone a driver runs all day on a
van charger.

It is a risk because it breaks the visual unity of the three portals. That is
the trade: the agent portal should feel like a tool, not like the customer's
app in a different colour.

## 9 · Build order

1. `tokens.ts` — colour, type, radius, elevation. Changes every screen at once.
2. Fonts — swap Plus Jakarta for the Plex family in `_layout.tsx`.
3. Primitives — `AppText`, `Card`, `PillButton`, `StatTile`, `StatusBadge` →
   `Stamp`, plus a new `DataRow` and `MoneyText`.
4. Motion layer — `useCountUp`, `useStagger`, `PressableScale`.
5. Docket component, used by quote detail and completed jobs.
6. Glass footer + tab bar.
7. Agent dark theme.
8. A pass through all three portals for consistency.

Tests should survive: copy, roles and behaviour do not change. Any test that
breaks was asserting on presentation, and is worth rewriting anyway.

## 10 · Deliberately excluded

- **Glossy, skeuomorphic buttons.** 2008. Would read cheap, not premium.
- **Glass everywhere.** 2021, and meaningless without content behind it.
- **Multi-stop gradients.** The third AI-default look.
- **A splash animation.** An agent opening this app at 6am to see their queue
  does not want to watch a logo assemble.
