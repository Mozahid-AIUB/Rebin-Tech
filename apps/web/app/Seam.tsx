/**
 * The trace, crossing from the populated board into the stripped one.
 *
 * This is the page's one piece of ornament and it is carried over from the app,
 * where the same 45-degree elbows and plated vias draw the request timeline.
 * It earns its place here for the same reason it does there: a trace is the
 * path a signal takes through a board, and the thing this page is describing is
 * a path -- equipment leaving a loading dock and arriving as a certificate.
 *
 * Elbows are 45 degrees because that is how boards are actually routed. A right
 * angle in copper concentrates etchant and undercuts the corner, so the
 * convention is a chamfer, and reproducing it is the difference between a line
 * drawn by someone who has looked at a board and one that has not.
 *
 * It straddles the section boundary deliberately -- half over solder mask, half
 * over silkscreen -- because a trace runs *through* a board rather than
 * decorating the surface of one.
 */
export function Seam() {
  return (
    <div className="seam" aria-hidden="true">
      <svg viewBox="0 0 1200 132" preserveAspectRatio="none" className="seam-svg">
        {/* The upper half sits on solder mask, the lower half on silkscreen.
            Painted as two rects rather than relying on the sections behind, so
            the trace can be one uninterrupted path across the join. */}
        <rect x="0" y="0" width="1200" height="66" fill="var(--board)" />
        <rect x="0" y="66" width="1200" height="66" fill="var(--silk)" />
        <path
          className="seam-trace"
          d="M 40 0 L 40 30 L 70 60 L 300 60 L 330 90 L 330 132"
          fill="none"
          stroke="var(--copper)"
          strokeWidth="2.5"
          strokeLinecap="square"
        />
        {/* A via is a plated hole where a trace changes layer. Placed at the
            two elbows, which is where this one does. */}
        <circle cx="70" cy="60" r="5.5" fill="var(--copper)" />
        <circle cx="330" cy="90" r="5.5" fill="var(--silk)" stroke="var(--copper)" strokeWidth="2.5" />
      </svg>
    </div>
  );
}
