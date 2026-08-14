import type { Metadata } from "next";
import { Chrome } from "../Chrome";

export const metadata: Metadata = {
  title: "Terms — Rebin Tech",
  description: "The terms on which Rebin Tech collects equipment and pays for scrap.",
};

/**
 * Deliberately short, and deliberately only about what the product does today.
 *
 * The temptation with a terms page is to write for the business the client
 * might have in a year. Every clause here describes behaviour that is actually
 * implemented -- quotes really do expire in seven days (0023), collected
 * weights really are compared against the quote before payment (0030), and
 * accounts really are active immediately with no approval step. A term
 * describing a mechanism that does not exist is unenforceable and misleading in
 * the same breath.
 */
export default function Terms() {
  return (
    <Chrome>
      <article className="shell prose">
        <h1>Terms</h1>
        <p className="updated mono">Last updated 14 August 2026</p>

        <p>
          These terms cover using the Rebin Tech app and handing equipment to us. They are written
          to be read rather than to be survived.
        </p>

        <h2>Accounts</h2>
        <p>
          You are responsible for what happens under your account, so keep your sign-in to yourself.
          Tell us if you think someone else has it. We may suspend an account that is being used to
          defraud us or anyone else.
        </p>

        <h2>Collections</h2>
        <p>
          When you book a collection you are telling us what you have and where it is. Have it ready
          and reachable at the address you gave, with someone on site who can let a driver in.
        </p>
        <p>
          Free collection is for organizations handing over ten or more devices. If we arrive and
          there is materially less than you booked, we may leave without collecting.
        </p>
        <p>
          Wipe your data first. We are not able to recover it for you afterwards and we do not read
          it, but the equipment leaves your control when it leaves your dock, so anything still on
          it leaves with it.
        </p>

        <h2>Quotes and payment</h2>
        <p>
          A quote is priced against our rates on the day you request it, and it holds for seven
          days. After that you can ask for a new one; rates move because metal prices move.
        </p>
        <p>
          What we pay is based on what actually arrives. Our driver records the weight and the count
          at your dock. Where that differs from the quote, payment is held until someone has looked
          at the difference and told you what they found — we would rather ask than quietly pay you
          for less than you handed over, or more.
        </p>
        <p>
          Prices shown by the camera are an estimate until the quote is issued. The app never lets a
          photograph set a price; every figure comes from our published rate list.
        </p>

        <h2>What we take</h2>
        <p>
          We take IT and electronic equipment. We do not take anything leaking, burning, swollen or
          otherwise unsafe to put in a van, and a driver may refuse an item on those grounds at the
          dock.
        </p>

        <h2>Records</h2>
        <p>
          We keep a record of what we collected from you and when. Where we have issued a recycling
          certificate, it stays verifiable — that is the point of it.
        </p>

        <h2>Liability</h2>
        <p>
          We will do this properly, but we cannot promise the app is never unavailable and we are
          not liable for indirect losses. Nothing here limits liability that cannot be limited by
          law.
        </p>

        <h2>Changes</h2>
        <p>
          If these terms change we will date the change here. A quote you already hold stays on the
          terms it was made under.
        </p>

        <h2>Contact</h2>
        <p>
          <span className="mono">hello@rebintech.com</span>
        </p>
      </article>
    </Chrome>
  );
}
