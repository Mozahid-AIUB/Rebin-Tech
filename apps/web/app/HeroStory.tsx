/**
 * The collection, happening, in the hero.
 *
 * The page's argument is that what you hand over is routed, stage by stage,
 * into a record. The docket used to make that argument from the other end --
 * here is the paper, take our word for how it got made -- which put the outcome
 * before its cause and left the hero showing a result with no action in it.
 * This shows the action: two people hand equipment over, it goes into the van,
 * the van leaves.
 *
 * The one decision here that is not the obvious one: **the road is a copper
 * trace.** A van driving off down a strip of asphalt is the animation every
 * logistics site ships, and building it would have landed exactly on the
 * default `docs/design-direction.md` §11 exists to catch. The trace is the
 * device the chain of custody uses further down the page, and §4 permits it in
 * one situation only -- where something genuinely connects. A collection
 * connects a loading dock to a record. So the route is drawn rather than driven
 * on, and it is drawn *by the van's own departure*: the line does not exist
 * until the collection makes it, and the vias fill as it passes them.
 *
 * That also settles what the still frame at the end of each cycle says, which
 * matters more than the movement does -- it is on screen for a third of the
 * loop. The dock is empty, the count is final, and the route out of it is on
 * the board.
 *
 * **Lighting.** Two sources, and every value in here answers to them. An
 * overhead ambient from behind the drawing -- the same one `.hero-glow` puts at
 * 68%/60% of the hero -- gives the van its crown highlight and its darker lower
 * third. A dock lamp on a bracket, hanging out over the gap where a real one
 * does, throws the cone across the deck and puts one reflection on the van's
 * rear flank. The cone is the single thing that separates a scene that is lit
 * from a set of flat shapes on a dark ground, and it is why the figures read as
 * standing in a place rather than floating on the background.
 *
 * The van is white because the company's is, and because this scene sits on
 * board green: light objects come forward, dark objects disappear into it. The
 * same fact is why the people are silk at half strength -- the van is the
 * subject, and two figures at full contrast would make this a group photograph.
 *
 * The warehouse behind is held at five percent. `BoardField` already runs
 * routing behind this whole hero, and §4 is explicit that two coppers at
 * similar strength read as one pattern with the meaning lost inside it -- so
 * there is no circuitry drawn back there, only a wall and a bay door.
 *
 * **The frame is a crop, not a redraw.** The scene was authored in a 480x400
 * box and the top 88 units of it were empty ground: content starts at the
 * warehouse cap on y=126 and ends at the counter on y=378, so nearly a third of
 * the box was background, and in the page that put the drawing low in its column
 * with the hero's dark field swallowing the space above it. `viewBox="0 88 480
 * 312"` takes that band back and leaves 38 units of headroom over the cap --
 * air, rather than a haircut. Only the frame moved. Every travel distance, axle
 * position and rotation constant in the motion layer is computed against these
 * coordinates, so shifting the drawing to fit a smaller box would silently
 * invalidate all of them; the box is what fits the drawing.
 *
 * Everything is drawn from the palette and from the shapes `HeroScene` already
 * uses, so there is no licence attached and nothing to take down later. Ids are
 * prefixed `cs-`, because gradient ids are global to the document and this page
 * also carries the routing field and the about illustration.
 *
 * With scripting off, or with reduced motion asked for, the markup below is
 * already the closing frame. Nothing waits on JavaScript.
 */

/**
 * The ground plane is y=331 and the dock deck is y=302. Every height in this
 * file is measured off those two lines, so a van that stands on the road and a
 * person who stands on the deck cannot drift apart.
 *
 * `DOCK_EDGE` is the third of those lines, and it is dictated rather than
 * chosen: the van's rear step ends at x=203, so the deck runs to 203 and the
 * bumper block stands proud of it by the same 4 units it always did, which puts
 * its face at 207 against the van's rear face at 206. The deck used to stop at
 * 178 and leave a 25-unit void with three devices flying over it. A van backs up
 * until the two bumpers meet, because carrying something across is the only
 * thing a dock is for -- and the dock is what moves, because the van's x
 * positions are what every travel distance in the motion layer is measured from.
 */
const GROUND = 331;
const DECK = 302;
const DOCK_EDGE = 203;

/**
 * A road wheel, at the axle it belongs to.
 *
 * The rim is its own group and nothing else is inside it, so a rotation spins
 * about the axle: its bounding box is the rim disc, which is centred on the
 * hub. `transform-box` and `transform-origin` are set here rather than in the
 * stylesheet because they are facts about this geometry -- the motion layer
 * should be able to add `animation` and nothing else.
 *
 * The five holes are what make the rotation legible. A plain dark disc turns
 * invisibly, which is the failure the wheels of the previous version had: two
 * circles that slid sideways with the body and read as skidding.
 */
function Wheel({ cx, className }: { cx: number; className: string }) {
  return (
    <g transform={`translate(${cx} ${GROUND - 20})`}>
      {/* Darkest at the contact patch and gone within a tyre's width of it.
          One soft ellipse under the whole van would say the van hovers. */}
      <ellipse cx="0" cy="21" rx="25" ry="4" fill="#03150F" opacity="0.5" />
      <circle r="20" fill="#0B1411" />
      <circle r="15.5" fill="#18231E" />
      {/* The sidewall catches the dock lamp along its upper edge only. */}
      <path d="M-13 -8 a15.5 15.5 0 0 1 26 0" fill="none" stroke="#3A4741" strokeWidth="1.4" opacity="0.75" />

      <g
        className={className}
        style={{ transformBox: "fill-box", transformOrigin: "50% 50%" }}
      >
        <circle r="12" fill="url(#cs-dish)" />
        <circle cx="0" cy="-7.2" r="2.7" fill="#26312B" />
        <circle cx="6.85" cy="-2.22" r="2.7" fill="#26312B" />
        <circle cx="4.23" cy="5.82" r="2.7" fill="#26312B" />
        <circle cx="-4.23" cy="5.82" r="2.7" fill="#26312B" />
        <circle cx="-6.85" cy="-2.22" r="2.7" fill="#26312B" />
        <circle r="4.4" fill="#C4CDC5" />
        <circle r="1.7" fill="#6E7B75" />
      </g>
    </g>
  );
}

/**
 * One of the two people on the dock.
 *
 * Faceless, and that is not a shortcut: a drawn face is a character, a
 * character needs a story, and the story would be a stock model with extra
 * steps. The page refuses photographs of people for the same reason.
 *
 * Seven heads tall with a shoulder line and a waist, because the previous
 * version's stick figures were the one thing in the frame that looked drawn by
 * a machine. The two are told apart by a hi-vis band rather than by a face --
 * the same way you tell them apart on a real dock.
 *
 * The translate lives on the outer group because a CSS `transform` replaces the
 * `transform` attribute rather than composing with it -- with both on one
 * element the lean would throw the figure to the origin. The arm is a third
 * level for the same reason, pivoting at the shoulder while the body leans.
 */
function Figure({
  x,
  className,
  armClassName,
  hiVis = false,
}: {
  x: number;
  className: string;
  armClassName: string;
  hiVis?: boolean;
}) {
  return (
    <g transform={`translate(${x} ${DECK})`}>
      {/* Cast on the deck, not under the feet: the lamp is up and to the
          right, so the shadow falls back and to the left. */}
      <ellipse cx="-4" cy="1" rx="14" ry="3.5" fill="#03150F" opacity="0.34" />

      <g className={className}>
        <circle cx="0" cy="-78" r="6" />
        <rect x="-2.5" y="-73" width="5" height="5" />
        <path d="M-9 -69 q9 -4 18 0 l-2 30 h-14z" />
        <rect x="-8" y="-40" width="7" height="40" rx="3" />
        <rect x="1" y="-40" width="7" height="40" rx="3" />
        <rect x="-9.5" y="-4" width="10" height="4" rx="1.5" />
        <rect x="0.5" y="-4" width="11" height="4" rx="1.5" />

        {hiVis ? (
          <>
            {/* Copper, lifted a shade, because the whole figure is composited
                at half strength and the band has to survive that. It is the
                only warm thing on a person in the frame, which is exactly what
                a hi-vis band is for. */}
            <rect x="-6.5" y="-68" width="3" height="9" fill="#D08A4E" />
            <rect x="3.5" y="-68" width="3" height="9" fill="#D08A4E" />
            <rect x="-8" y="-60" width="16" height="6" fill="#D08A4E" />
            <rect x="-8" y="-60" width="16" height="1.4" fill="#EDB585" />
          </>
        ) : null}

        {/* The far arm, hanging. A figure with one arm out and nothing on the
            far side reads as a signpost. */}
        <rect x="-10.5" y="-67" width="6.5" height="27" rx="3.2" />

        {/* The near arm, the one that does the handing over, at rest until it
            is asked for.
         *
         * The rest angle is an attribute on the outer group and the class is on
         * the inner one, which is not fussiness: the box a `fill-box` transform
         * measures is the child's own, before the parent's rotation, so the
         * pivot lands exactly on the left edge at half height -- the shoulder
         * joint. Put the rest angle and the class on one element and the pivot
         * moves to the corner of a tilted box, which swings the arm out of the
         * socket by a couple of units every time it lifts. */}
        <g transform="rotate(68 6 -65.5)">
          <g
            className={armClassName}
            style={{ transformBox: "fill-box", transformOrigin: "0% 50%" }}
          >
            <rect x="6" y="-69" width="26" height="7" rx="3.5" />
            <circle cx="32" cy="-65.5" r="4" />
          </g>
        </g>
      </g>
    </g>
  );
}

export function HeroStory() {
  return (
    <svg
      className="hero-story"
      viewBox="0 88 480 312"
      role="img"
      aria-label="Two people at a lit loading dock hand retired computer equipment into a white van, which drives away along a route drawn as a circuit-board trace. A counter reads three devices."
    >
      <defs>
        {/* The van's flank is a panel catching light, not a fill: a crown along
            the roof, the body's own tone through the middle, and a lower third
            that picks up the ground. §10 rules multi-stop gradients out as a
            surface treatment; this is shading on a drawn object, which is the
            same reason `HeroScene` and the hero background behind it are
            gradients. Every stop is a tint or shade of silk. */}
        <linearGradient id="cs-body" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FCFDFB" />
          <stop offset="9%" stopColor="var(--silk)" />
          <stop offset="55%" stopColor="#DBE1D9" />
          <stop offset="83%" stopColor="#B7C2BA" />
          <stop offset="100%" stopColor="#9BA89F" />
        </linearGradient>

        {/* Dark glass, off the same drawing as the about illustration. */}
        <linearGradient id="cs-glass" x1="10%" y1="0%" x2="90%" y2="100%">
          <stop offset="0%" stopColor="#2B3833" />
          <stop offset="55%" stopColor="#161F1B" />
          <stop offset="100%" stopColor="#22302A" />
        </linearGradient>

        {/* One diagonal sweep, the move `.ph-gloss` makes on the phone. It is
            the detail that turns a dark quadrilateral into glass, and the one
            most often left out. */}
        <linearGradient id="cs-gloss" x1="0%" y1="0%" x2="62%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.3" />
          <stop offset="24%" stopColor="#FFFFFF" stopOpacity="0.07" />
          <stop offset="46%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>

        {/* Aluminium and slate, off the same drawing as the about
            illustration -- the three devices here are the three it draws. */}
        <linearGradient id="cs-alu" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#F3F5F2" />
          <stop offset="100%" stopColor="#C9D2CC" />
        </linearGradient>
        <linearGradient id="cs-slate" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3D4A44" />
          <stop offset="100%" stopColor="#1B2621" />
        </linearGradient>

        {/* Not `cs-rim`: that is the class the motion layer rotates, and an id
            and a class reading the same at a glance is a trap for whoever
            edits this next. */}
        <linearGradient id="cs-dish" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#C2CBC3" />
          <stop offset="100%" stopColor="#77837B" />
        </linearGradient>

        {/* Ambient occlusion under the box and inside the arches. A vehicle
            without it sits on the road like a sticker. */}
        <linearGradient id="cs-ao" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#04150F" stopOpacity="0" />
          <stop offset="100%" stopColor="#04150F" stopOpacity="0.55" />
        </linearGradient>

        {/* The dock lamp, landing on the van's rear flank. One reflection, not
            a rim light down the whole side: the lamp is a point in the scene
            and it can only reach what it faces. */}
        <radialGradient id="cs-flank" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--silk)" stopOpacity="0.17" />
          <stop offset="100%" stopColor="var(--silk)" stopOpacity="0" />
        </radialGradient>

        <linearGradient id="cs-shutter-panel" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#DCE2DA" />
          <stop offset="100%" stopColor="#A9B4AC" />
        </linearGradient>

        {/* Warm, because the inside of a van under a work light is, and because
            a rear opening that is simply black reads as a hole cut in the
            drawing rather than as a space. */}
        <linearGradient id="cs-spill" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="var(--surface-warm)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="var(--surface-warm)" stopOpacity="0" />
        </linearGradient>

        <linearGradient id="cs-cone" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="var(--silk)" stopOpacity="0.15" />
          <stop offset="100%" stopColor="var(--silk)" stopOpacity="0" />
        </linearGradient>

        {/* Brightest where the lamp is, which is over the dock edge. */}
        <linearGradient id="cs-deck" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="var(--silk)" stopOpacity="0.24" />
          <stop offset="100%" stopColor="var(--silk)" stopOpacity="0.82" />
        </linearGradient>

        <linearGradient id="cs-face" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#0C2A20" />
          <stop offset="100%" stopColor="#061F17" />
        </linearGradient>

        {/* The building. It fades out to the right rather than ending on a
            line, so it stays atmosphere instead of becoming a shape. */}
        <linearGradient id="cs-wall" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="var(--silk)" stopOpacity="0.055" />
          <stop offset="100%" stopColor="var(--silk)" stopOpacity="0" />
        </linearGradient>

        {/* The van's shell, defined once. It is drawn with it, and the shading
            painted on top is clipped to it, so a highlight can never leak past
            a wheel arch. */}
        <path
          id="cs-shell"
          d="M212 200 H352 q10 0 12 8 l6 16 h50 q10 0 15 7 l14 20 q4 6 4 12 v33 q0 6 -6 6 h-11 a26 26 0 0 0 -52 0 h-86 a26 26 0 0 0 -52 0 h-34 q-6 0 -6 -6 V206 q0 -6 6 -6 z"
        />
        <clipPath id="cs-shell-clip">
          <use href="#cs-shell" />
        </clipPath>

        {/* The pool the cone lands in stops at the dock edge, because the deck
            does -- so it is measured off `DOCK_EDGE` rather than repeating the
            number, and it reached the van the moment the deck did. Past the edge
            the light falls away down the drop, which is what the cone itself is
            already drawing. */}
        <clipPath id="cs-deck-clip">
          <rect x="0" y="288" width={DOCK_EDGE} height="22" />
        </clipPath>

        {/* The counter window. One column of digits rolls behind it, which is
            what a mechanical counter does; four stacked numerals cross-fading
            is the cheap version of the same idea. */}
        <clipPath id="cs-count-window">
          <rect x="108" y="348" width="58" height="30" />
        </clipPath>
      </defs>

      {/* ---- The building -------------------------------------------------- */}
      {/* Far back and low contrast. It exists to say the dock is attached to
          something; the moment it can be read as a wall with detail on it, it
          is competing with the van. */}
      <rect x="0" y="0" width="206" height={DECK} fill="url(#cs-wall)" />
      <rect x="24" y="132" width="128" height={DECK - 132} fill="var(--silk)" opacity="0.035" />
      <g stroke="var(--silk)" strokeWidth="1" opacity="0.045">
        <line x1="24" y1="150" x2="152" y2="150" />
        <line x1="24" y1="170" x2="152" y2="170" />
        <line x1="24" y1="190" x2="152" y2="190" />
        <line x1="24" y1="210" x2="152" y2="210" />
        <line x1="24" y1="230" x2="152" y2="230" />
        <line x1="24" y1="250" x2="152" y2="250" />
        <line x1="24" y1="270" x2="152" y2="270" />
        <line x1="24" y1="290" x2="152" y2="290" />
      </g>
      <rect x="20" y="126" width="136" height="5" fill="var(--silk)" opacity="0.07" />

      {/* ---- The dock ------------------------------------------------------ */}
      {/* Deck at bed height, which is the whole reason a dock exists: nothing
          here is lifted, it is walked across -- and it now runs all the way to
          the vehicle, so that sentence is true of the drawing as well. */}
      <rect x="0" y={DECK} width={DOCK_EDGE} height={GROUND - DECK} fill="url(#cs-face)" />
      <rect x="0" y={DECK} width={DOCK_EDGE} height="4" fill="url(#cs-deck)" />
      <rect x="0" y={DECK + 4} width={DOCK_EDGE} height="3" fill="#03150F" opacity="0.35" />

      {/* The nosing and one bumper block. A dock edge without them is a step;
          with them it is a thing vans reverse into -- and this one has, which is
          the whole point of putting the block where the van's rear step is
          rather than 25 units short of it. */}
      <rect x={DOCK_EDGE - 6} y={DECK} width="6" height="10" fill="var(--silk)" opacity="0.45" />
      <rect x={DOCK_EDGE - 8} y={DECK + 8} width="12" height="16" rx="2" fill="#0A1913" />
      <rect x={DOCK_EDGE - 8} y={DECK + 8} width="12" height="2" rx="1" fill="var(--silk)" opacity="0.14" />
      <rect x="0" y={GROUND - 4} width={DOCK_EDGE} height="4" fill="var(--silk)" opacity="0.05" />

      {/* ---- The dock lamp -------------------------------------------------- */}
      {/* Out over the gap on a bracket, where the real ones hang, and the one
          decision in this drawing that does the most for it: the cone is what
          makes the deck a surface with light falling on it. */}
      <g>
        <rect x="150" y="150" width="26" height="4" rx="1.5" fill="#7E8B83" />
        <path d="M156 154 l16 -5 v5z" fill="#5F6C65" />
        <path d="M172 148 h18 l7 16 h-32z" fill="#8A968E" />
        <path d="M172 148 h18 l1.6 3.6 h-21.2z" fill="#C6CFC7" />
        <ellipse cx="181" cy="164" rx="15" ry="3.4" fill="var(--silk)" opacity="0.55" />
      </g>
      <path d="M167 164 H195 L262 308 H106 Z" fill="url(#cs-cone)" />
      <g clipPath="url(#cs-deck-clip)">
        <ellipse cx="168" cy={DECK + 1} rx="84" ry="11" fill="var(--silk)" opacity="0.08" />
      </g>

      {/* ---- The route ---------------------------------------------------- */}
      {/* Drawn before the van, so the van covers its own leading edge as it
          lays it, and so the finished route reads as running under the wheels
          that made it. One elbow, at 45 degrees, because a right-angled trace
          etches badly and that constraint is the most recognisable thing about
          a board. `pathLength` normalises the dash maths to 0..1 so the draw
          does not have to be re-measured every time the geometry moves. */}
      <path
        className="cs-trace"
        d="M178 331 H372 L404 363 H480"
        pathLength="1"
        fill="none"
        stroke="var(--copper)"
        strokeWidth="2.5"
        strokeLinecap="square"
      />

      {/* The hot end of the line, so the route reads as being laid rather than
          uncovered. It is a second copy of the same path carrying a two-percent
          dash, which puts one short bright segment exactly on the drawing edge
          when the motion layer runs both dashoffsets together -- a gradient
          along the trace would brighten a fixed point on the board instead of
          the moving head, and stroke width and filters are not animatable
          within the performance rule.

          Carried at zero: with nothing moving, nothing is being drawn, and a
          bright stub sitting on a finished route reads as a rendering fault.
          The motion layer brings it up for the departure only. */}
      <path
        className="cs-trace-head"
        d="M178 331 H372 L404 363 H480"
        pathLength="1"
        strokeDasharray="0.02 0.98"
        fill="none"
        stroke="#E79455"
        strokeWidth="2.5"
        strokeLinecap="square"
        style={{ opacity: 0 }}
      />

      {/* Vias. Hollow is a stage not yet reached, filled is one that wrote
          something down -- the same reading as the chain further down the
          page, and the reason this route is a trace and not a road. Both sit
          clear of where the van stands, so the closing frame shows them. */}
      <circle
        className="cs-ring"
        cx="198"
        cy="331"
        r="5"
        fill="var(--board-deep)"
        stroke="var(--copper)"
        strokeWidth="2.5"
      />
      <circle className="cs-via cs-via-a" cx="198" cy="331" r="5" fill="var(--copper)" />
      <circle
        className="cs-ring"
        cx="452"
        cy="363"
        r="5"
        fill="var(--board-deep)"
        stroke="var(--copper)"
        strokeWidth="2.5"
      />
      <circle className="cs-via cs-via-b" cx="452" cy="363" r="5" fill="var(--copper)" />

      {/* ---- The van ------------------------------------------------------- */}
      <g className="cs-van">
        {/* Under the whole vehicle, long and soft, with the wheels adding their
            own darker patches where they touch. */}
        <ellipse cx="330" cy="332" rx="120" ry="6.5" fill="#03150F" opacity="0.38" />

        {/* The wheel wells, and the chassis they hang off. Deliberately 4 units
            larger than the arches cut in the body above them, so the body can
            settle on its springs without opening a gap at the arch lip. */}
        <g fill="#05130E">
          <rect x="208" y="292" width="242" height="22" />
          <circle cx="272" cy="302" r="30" />
          <circle cx="410" cy="302" r="30" />
        </g>

        <Wheel cx={272} className="cs-rim cs-rim-rear" />
        <Wheel cx={410} className="cs-rim cs-rim-front" />

        {/* Everything above the axles. Held apart from the wheels so the body
            can settle as each device goes in and lift as the van pulls away --
            which is the difference between a drawing that moves and a vehicle
            that is being loaded. */}
        <g
          className="cs-sprung"
          style={{ transformBox: "fill-box", transformOrigin: "50% 100%" }}
        >
          {/* The rear step, and the light cluster on the corner. Side-on the
              cluster is a sliver, which is all a side elevation ever shows of
              one -- drawing it any wider would be a rear view smuggled in. */}
          <rect x="203" y="294" width="46" height="10" rx="2" fill="#101C17" />
          <rect x="203" y="294" width="46" height="1.6" fill="var(--silk)" opacity="0.12" />

          <use href="#cs-shell" fill="url(#cs-body)" />

          <g clipPath="url(#cs-shell-clip)">
            {/* Crown, along the roof and along the lower cab roof. */}
            <rect x="206" y="200" width="148" height="3.5" fill="#FFFFFF" opacity="0.5" />
            <rect x="368" y="224" width="54" height="3" fill="#FFFFFF" opacity="0.42" />

            {/* The dock lamp on the flank. One patch, low and to the rear,
                because that is the only part of the van the lamp faces. */}
            <ellipse cx="268" cy="272" rx="78" ry="32" fill="url(#cs-flank)" />

            {/* Panel seams. Two ribs run the full side and one stops at the
                rear arch, the way a rib on a real body does. */}
            <g opacity="0.55">
              <rect x="262" y="208" width="1" height="68" fill="#6E7C73" />
              <rect x="263" y="208" width="1" height="68" fill="#FFFFFF" />
              <rect x="306" y="208" width="1" height="91" fill="#6E7C73" />
              <rect x="307" y="208" width="1" height="91" fill="#FFFFFF" />
              <rect x="344" y="208" width="1" height="91" fill="#6E7C73" />
              <rect x="345" y="208" width="1" height="91" fill="#FFFFFF" />
            </g>

            {/* Rubbing strip, at the height a loading bay scuffs a van. */}
            <rect x="212" y="265" width="220" height="4" fill="#93A198" opacity="0.5" />
            <rect x="212" y="265" width="220" height="1" fill="#FFFFFF" opacity="0.4" />

            {/* Ambient occlusion under the box, which also darkens the top of
                each arch where a wheel well never sees light. */}
            <rect x="206" y="278" width="248" height="24" fill="url(#cs-ao)" />

            {/* Front bumper and valance. */}
            <rect x="420" y="286" width="36" height="16" fill="#1B2621" opacity="0.9" />
            <rect x="420" y="286" width="36" height="1.4" fill="#FFFFFF" opacity="0.16" />

            {/* The arch lips, catching light on the body side of the cut. The
                stroke straddles the edge and the clip keeps the half that
                belongs to the panel. */}
            <g fill="none" stroke="#FFFFFF" strokeWidth="2" opacity="0.3">
              <path d="M298 302 a26 26 0 0 0 -52 0" />
              <path d="M436 302 a26 26 0 0 0 -52 0" />
            </g>
          </g>

          {/* The rear, open. From directly side-on you would not see into it at
              all; this is the one liberty the drawing takes, and it is the
              liberty that makes loading legible. The frame around it is what
              stops it reading as a window. */}
          <rect x="214" y="212" width="30" height="84" fill="#0A1712" />
          <rect x="214" y="212" width="30" height="84" fill="url(#cs-spill)" />
          <rect x="214" y="290" width="30" height="6" fill="var(--surface-warm)" opacity="0.16" />
          <rect x="212" y="210" width="34" height="2" fill="var(--silk)" opacity="0.3" />
          <rect x="244" y="210" width="2" height="88" fill="var(--silk)" opacity="0.34" />
          <rect x="212" y="210" width="2" height="88" fill="var(--silk)" opacity="0.14" />

          {/* Stored in the roof, so it scales down from its top edge rather
              than sliding in from a second copy of itself above the van. */}
          <g className="cs-shutter">
            <rect x="214" y="212" width="30" height="84" fill="url(#cs-shutter-panel)" />
            <g stroke="#93A198" strokeWidth="1.2" opacity="0.8">
              <line x1="215" y1="226" x2="243" y2="226" />
              <line x1="215" y1="240" x2="243" y2="240" />
              <line x1="215" y1="254" x2="243" y2="254" />
              <line x1="215" y1="268" x2="243" y2="268" />
              <line x1="215" y1="282" x2="243" y2="282" />
            </g>
            <rect x="214" y="288" width="30" height="8" fill="#8A968E" />
            <rect x="214" y="288" width="30" height="1.4" fill="#FFFFFF" opacity="0.35" />
          </g>

          {/* The rear cluster. Copper because it is the only warm value in the
              palette, and an indicator lens is honestly amber. The lit core is
              carried at zero and belongs to the motion layer. */}
          <rect x="207" y="256" width="7" height="28" rx="2" fill="#2A352F" />
          <rect x="207.9" y="257" width="5.2" height="26" rx="1.6" fill="#5E3E22" />
          <rect
            className="cs-lamp-rear"
            x="207.9"
            y="257"
            width="5.2"
            height="26"
            rx="1.6"
            fill="var(--copper)"
            style={{ opacity: 0 }}
          />

          {/* Cab glass. Two panes, each with a single diagonal sweep -- the
              windscreen raked over the bonnet, the door glass square. */}
          <path d="M420 230 h14 q5 0 7 4 l7 14 h-28 z" fill="url(#cs-glass)" />
          <path d="M420 230 h14 q5 0 7 4 l7 14 h-28 z" fill="url(#cs-gloss)" />
          <path d="M386 230 h30 v20 h-32 z" fill="url(#cs-glass)" />
          <path d="M386 230 h30 v20 h-32 z" fill="url(#cs-gloss)" />

          {/* The door: its rear edge, and a handle at the height a hand is. */}
          <g opacity="0.6">
            <rect x="381" y="228" width="1" height="72" fill="#6E7C73" />
            <rect x="382" y="228" width="1" height="72" fill="#FFFFFF" />
          </g>
          <rect x="392" y="257" width="11" height="3.6" rx="1.8" fill="#8C978F" />

          {/* Mirror, out past the body line where a mirror has to be, and level
              with the glass rather than above the roof -- higher and it reads
              as an aerial. */}
          <path d="M437 240 l9 -4 v4 l-9 3z" fill="#8C978F" />
          <rect x="444" y="228" width="7" height="14" rx="2.5" fill="#5F6C65" />
          <rect x="444" y="228" width="2" height="14" rx="1" fill="#A9B4AC" />

          {/* Headlamp and grille. The lens is always there; what comes on
              before departure is the core, and it is carried at zero so the
              still frame is a parked van rather than one about to leave. */}
          <path d="M438 254 h9 q6 0 6 6 v9 q0 6 -6 6 h-9 z" fill="#25322C" />
          <path d="M439.5 255.5 h7 q4.6 0 4.6 4.6 v7.8 q0 4.6 -4.6 4.6 h-7 z" fill="#B7C0B8" opacity="0.75" />
          <rect x="430" y="278" width="22" height="4" rx="1.5" fill="#25322C" opacity="0.8" />
          <g className="cs-lamp-head" style={{ opacity: 0 }}>
            <path d="M439.5 255.5 h7 q4.6 0 4.6 4.6 v7.8 q0 4.6 -4.6 4.6 h-7 z" fill="#FBFCFA" />
            <path d="M453 256 L480 244 v38 l-27 -8 z" fill="url(#cs-cone)" opacity="0.7" />
          </g>
        </g>
      </g>

      {/* ---- The people ----------------------------------------------------- */}
      <Figure x={58} className="cs-figure cs-figure-a" armClassName="cs-arm-a" />
      <Figure x={118} className="cs-figure cs-figure-b" armClassName="cs-arm-b" hiVis />

      {/* ---- What is being handed over ------------------------------------- */}
      {/* A monitor, a tower and a laptop -- the three lines actually on the
          docket, drawn the way the about illustration draws them: light shell,
          dark glass, one thin bright edge. They stand on the deck rather than
          floating at hand height, because the first thing that happens to a
          device at a collection is that it is put down and counted.
          `.cs-item` is hidden by the stylesheet: the still frame is the end of
          the loop, and by then the dock is clear. */}
      <g className="cs-item cs-item-1">
        <ellipse cx="22" cy={DECK} rx="21" ry="3" fill="#03150F" opacity="0.34" />
        <rect x="2" y="262" width="40" height="30" rx="3" fill="url(#cs-slate)" />
        <rect x="5" y="265" width="34" height="22" rx="1.5" fill="url(#cs-glass)" />
        <path d="M5 283 L23 265 h9 L17 287 h-8z" fill="#FFFFFF" opacity="0.06" />
        <rect x="2" y="262" width="40" height="1.6" rx="0.8" fill="#FFFFFF" opacity="0.4" />
        <rect x="18" y="292" width="8" height="6" fill="#2A352F" />
        <rect x="10" y="297" width="24" height="4" rx="2" fill="url(#cs-slate)" />
      </g>

      <g className="cs-item cs-item-2">
        <ellipse cx="90" cy={DECK} rx="14" ry="3" fill="#03150F" opacity="0.34" />
        <rect x="78" y="259" width="24" height="42" rx="3" fill="url(#cs-slate)" />
        <rect x="78" y="259" width="2.6" height="42" rx="1.3" fill="#FFFFFF" opacity="0.14" />
        <rect x="84" y="265" width="12" height="2.2" rx="1.1" fill="#5A6862" />
        <rect x="84" y="270" width="12" height="2.2" rx="1.1" fill="#5A6862" />
        <rect x="84" y="290" width="6" height="2.2" rx="1.1" fill="#7FAF9E" />
      </g>

      <g className="cs-item cs-item-3">
        <ellipse cx="153" cy={DECK} rx="22" ry="3" fill="#03150F" opacity="0.34" />
        <path d="M132 291 h34 l6 10 h-46z" fill="url(#cs-alu)" />
        <path d="M132 291 h34 l1 2 h-36z" fill="#FFFFFF" opacity="0.55" />
      </g>

      {/* ---- The count ------------------------------------------------------ */}
      {/* Counted before it moves, which is the first promise the page makes.
          Mono, because every figure this company records is.

          One column of four numerals behind a clipped window, ordered so that
          counting up moves the column up -- the direction a mechanical counter
          turns. The column's rest position is 03, so with nothing running the
          window already reads the closing figure. The pitch is 40 units, which
          is wider than the 30-unit window, so two numerals can never be in
          shot at once. */}
      <text className="cs-label" x="16" y="372">
        DEVICES
      </text>
      <g clipPath="url(#cs-count-window)">
        <g
          className="cs-digits"
          style={{ transformBox: "fill-box", transformOrigin: "50% 100%" }}
        >
          <text className="cs-num" x="112" y="252">
            00
          </text>
          <text className="cs-num" x="112" y="292">
            01
          </text>
          <text className="cs-num" x="112" y="332">
            02
          </text>
          <text className="cs-num" x="112" y="372">
            03
          </text>
        </g>
      </g>
    </svg>
  );
}
