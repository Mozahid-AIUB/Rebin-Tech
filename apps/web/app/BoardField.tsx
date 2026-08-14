/**
 * Routing, behind the headline.
 *
 * The alternative was a photograph, and the honest problem with one is that
 * stock e-waste photography all looks the same -- a pile of keyboards on a grey
 * floor -- and the client has no photographs of their own operation yet. A
 * generic image would also fight the seam trace for attention, and the whole
 * discipline of this page is that one device carries it.
 *
 * So the hero sits on actual routing instead: traces leaving pads, turning at
 * 45 degrees, passing through vias, the way a board is laid out. Drawn rather
 * than photographed, which means it is sharp at any size, weighs a couple of
 * kilobytes, and can never be stretched out of proportion -- the failure mode
 * a raster hero image has on every screen it was not cropped for.
 *
 * Kept faint on purpose. It is the surface the type is printed on, not a thing
 * to look at: at full strength it would read as a pattern and the headline
 * would be competing with it.
 *
 * `preserveAspectRatio="xMidYMid slice"` is what stops it distorting. The
 * artwork keeps its proportions and the box crops whatever does not fit,
 * exactly like `object-fit: cover` on a photograph.
 */
export function BoardField() {
  return (
    <svg
      className="board-field"
      viewBox="0 0 600 520"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      <g
        fill="none"
        stroke="var(--copper)"
        strokeWidth="1.5"
        strokeLinecap="square"
        vectorEffect="non-scaling-stroke"
      >
        <path d="M600 40 L470 40 L430 80 L430 190 L400 220 L180 220" />
        <path d="M600 120 L520 120 L480 160 L480 300 L520 340 L600 340" />
        <path d="M600 210 L560 210 L520 250 L300 250" />
        <path d="M600 400 L450 400 L410 440 L410 520" />
        <path d="M340 520 L340 430 L300 390 L300 300" />
        <path d="M600 470 L540 470 L500 510" />
        <path d="M230 520 L230 470 L270 430 L370 430" />
      </g>

      {/* Vias: the plated holes where a trace changes layer. Filled and hollow
          both occur on a real board -- through-hole and blind. */}
      <g fill="var(--copper)">
        <circle cx="430" cy="190" r="4.5" />
        <circle cx="480" cy="300" r="4.5" />
        <circle cx="300" cy="300" r="4.5" />
        <circle cx="410" cy="440" r="4.5" />
      </g>
      <g fill="var(--board)" stroke="var(--copper)" strokeWidth="1.5">
        <circle cx="430" cy="80" r="4.5" />
        <circle cx="520" cy="250" r="4.5" />
        <circle cx="270" cy="430" r="4.5" />
      </g>

      {/* Pads, where a component would be soldered down. */}
      <g fill="var(--copper)" opacity="0.55">
        <rect x="452" y="34" width="14" height="12" rx="1" />
        <rect x="452" y="114" width="14" height="12" rx="1" />
        <rect x="452" y="204" width="14" height="12" rx="1" />
      </g>
    </svg>
  );
}
