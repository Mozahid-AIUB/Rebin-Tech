import { Docket } from "./Docket";

/**
 * The app's quote screen, in a phone, in the hero.
 *
 * This is the strongest thing the page can show, because the app *is* the
 * differentiator: photograph a pallet, get a priced offer. An illustration of
 * recycling says what the company does; this says what the product does, and a
 * visitor understands it without reading a word.
 *
 * Built out of the real tokens and the real screen rather than a screenshot.
 * A screenshot goes stale the moment a label changes, blurs on a retina
 * display unless it is shipped at 3x, and weighs more than everything else on
 * the page put together. This is a few kilobytes of markup that stays sharp at
 * any size and picks up a palette change automatically.
 *
 * The figures are the ones from the app's own test fixtures -- a real catalog
 * line at a real catalog rate -- so nothing here claims a price the product
 * would not actually produce.
 */
export function PhoneMock() {
  return (
    <div className="phone" aria-hidden="true">
      {/* The step before the offer. Two screens rather than one because the
          product is a sequence -- photograph a pallet, get a priced offer --
          and a single screen only ever shows half of it. Behind and turned
          further away, so it reads as the earlier step without competing. */}
      <div className="phone-body phone-back">
        <span className="ph-btn ph-btn-vol" />
        <span className="ph-btn ph-btn-pwr" />
        <div className="phone-screen">
          <span className="ph-island" />
          <span className="ph-gloss" />
          <div className="ph-bar">
            <span className="mono">9:40</span>
            <span className="ph-dots" />
          </div>
          <div className="ph-head">
            <span className="ph-eyebrow mono">Scan your stock</span>
            <strong>Take a photo</strong>
          </div>
          <div className="ph-viewfinder">
            <span className="ph-frame" />
          </div>
          <div className="ph-reading mono">Reading the photo…</div>
          <div className="ph-cta">Take a photo</div>
        </div>
      </div>

      <div className="phone-body phone-front">
        <span className="ph-btn ph-btn-vol" />
        <span className="ph-btn ph-btn-pwr" />
        <div className="phone-screen">
          <span className="ph-island" />
          <span className="ph-gloss" />
          <div className="ph-bar">
            <span className="mono">9:41</span>
            <span className="ph-dots" />
          </div>

          <div className="ph-head">
            <span className="ph-eyebrow mono">Scan your stock</span>
            <strong>Estimated offer</strong>
          </div>

          <div className="ph-total mono">$360.00</div>

          <div className="ph-line">
            <div>
              <strong>Business laptop</strong>
              <span className="mono">3 × $120.00 · working</span>
            </div>
            <span className="ph-amount mono">$360.00</span>
          </div>

          <div className="ph-line ph-line-quiet">
            <div>
              <strong>LCD monitor</strong>
              <span className="mono">2 × $5.00 · broken</span>
            </div>
            <span className="ph-amount mono">$10.00</span>
          </div>

          <div className="ph-cta">Use this quote</div>
          <div className="ph-note">Priced against today&rsquo;s catalog</div>

          {/* What accepting the quote produces, on the same screen that offers
              it. The lower half of this screen was empty -- a mock that runs
              out of content halfway down reads as an unfinished screen rather
              than as a real one, and the app has something true to put there.
              It runs off the bottom edge, because a document on a phone does. */}
          <div className="ph-docket">
            <Docket stamp="Quoted" />
          </div>
        </div>
      </div>
    </div>
  );
}
