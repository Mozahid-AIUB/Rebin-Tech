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

## 1 · Colour — from a circuit board

**Revised after self-critique. See §11 for what changed and why.**

The first draft said "steel, oxide, patina" and called it industrial. That was
still a mood board, not the subject. The subject has an actual object at the
centre of it, in every pickup and every quote: **a printed circuit board.**

A board is already a complete palette, and it is the one this product is
literally made of.

| Token | Hex | Taken from |
|---|---|---|
| `board` | `#0A3B2C` | Solder-mask green. The dark surface, and the agent's whole theme. |
| `silk` | `#EDEFE9` | Silkscreen legend, off a stripped board. The light background. |
| `ink` | `#111A15` | Text. Near-black with the board's green in it, never neutral. |
| `copper` | `#B4703A` | Trace. 🔷 Agent accent — the metal being recovered. |
| `gold` | `#C9A227` | Edge-connector contact. 🟡 Business accent — they are being paid. |
| `flux` | `#D08A1E` | Rosin flux. Warning. |
| `alarm` | `#B3423A` | Destructive. |

The org accent is `board` itself: a hospital is handing over the boards.

Why this beats the first draft: "oxidised green / raw copper / patina" is a
copper-weathering story, which is a decent idea about metal in general. Board
green, trace copper and contact gold is a story about **this object**, and it
arrives at a green nobody picks for a recycling app by default — solder mask,
not sustainability.

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

**Monospace for the data layer is the thesis**, and the board gives it a
better reason than "records look like records".

Every board this app collects already has type printed on it: reference
designators (`R14`, `C7`, `U3`), part numbers, revision marks — condensed
monospace on silkscreen, because that is what fits beside a component. The
serials and asset tags the app captures are read off exactly that printing.

So mono here is not a typographic mood. It is **the same lettering as the
objects in the van**, which is why `ABC123XYZ` belongs in it and a sentence
does not.

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
| Floating | Blur + large soft shadow | Footer CTA, tab bar, sheets |
| Raised | White, radius 16, no border, small shadow | Actions, single objects |
| Flat | No fill, no rules — separated by space | Data — manifests, quote lines, details |

**Rules are rationed, not spread.** The first draft put hairlines between every
data row and dropped every radius to 12, which is how a design slides into the
broadsheet look: thin rules everywhere, sharp corners, dense columns. That is a
default, not a decision.

Data rows are separated by **space** instead. The only rules in the app are
`trace` rules (§4), and there are a handful of them.

Radius: 20 → 16 on cards, and **0 on the docket alone**. The docket is square
because a printed docket is square, not because square is the style.

## 4 · Signature — the trace, and the docket it ends on

Two moves, one idea. The board's own drawing convention becomes the app's
structural device, and it terminates in the printed record the business runs
on.

### The trace

A PCB routes connections as copper lines that turn at 45°, never at 90°,
because a right-angled trace etches badly. That constraint is the most
recognisable thing about the way a board looks.

The app uses it wherever something genuinely **connects**:

```
   ●  Submitted            ← via (filled = reached)
   │
   │                       2px copper
   ●  Under review
   │
   ╰──╮                    45° elbow where the route steps
      │
      ○  Scheduled         ← via (hollow = not yet)
      │
      ○  Collected
```

Used on the request timeline and the job stages, and nowhere else. It is not a
divider and not an ornament: a trace draws a connection, and those screens are
the only places one exists. A hairline under a heading would be decoration
wearing the same costume.

Section headings get a short copper trace stub with one elbow, four rules per
screen at most.

### The docket

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
underneath**. One surface qualifies:

- The footer CTA, which floats over a scrolling list.

The tab bar had it too, and lost it on a real phone. A footer's glass sits over
a list that is *meant* to be seen moving — that is the effect. A tab bar is
navigation, and a label competing with whatever happens to scroll behind it is
a label you cannot read. It is opaque.

Cards do not get glass. There is nothing behind a card but flat background, so
blurring it is ornament — and ornament is exactly what reads as cheap.

Needs `expo-blur`. Falls back to an opaque surface where blur is unsupported or
performance is poor.

## 8 · Per-role treatment

The three portals are three products with three users. They share a system and
diverge deliberately.

| | 🌿 Organization | 🟡 Business | 🔷 Agent |
|---|---|---|---|
| Accent | solder mask `#0A3B2C` | contact gold `#B08A1F` | trace copper `#C8823F` |
| Theme | Light | Light | Light |
| Emphasis | The record — dockets, certificates, proof | The number — money largest on screen | The next action — one thing, huge |
| Density | Comfortable | Comfortable | Loose, one-handed |
| Touch targets | 44pt | 44pt | **56pt** |
| Tab bar | 62pt | 62pt | **70pt** |

**The agent portal was dark, and is not any more.**

The argument for it was operational: a field agent works outdoors, often
before dawn or at a loading dock after sunset, one-handed and sometimes
gloved. A pale screen glares under a sodium lamp and destroys night vision,
and it burns battery on the OLED phone a driver runs all day on a van charger.
Driver and logistics apps are near-universally dark for those reasons.

The argument was sound and the outcome was still wrong. It made one portal
look like a different company's product from the two it ships alongside, and
that cost more than the night-vision case was worth. Reversed at the client's
direction after seeing it on a device.

What survives the reversal is everything that was actually about the job
rather than about the light: the taller tab bar, the 56pt targets, the loose
density, one action per screen. Copper is what marks the portal now.

**The dark scheme is kept, and nothing selects it.** `DARK` in `theme.tsx` is
still defined and still contrast-checked — board green `#0D1512`/`#18221D`
rather than a neutral near-black, so it never looked like a generic dark-mode
template. A night mode is a switch, not a rebuild. `dark` remains in the theme
type and the primitives still branch on it for that reason.

**A metal is a fill, not an ink.** Contact gold reads 2.8:1 against the
silkscreen background and the agent's copper 2.7:1 — fine behind a button
label, illegible as one. Each accent therefore has two values: `accent` for
fills, borders and indicators, and `accentText` for anything set in it, deep
enough to clear 4.5:1 while still reading as gold or copper. This was already
wrong for the business portal before the agent joined it on white; going light
is what exposed it.

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

---

## 11 · Self-critique, and what changed

The first draft of this document was reviewed against the three looks
AI-generated design currently defaults to. One of them had caught it.

**Default 3 — the broadsheet.** Hairline rules everywhere, radius dropped to
zero, dense columns, monospace. The first draft prescribed hairlines between
every data row, radius 20 → 12, and mono throughout, and called the result
"industrial". It would have been the broadsheet default wearing a hard hat:
arrived at by reflex, not chosen for this product.

Fixed by rationing rules to the one device that means something (§4), keeping
a soft radius on cards, and separating data rows with space.

**Default 2 — near-black with one bright accent.** The agent dark theme was
heading straight for it. Fixed by making that theme board green rather than
neutral black, with copper and gold rather than an acid highlight.

**Default 1 — cream, serif, terracotta.** Avoided from the start; it is what
the app already looked like.

The larger miss was not a default at all. The first draft reached for "steel,
oxide, patina" — a general idea about industry — while the product has a
specific object at the centre of every transaction that nobody had looked at.
A circuit board is already a palette, a type convention and a drawing
convention, and all three are truer than anything a mood board produces.

The one accessory removed, in Chanel's sense: the metallic background texture
from the first draft. With the trace as the signature, a texture behind it is
a second voice saying the same thing more quietly.

### What the device showed that the document could not

Three things in this direction survived review here and failed on a phone.

**The agent's dark theme** (§8). Defended at length above as the one real
risk, reversed on sight. The night-shift reasoning was real; what the document
could not show was how strange it looks to open two of a company's three apps
and find the third belongs to someone else. A written rationale can be
internally consistent and still lose to five seconds of looking.

**The board-green-on-board-green first cut.** Solder mask behind, slightly
lighter solder mask on cards — about five percent of lightness apart, which
reads as one flat green wall, and shadows do nothing on a dark surface to
rescue it. Elevation is a light-theme device; a dark theme separates with
borders or with far more contrast than a palette swatch suggests.

**Metals as type.** §1 chose copper and gold as accents without asking what
an accent gets used *for*. Half its uses are text, and neither metal is
legible as text on the silkscreen background. The fix (two values per accent,
§8) is small; the lesson is that "accent colour" is not one job.

The common thread: each was a decision about how something reads, argued from
how it was reasoned about. Contrast is arithmetic and should have been
computed, not eyeballed — the theme tests now assert the ratios so the next
one fails in CI rather than on a phone.
