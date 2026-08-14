import { BoardField } from "./BoardField";
import { HeroScene } from "./HeroScene";
import { PhoneMock } from "./PhoneMock";
import { Seam } from "./Seam";
import { Foot, Nav, PhotoSlot } from "./Chrome";
import { NavShadow } from "./NavShadow";
import { Reveal } from "./Reveal";

/**
 * The full marketing page, in the section order a service business needs: who
 * you are, what you do, how it works, how to reach you, and the questions
 * everyone asks before they call.
 *
 * Two things are deliberately absent. There are no photographs of people in
 * branded overalls, because those would be stock models rather than this
 * company's staff, and a hospital IT manager has seen the same faces on a dozen
 * competitors' sites. And there is no review count, star rating or testimonial,
 * because Rebin has none yet -- publishing invented ones is a false statement
 * to a customer and, in the US, an FTC matter for the client rather than a
 * design decision for me. Both shapes are built and marked; they fill in the
 * moment there is real material.
 */
export default function Home() {
  return (
    <>
      <NavShadow />
      <Nav />

      <header className="hero">
        <BoardField />
        <div className="shell hero-grid">
          <div className="hero-inner">
          <span className="eyebrow">Free, compliant e-waste recycling</span>
          <h1>
            Retired equipment, <em>documented</em> out the door.
          </h1>
          <p className="hero-lede">
            Somebody has to deal with the pile of old machines in the back room, and it has
            probably ended up being you. We come and take them, recover what is inside, and hand
            you a record of every device — so when someone asks where it all went, you have the
            answer.
          </p>

          <div className="hero-actions">
            <a className="btn btn-light" href="#services">
              Book a collection
            </a>
            <a className="btn btn-line" href="#contact">
              Talk to someone
            </a>
          </div>

          {/* Facts a visitor can check rather than numbers we made up. */}
          <div className="hero-facts">
            <div className="fact">
              <strong className="mono">10+</strong>
              <span>Devices for a free organization pickup</span>
            </div>
            <div className="fact">
              <strong className="mono">7 days</strong>
              <span>A scrap quote holds at the rate you were given</span>
            </div>
            <div className="fact">
              <strong>Every device</strong>
              <span>Listed on the record we hand back</span>
            </div>
            </div>
          </div>

          {/* The product itself, rather than a picture of recycling. */}
          <PhoneMock />
        </div>
      </header>

      <Seam />

      <Reveal as="section" className="section" id="about">
        <div className="shell about">
          {/* The app's own drawing rather than a photograph. Original work
              built from these tokens, so there is no licence attached and a
              visitor sees the same illustration when they open the app. */}
          <div className="about-art">
            <HeroScene />
          </div>

          <div>
            <div className="section-head">
              <span className="eyebrow">About us</span>
              <h2>The disposal partner that hands you the paperwork.</h2>
              <p>
                Most recyclers will take your equipment. Very few can tell you afterwards exactly
                what they took, when, and who carried it. That record is what an auditor asks for,
                and it is what the whole service is built around.
              </p>
            </div>

            <div className="tabs">
              <span className="tab tab-on">What we do</span>
              <span className="tab">Who we serve</span>
              <span className="tab">How we charge</span>
            </div>

            <div className="points">
              <Point
                mark="01"
                title="Documented from the dock"
                body="Every device is counted before it moves and weighed when it does. The two are compared before anyone is paid."
              />
              <Point
                mark="02"
                title="Nothing priced by guesswork"
                body="Scrap is priced against a published rate list, per pound, on the day. A photograph identifies what you have; it never decides what it is worth."
              />
              <Point
                mark="03"
                title="Your data leaves on your terms"
                body="We do not read the drives we collect. Wipe them first — and if there are any you cannot, say so when you book and we will treat them as sensitive."
              />
            </div>
          </div>
        </div>
      </Reveal>

      <Reveal as="section" className="band" id="contact">
        <div className="shell band-inner">
          <div>
            <span className="eyebrow">Talk to us</span>
            <h2 style={{ marginTop: "0.75rem" }}>Have a clear-out coming up?</h2>
            <p>
              Tell us roughly what you have and where it is. If it is not something we can take, we
              will say so on the call rather than send a van.
            </p>
          </div>
          <div className="band-call">
            <span className="eyebrow">Call the office</span>
            <a href="tel:+15550100000">(555) 010-0000</a>
          </div>
        </div>

        {/* A photograph rather than the cut-out vehicle this layout usually
            carries. A cut-out needs a transparent PNG, and the stock libraries
            whose licences permit commercial use ship JPEGs -- so the honest
            version is a real photograph with its edges dissolved into the
            band, which reads the same and is actually licensed. */}
        <div className="band-vehicle" aria-hidden="true">
          <img src="/photos/van.jpg" alt="" loading="lazy" decoding="async" />
        </div>
      </Reveal>

      <Reveal as="section" className="section tint" id="services">
        <div className="shell">
          <div className="section-head center">
            <span className="eyebrow">What we do</span>
            <h2>Three ways in, depending on what you have.</h2>
            <p>
              The service underneath is the same. What changes is whether you are paying nothing,
              being paid, or just getting rid of one old laptop.
            </p>
          </div>

          <div className="grid-3">
            <Service
              tag="Organizations"
              title="Bulk removal, at no cost"
              body="Hospitals, schools, municipal offices and corporate sites. Book a window, we come to your dock, and you keep the manifest of every device we took."
              photo="/photos/service-org.jpg"
              photoAlt="Rack-mounted servers and network gear in a machine room"
              foot="10+ devices"
              action="No charge"
            />
            <Service
              tag="Businesses"
              title="Get paid for scrap"
              body="Repair shops, resellers and refurbishers. Photograph what you have and the app prices it against the day's rates. Accept, and a driver comes to collect."
              photo="/photos/service-biz.jpg"
              photoAlt="Circuit boards and components sorted on a workbench"
              foot="Priced per pound"
              action="Paid on collection"
            />
            <Service
              tag="Individuals"
              title="One or two old machines"
              body="A laptop in a cupboard and a drawer of phones. Tell us what you have and we will write back with the nearest way to hand it over."
              photo="/photos/service-ind.jpg"
              photoAlt="An old laptop set aside on a desk"
              foot="Any quantity"
              action="Coming shortly"
            />
          </div>
        </div>
      </Reveal>

      <Reveal as="section" className="section" id="process">
        <div className="shell">
          <div className="section-head">
            <span className="eyebrow">Chain of custody</span>
            <h2>Four records, in the order they are made.</h2>
            <p>
              Each stage produces the document the next one needs. That is the whole reason the
              paperwork holds up — nothing is written after the fact.
            </p>
          </div>

          {/* A genuine sequence, which is the only thing that earns a
              sequential structure. The vias mark which stages write something
              down and which are only a movement. */}
          <ol className="chain">
            <Stage
              label="Manifest"
              title="Everything is counted before it moves"
              body="You list what you have, or photograph it and let the app identify it. That list becomes the manifest attached to the collection."
              records
            />
            <Stage
              label="Collection"
              title="A named driver, on a known date"
              body="A field agent takes the job, travels to your site, and is recorded against it from the moment they accept."
            />
            <Stage
              label="Weight"
              title="Weighed and counted on site"
              body="What actually leaves is weighed at your dock, not estimated in an office. If it differs from the manifest, the difference is flagged and payment waits until someone has checked it."
              records
            />
            <Stage
              label="Recovery"
              title="Materials recovered, record closed"
              body="Boards, memory and drives are separated and sent for recovery. The record closes with what was received against what was collected."
              records
            />
          </ol>
        </div>
      </Reveal>

      <Reveal as="section" className="section proof">
        <div className="shell">
          <div className="section-head">
            <span className="eyebrow">Track record</span>
            <h2 style={{ color: "var(--silk)" }}>Proof goes here, once there is some.</h2>
          </div>
          <div className="proof-note">
            <strong>A note for the client, not for visitors</strong>
            Customer names, tonnage recovered and reviews belong in this space. It is empty because
            those numbers do not exist yet, and publishing invented ones on a real company&rsquo;s
            site is a false statement to a customer — in the US, an FTC matter. Send real figures
            and this fills in. Until then the section does not ship.
          </div>
        </div>
      </Reveal>

      <Reveal as="section" className="section" id="expect">
        <div className="shell">
          <div className="section-head">
            <span className="eyebrow">After you get in touch</span>
            <h2>What actually happens next.</h2>
            <p>
              No forms that go nowhere. Here is the whole sequence, so you know what you are
              agreeing to before you agree to it.
            </p>
          </div>

          <div className="steps">
            <Step
              n="1"
              t="Someone reads it"
              b="A person, not an autoresponder. If what you have is not something we take, we tell you then rather than after a van has been out."
            />
            <Step
              n="2"
              t="We agree a window"
              b="You pick a day and a time range that suits your dock. Nothing is booked until you say so."
            />
            <Step
              n="3"
              t="A named driver comes"
              b="You see who has the job before they arrive. They check in at your dock, count what they take, and weigh it there."
            />
            <Step
              n="4"
              t="You get the record"
              b="A list of every device, what it weighed, who collected it and when. Yours to keep and to hand to whoever asks."
            />
          </div>
        </div>
      </Reveal>

      <Reveal as="section" className="section tint" id="faq">
        <div className="shell">
          <div className="section-head">
            <span className="eyebrow">Before you call</span>
            <h2>The questions we actually get asked.</h2>
          </div>

          <div className="faq">
            <Question q="Does it cost anything?">
              Not for organizations handing over ten or more devices. Businesses selling scrap are
              paid rather than charged. Individuals are free.
            </Question>
            <Question q="What happens to the data on the drives?">
              Wipe them before we arrive. We do not read them, and we cannot recover anything for
              you afterwards. If there are drives you cannot wipe yourself, say so when you book and
              we will handle them as sensitive.
            </Question>
            <Question q="What do you not take?">
              Anything leaking, burning or swollen. A driver can refuse an item at the dock on those
              grounds — it has to travel in a van with a person.
            </Question>
            <Question q="How is scrap priced?">
              Per pound, against a published rate list, on the day you ask. The camera identifies
              what you have; the rate list decides what it is worth. A quote holds for seven days,
              because metal prices move.
            </Question>
            <Question q="How soon can someone come?">
              You pick a window when you book. A driver takes the job from the board, and you see
              who has it and when they are coming.
            </Question>
          </div>
        </div>
      </Reveal>

      <Foot />
    </>
  );
}

function Step({ n, t, b }: { n: string; t: string; b: string }) {
  return (
    <div className="step">
      <span className="step-n mono">{n}</span>
      <h3>{t}</h3>
      <p>{b}</p>
    </div>
  );
}

function Point({ mark, title, body }: { mark: string; title: string; body: string }) {
  return (
    <div className="point">
      <span className="point-mark">{mark}</span>
      <div>
        <h3>{title}</h3>
        <p>{body}</p>
      </div>
    </div>
  );
}

function Service({
  tag,
  title,
  body,
  photo,
  photoAlt,
  foot,
  action,
}: {
  tag: string;
  title: string;
  body: string;
  photo: string;
  photoAlt: string;
  foot: string;
  action: string;
}) {
  return (
    <article className="card">
      <PhotoSlot ratio="16 / 10" src={photo} alt={photoAlt} />
      <div className="card-body">
        <span className="eyebrow">{tag}</span>
        <h3>{title}</h3>
        <p>{body}</p>
        <div className="card-foot">
          <span className="mono">{foot}</span>
          <span className="card-link">{action}</span>
        </div>
      </div>
    </article>
  );
}

function Stage({
  label,
  title,
  body,
  records = false,
}: {
  label: string;
  title: string;
  body: string;
  /** Whether this stage writes something down. Filled via if it does. */
  records?: boolean;
}) {
  return (
    <li className="stage">
      <div className="stage-rail">
        <span className={records ? "via via-filled" : "via"} />
      </div>
      <div>
        <span className="eyebrow">{label}</span>
        <h3>{title}</h3>
        <p>{body}</p>
      </div>
    </li>
  );
}

function Question({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <details>
      <summary>{q}</summary>
      <p>{children}</p>
    </details>
  );
}
