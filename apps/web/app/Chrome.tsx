import Link from "next/link";

/**
 * The bar, the footer, and the shape a photograph will take.
 *
 * Shared because the long-form pages need the same frame as the landing page.
 * The landing page's hero carries its own dark surface, so the nav here is
 * light and sticky rather than sitting inside it -- one bar, one behaviour, on
 * every page.
 */

const PHONE_DISPLAY = "(555) 010-0000";
const PHONE_HREF = "tel:+15550100000";
const EMAIL = "hello@rebintech.com";

export function Nav() {
  return (
    <>
      <div className="topbar">
        <div className="shell topbar-inner">
          <span>Serving the continental US · Monday to Friday, 8am–6pm</span>
          <span>
            <a href={PHONE_HREF} className="mono">
              {PHONE_DISPLAY}
            </a>
            {" · "}
            <a href={`mailto:${EMAIL}`}>{EMAIL}</a>
          </span>
        </div>
      </div>

      <nav className="nav">
        <div className="shell nav-inner">
          <Link href="/" className="wordmark">
            Rebin Tech <small>Collect · Recover · Record</small>
          </Link>
          <div className="nav-links">
            <a href="/#about">About</a>
            <a href="/#services">Services</a>
            <a href="/#process">Process</a>
            <a href="/#faq">FAQ</a>
          </div>
          <a className="btn btn-primary" href="/#contact">
            Contact us
          </a>
        </div>
      </nav>
    </>
  );
}

/**
 * A photograph, in a box that already knows what shape it will be.
 *
 * The ratio is fixed by the slot rather than by the image, so swapping one
 * picture for another cannot shift the layout underneath it -- the commonest
 * way a page that looked right in review falls apart once real assets arrive.
 * The image is `object-fit: cover`, which crops the overflow and keeps the
 * proportions; `fill` is the setting that stretches a face sideways, and it is
 * never what you want on a photograph.
 *
 * These are Unsplash photographs, whose licence permits commercial use. They
 * are stand-ins. The moment the client has pictures of their own vans, yard
 * and people, those replace these -- deliberately so, because equipment and
 * premises photograph as *someone's*, whereas a stock portrait of a smiling
 * worker in branded overalls is the single most recognisable tell of a bought
 * template, and the institutional buyers this page is written for have seen
 * those same faces on competitors' sites.
 *
 * Cropped to the target ratio on Unsplash's side rather than in the browser,
 * so a phone downloads a phone-sized file.
 */
export function PhotoSlot({
  ratio,
  src,
  alt,
  caption,
}: {
  ratio: string;
  src?: string;
  /** What is in the picture. Never decorative here -- these carry meaning. */
  alt?: string;
  /** Shown only while there is no photograph. */
  caption?: string;
}) {
  return (
    <div className={src ? "photo-slot has-photo" : "photo-slot"} style={{ aspectRatio: ratio }}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt ?? ""} loading="lazy" decoding="async" />
      ) : (
        <p>
          <span className="mono">Photograph</span>
          {caption}
        </p>
      )}
    </div>
  );
}

export function Foot() {
  return (
    <footer className="foot">
      <div className="shell foot-grid">
        <div>
          <span className="wordmark">
            Rebin Tech <small>Collect · Recover · Record</small>
          </span>
          <p className="foot-note">
            We collect retired IT equipment across the United States, recover the materials inside
            it, and hand back a record of every device.
          </p>
          <div className="foot-contact">
            <a href={PHONE_HREF}>{PHONE_DISPLAY}</a>
            <br />
            <a href={`mailto:${EMAIL}`}>{EMAIL}</a>
          </div>
        </div>

        <div>
          <h4>Services</h4>
          <ul>
            <li>
              <a href="/#services">Organization pickup</a>
            </li>
            <li>
              <a href="/#services">Scrap purchase</a>
            </li>
            <li>
              <a href="/#services">Individual drop-off</a>
            </li>
            <li>
              <a href="/#process">Recycling records</a>
            </li>
          </ul>
        </div>

        <div>
          <h4>Company</h4>
          <ul>
            <li>
              <a href="/#about">About</a>
            </li>
            <li>
              <a href="/#process">How it works</a>
            </li>
            <li>
              <a href="/#faq">FAQ</a>
            </li>
            <li>
              <a href="/#contact">Contact</a>
            </li>
          </ul>
        </div>

        <div>
          <h4>Legal</h4>
          <ul>
            <li>
              <Link href="/privacy">Privacy</Link>
            </li>
            <li>
              <Link href="/terms">Terms</Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="shell foot-bar">
        <span>&copy; {new Date().getFullYear()} Rebin Tech</span>
        <nav>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
        </nav>
      </div>
    </footer>
  );
}

/** Frame for the long-form pages. */
export function Chrome({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Nav />
      {children}
      <Foot />
    </>
  );
}
