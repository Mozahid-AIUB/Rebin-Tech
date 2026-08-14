/**
 * The collection docket, rendered on the phone in the chain-of-custody section.
 *
 * `docs/design-direction.md` §4 named this "the thing someone remembers" and
 * §9.5 puts it on the app's quote and completed-job screens. So the honest
 * place for it on the website is inside the phone, below the offer it belongs
 * to -- not floating beside the layout as a graphic. What the mock shows is
 * what the app shows.
 *
 * It sat in the hero for a while at full size, which read well and said the
 * wrong thing: the outcome arrived before the sequence that produces it, and a
 * docket on a marketing page with nothing around it is a picture of a record
 * rather than a record. On the screen it is the app doing its job, and the
 * phone's own bezel is the frame it needed.
 *
 * The trade is legibility. At screen scale the figures are texture rather than
 * reading matter, exactly as the rest of the mock is -- which is why the same
 * counts are set at full size in the quote lines directly above it.
 *
 * Ported from `packages/ui/src/organisms/Docket.tsx` rather than reinvented, so
 * a visitor who books a collection meets the same object inside the app. Square
 * corners because paper is, mono throughout because every figure on it is a
 * record, torn bottom edge because a docket comes out of a book.
 *
 * The figures are a worked example, not a customer's record, and the paper says
 * so: SPECIMEN is printed across the head where a real docket carries nothing.
 * The alternative -- an unlabelled docket with plausible numbers -- is an
 * invented record on a real company's site, which is the one thing this page
 * has refused to do anywhere else.
 *
 * No money. The catalog's rates are still placeholders, and a dollar figure in
 * a hero reads as a quote. Counts and grades are what the product produces
 * today, so counts and grades are what this shows.
 *
 * It carried a caption for a while, explaining that this is what you get back.
 * Removed: the object is a docket with the word SPECIMEN printed on it, and a
 * sentence underneath telling you so is the design failing to trust itself. The
 * honesty the caption was carrying is on the paper, where a real form carries
 * it.
 */

function Line({
  qty,
  item,
  grade,
  serial,
}: {
  qty: string;
  item: string;
  grade: string;
  serial?: string;
}) {
  return (
    <li className="docket-line">
      <span className="docket-qty mono">{qty} &times;</span>
      <span className="docket-item">
        {item}
        {serial ? <span className="docket-serial mono">{serial}</span> : null}
      </span>
      <span className="docket-grade mono">{grade}</span>
    </li>
  );
}

export function Docket({ stamp = "Collected" }: { stamp?: string }) {
  return (
    <figure className="docket">
      {/* Paper and tear share one wrapper because the shadow belongs to the
          sheet, not to the rectangle. A `box-shadow` on the paper alone draws a
          hard edge straight across the top of the perforation -- the shadow has
          to follow the torn silhouette, which is what `drop-shadow` on the
          masked group does and `box-shadow` cannot. */}
      <div className="docket-sheet">
      <div className="docket-paper">
        <div className="docket-head">
          <span className="docket-title mono">Rebin &middot; Collection docket</span>
          {/* Printed, not floated over the top: a specimen form is marked on
              the form itself, and a watermark would be decoration. */}
          <span className="docket-specimen mono">SPECIMEN</span>
        </div>

        <span className="docket-rule" />

        <div className="docket-meta mono">
          <span>QT-9B832977</span>
          <span>2026-08-11</span>
        </div>

        <ul className="docket-lines">
          <Line qty="3" item="Business laptop" grade="working" serial="ABC123XYZ" />
          <Line qty="2" item="LCD monitor" grade="broken" />
          <Line qty="1" item="Desktop tower" grade="parts" />
        </ul>

        <span className="docket-rule" />

        <div className="docket-total">
          <span className="docket-total-label mono">Devices</span>
          <strong className="mono">6</strong>
        </div>

        {/* The state the record is in, and it has to be the true one. A docket
            shown on a quote screen has not been collected yet, and stamping it
            COLLECTED there would be the site claiming a step that has not
            happened -- the one thing this page refuses to do anywhere else. */}
        <div className="docket-stampline">
          <span className="docket-stamp mono">{stamp}</span>
        </div>
      </div>

        {/* The tear. Drawn as a mask on an element rather than as an image, so
            it takes the paper colour with it if the palette moves. */}
        <span className="docket-perf" aria-hidden="true" />
      </div>
    </figure>
  );
}
