# Hero collection story — premium pass

**Goal:** Take `apps/web/app/HeroStory.tsx` and its `cs-*` CSS block in
`apps/web/app/globals.css` from a schematic first cut to an enterprise-grade,
believable piece of illustration and motion — the single thing a visitor
remembers about this site.

**What exists now:** a working 12s loop. Two figures hand three devices into a
van, the van departs along a copper PCB trace that draws itself as it goes, two
vias fill, a counter reads 00→03, then a 3.5s still frame. The structure is
right. The execution is crude: the van is four rectangles, the wheels are two
circles, the figures are stick silhouettes, and there is no lighting.

**What is NOT changing** (these are settled decisions, do not revisit):

- The road is a copper trace, drawn by the van's departure. Not asphalt.
- Three beats plus a held still frame. The still frame is a third of the loop.
- Faceless figures. No photographs, no faces, no branded overalls.
- The final frame is the static markup — JS off and `prefers-reduced-motion`
  both land there with nothing waiting on JavaScript.
- Palette comes from `docs/design-direction.md` §1 only. No new hues.

## Global Constraints

- **Files:** only `apps/web/app/HeroStory.tsx` and the `cs-*` region of
  `apps/web/app/globals.css`. Nothing else. No new dependencies, no libraries.
- **Colour:** every value must be one of the brand tokens
  (`--board`, `--board-deep`, `--silk`, `--ink`, `--copper`, `--gold`,
  `--surface`, `--surface-warm`, `--muted`, `--border`) or a shade mixed from
  them. Literal hexes are allowed **only** as gradient stops that are visibly a
  tint or shade of a token (the file already does this: `#B9C4BC`, `#161F1B`).
  `--gold` is the business portal's accent and must not appear.
- **Type:** any text is IBM Plex Mono via `var(--font-mono)`. No other family.
- **Technique:** inline SVG + CSS `@keyframes`. No JS, no `<animate>`/SMIL, no
  external assets, no base64 images, no filters that need a raster (`feTurbulence`
  is permitted only if cheap and static).
- **Performance:** animate `transform` and `opacity` only, plus
  `stroke-dashoffset` for the trace draw. Never animate `x`, `y`, `width`,
  `height`, `r`, `cx`, `cy`, `fill`, or a filter primitive.
- **SVG transforms:** an element carrying a `transform` attribute cannot also
  take a CSS `transform` — CSS replaces the attribute rather than composing with
  it. Nest a group. Every CSS-transformed shape needs
  `transform-box: fill-box` and an explicit `transform-origin`.
- **Accessibility:** one `role="img"` and one `aria-label` sentence on the root
  `<svg>`. No text nodes exposed to the accessibility tree beyond that.
- **Reduced motion:** every animated selector must appear in the
  `@media (prefers-reduced-motion: reduce)` block with `animation: none`, and any
  property applied outside a keyframe (like `stroke-dasharray`) must be undone
  there so the static frame is intact.
- **Comment style:** match the file. Comments explain *why* a decision was made
  and what was rejected — never what the next line does. Read the neighbouring
  components (`HeroScene.tsx`, `PhoneMock.tsx`, `Docket.tsx`) first.
- **Verify:** `pnpm --filter web typecheck` must pass. Dev server runs on
  http://localhost:3005 — fetch the page and confirm it returns 200 and the
  markup contains your elements.
- **Do not commit.** Leave changes in the working tree.

---

## Task 1 — The drawing

Rebuild the static scene in `apps/web/app/HeroStory.tsx` at premium fidelity.
The scene sits in a dark hero (a board-green gradient), right column, roughly
34rem wide. Keep the `viewBox="0 0 480 400"` unless a wider frame is genuinely
needed; if you change it, keep the aspect close to 6:5.

Required, all of it:

1. **The van.** A box van in side elevation, facing right. Real proportions: a
   cab lower than the cargo box with a visible step between them, a chassis rail,
   wheel arches actually cut into the body rather than wheels pasted over it, and
   the box overhanging behind the rear axle the way a real one does. Panel seams,
   a door line, a side mirror on a stalk, a rear light cluster, and a headlamp.
   Windscreen and door glass with a single diagonal specular sweep — the same
   move `.ph-gloss` uses on the phone.
2. **Materials.** The body is white-van silk, but it must read as a *panel
   catching light*: a crown highlight along the top, a mid-tone body, and a
   darker lower third where a real vehicle picks up the ground. Ambient occlusion
   under the box and inside the wheel arches. One restrained reflection of the
   dock's light on the flank.
3. **Wheels.** Tyre with a visible sidewall, a rim with spokes or a dish, a hub,
   and a contact shadow that is darkest at the contact patch. The rim must be a
   separate group that can be rotated by CSS in Task 2 — give it a class and
   ensure `transform-box`/`transform-origin` are set so a rotation spins about
   the axle, not the drawing origin.
4. **The open rear.** The loading opening, the roller shutter (its own group,
   scalable from the top edge), and a warm interior spill so the inside reads as
   lit rather than as a black hole.
5. **The dock.** A real dock edge: deck, a bumper strip, the drop to ground
   level, and a dock lamp on a bracket throwing a soft cone across the loading
   area. The cone is what turns a flat scene into a lit one — it is the single
   biggest realism win available here.
6. **The people.** Two figures, still faceless, but properly proportioned —
   roughly seven heads tall, with a shoulder line, a waist, and legs that read as
   legs. One wears a hi-vis band across the chest (a real detail on a loading
   dock, and it distinguishes the two without a face). Give each an arm group
   that Task 2 can rotate at the shoulder.
7. **The equipment.** Three devices — a monitor, a desktop tower, a laptop —
   matching the three lines on the docket. Draw them the way `HeroScene.tsx`
   draws the same objects: light aluminium shell, dark glass, a thin bright edge.
8. **Depth.** Something behind: a suggestion of a warehouse wall or bay door,
   held far back and low contrast, plus atmospheric fade toward the edges. It
   must never compete with the van. `BoardField` already runs behind this whole
   hero at 0.16 opacity — do not duplicate circuit routing here.
9. **The counter.** `DEVICES` in copper mono with the numeral in silk. Structure
   the numerals so Task 2 can roll them vertically inside a clipped window
   (a `<clipPath>` and one column of digits) rather than cross-fading four
   stacked texts. Cross-fading is what it does today and it is the cheap version.
10. **Keep every existing hook.** Task 2 owns the motion and expects these
    classes to exist and be transformable: `cs-van`, `cs-shutter`, `cs-item-1`,
    `cs-item-2`, `cs-item-3`, `cs-figure-a`, `cs-figure-b`, `cs-trace`,
    `cs-ring`, `cs-via-a`, `cs-via-b`. Add new ones freely (wheels, arms,
    lamps, digits, suspension) and **list every class you add in your report**,
    with what it is and what transform it expects.

The static markup must render as the **closing frame**: dock cleared, shutter
down, counter at 03, trace drawn, vias filled, van present at the dock. The CSS
already hides `.cs-item`, `.cs-num-0/1/2` for that reason — keep whatever
equivalent your structure needs, and say so in your report.

Do not touch the `@keyframes` in `globals.css`. If the existing motion looks
wrong against your new geometry, note it in your report — Task 2 fixes it.

---

## Task 2 — The motion

Rewrite the `cs-*` animation block in `apps/web/app/globals.css` against the
geometry Task 1 produced. Read `HeroStory.tsx` first; the Task 1 report lists
every class and the transform each expects.

Keep the 12s cycle and the beat structure:

| Window | Beat |
|---|---|
| 0 – 6.7% | van and equipment arrive, counter at 00 |
| 15 – 39% | three devices load, one at a time, counter 01 → 02 → 03 |
| 40 – 48.3% | shutter comes down |
| 48.3 – 69.2% | van departs, trace draws behind it, vias fill |
| 69.2 – 100% | still: empty dock, 03, route on the board |

Required, all of it:

1. **Wheels turn.** Rotation synced to the translation — a van that slides
   without its wheels turning is the single most obvious tell in this whole
   scene. Match angular distance to linear distance well enough that it does not
   read as slipping.
2. **Suspension.** The body settles a little as each device goes in, and lifts
   as the van pulls away. Small — one or two units. It is the difference between
   a drawing that moves and a vehicle that is loaded.
3. **Shutter physics.** It accelerates down and settles, rather than travelling
   at a constant rate. A roller shutter is heavy.
4. **The items.** Each arcs, rotates slightly in flight, and scales down a touch
   as it goes away from the viewer into the van. Stagger them so the rhythm is
   uneven — three identical intervals read as a machine, and two people passing
   things across do not.
5. **The arms.** Shoulders rotate on the handover, in time with the item leaving.
   Return to rest after.
6. **The counter rolls.** Digits translate vertically inside the clip window with
   a slight overshoot, the way a mechanical counter lands. Not a cross-fade.
7. **Lights.** Headlamp and rear cluster come up shortly before departure and
   stay lit until the van is gone. The dock lamp holds throughout.
8. **The trace.** Keep the draw-on-departure. Add a bright leading head at the
   drawing edge so the line reads as being laid rather than uncovered.
9. **The vias.** Land with a scale overshoot, not a linear fade-in.
10. **Departure easing.** The van pulls away slowly and leaves quickly. It must
    be fully clear of the frame before the still period begins.
11. **The loop seam.** Whatever the last frame holds (trace drawn, vias filled,
    counter 03) must return to its opening state without a visible cut. The
    current version fades those out over the last 7% — keep that approach or
    better it, but the seam must not flash.

Non-negotiable:

- `transform` and `opacity` only, plus `stroke-dashoffset` for the trace.
- Every animated selector appears in the `prefers-reduced-motion` block.
- The still frame remains legible with all animation off.
- The whole sequence stays one 12s timeline so the counter can never drift out
  of step with the loading.

---

## Task 3 — The composition

Added after looking at a render of Tasks 1 and 2. The drawing and the motion are
both good; the way they sit in the frame is not. Three faults, in order of how
much they cost.

**1 · Half the frame is empty.** Content runs from about `y = 127` (the top of
the warehouse wall) to `y = 375`. The `viewBox` is `0 0 480 400`, so roughly 32%
of the frame above the scene is bare background, and the consequence in the page
is that the drawing renders small and low in its column while the hero's dark
field swallows the space above it. Tighten it.

**Do this as a pure crop.** Change the `viewBox` origin and height only — for
example `0 88 480 312` — and move no coordinate inside the drawing. Every travel
distance, axle position and rotation constant in Task 2's keyframes is computed
against the current coordinates; shifting the geometry silently invalidates all
of them. Leave roughly 30-40 units of headroom above the tallest element so the
scene has air rather than a haircut. If a crop alone cannot get there, say so in
your report rather than moving the scene.

**2 · The van does not reach the dock.** The deck ends near `x = 181` and the
van's rear face is at `x = 206`. A van at a loading dock backs up until its
bumper meets the dock's, because that is the only way anything gets carried
across. Right now there is a 25-unit void and the items fly over it. Close it by
extending the dock — the deck, its nosing, and the bumper block — rightward to
meet the van. Do not move the van: its `x` positions are load-bearing for the
motion.

**3 · The people read as ghosts.** `.cs-figure` composites at `opacity: 0.52`,
which was chosen when the figures were stick silhouettes that needed holding
back. Task 1 drew real ones, and at 0.52 on board green they now read as
apparitions rather than as staff. Raise it until they read as people standing in
lamplight — around 0.7 is the likely answer, but judge it against the render.
The van must stay the brightest thing in the frame; the figures must stop
looking transparent. If raising the flat opacity makes the hi-vis band garish,
tune the band rather than pushing the figures back down.

Also worth your judgement, not mandated: the `DEVICES` readout currently sits in
the bottom-left corner in space that the crop will change. Check it still reads
as part of the scene rather than as a caption that drifted off it, and adjust its
placement if the crop leaves it stranded.

Constraints for this task on top of the Global Constraints:

- You may edit both `HeroStory.tsx` and `globals.css`, but **only** for the three
  faults above. No new elements, no re-drawing, no new beats.
- Do not change any `x`/`y` coordinate of the van, the items, the wheels, the
  trace path or the vias. The dock and the `viewBox` are what move.
- Do not change any percentage stop, duration, easing or transform value in the
  `cs-*` keyframes.
- Verify the loop still works after the crop: the van must still leave the frame
  completely during the departure window, and nothing may be clipped that was
  visible before.
