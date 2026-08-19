import type { Metadata } from "next";
import { Chrome } from "../Chrome";

export const metadata: Metadata = {
  title: "Privacy — Rebin Tech",
  description: "What the Rebin Tech app collects, why, and how long it is kept.",
};

/**
 * Written against the schema rather than from a template.
 *
 * Every field named below is one the app actually writes: `profiles`
 * (0002_identity), `organizations` and `businesses` (0011), `agents` (0011),
 * `pickup_requests` (0005), and the photographs the scan functions send to
 * Google. A privacy policy that describes data an app does not hold, or omits
 * data it does, is worse than none -- it is a written statement that turns out
 * to be false the first time anyone checks.
 *
 * The app stores are strict about this page existing at all; neither will
 * accept a submission without a reachable privacy URL.
 */
export default function Privacy() {
  return (
    <Chrome>
      <article className="shell prose">
        <h1>Privacy</h1>
        <p className="updated mono">Last updated 14 August 2026</p>

        <p>
          Rebin Tech collects retired electronic equipment in the United States. This page describes
          what the Rebin Tech mobile app records about you, why, and how long we keep it. It covers
          the app and this website.
        </p>

        <h2>What we collect</h2>
        <table>
          <thead>
            <tr>
              <th>What</th>
              <th>Why</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Your name, email address and phone number</td>
              <td>To create your account and to reach you about a collection</td>
            </tr>
            <tr>
              <td>Your profile photo, if you sign in with Google or Apple</td>
              <td>Shown only back to you, on your own account screen</td>
            </tr>
            <tr>
              <td>
                Your organization or business name, type, address and — where a business gives one —
                its EIN, website or map listing
              </td>
              <td>To confirm the account is a real trading entity before we buy from it</td>
            </tr>
            <tr>
              <td>The address equipment is collected from, and any dock or access notes</td>
              <td>So a driver can find the loading bay and get in</td>
            </tr>
            <tr>
              <td>The name and phone number of your on-site contact</td>
              <td>So the driver can reach someone on the day</td>
            </tr>
            <tr>
              <td>Photographs you take of equipment</td>
              <td>To identify and price what you are handing over</td>
            </tr>
            <tr>
              <td>What was collected, when, by whom, and its weight</td>
              <td>To pay you correctly and to produce your recycling record</td>
            </tr>
            <tr>
              <td>
                For drivers only: the city, state and postcode of the area you work, your vehicle
                type, and whether you hold a licence
              </td>
              <td>To route work to drivers who can actually take it</td>
            </tr>
          </tbody>
        </table>

        <h2>What we do not collect</h2>
        <ul>
          <li>
            We do not track your location in the background. The app has no location permission; the
            addresses we hold are the ones you typed.
          </li>
          <li>We do not read the data on the devices you hand over.</li>
          <li>We do not sell your personal information, and we do not run advertising.</li>
        </ul>

        <h2>Photographs</h2>
        <p>
          When you photograph equipment, that image is sent to Google&rsquo;s Gemini service, which
          identifies what is in it. Google processes the image to return that answer and does not
          keep it. Neither do we: the photograph is never written to our database or to any file
          store. What we keep is the list it produced &mdash; the equipment and the count &mdash;
          and never the picture itself.
        </p>
        <p>
          Photograph only the equipment. A picture of a screen, a label or a document may contain
          information that has nothing to do with recycling, and we would rather never receive it.
        </p>

        <h2>Who else sees it</h2>
        <ul>
          <li>
            <strong>Supabase</strong> hosts our database and handles sign-in. Your data is stored on
            their infrastructure in the United States.
          </li>
          <li>
            <strong>Google</strong> receives equipment photographs, as described above, and — if you
            choose to sign in with a Google account — confirms who you are.
          </li>
          <li>
            <strong>The driver assigned to your collection</strong> sees your collection address,
            your on-site contact, and what you said you have. They do not see your other
            collections.
          </li>
          <li>
            <strong>Rebin Tech staff</strong> see accounts and collections in order to run the
            service and to settle payments.
          </li>
        </ul>
        <p>
          Businesses and organizations cannot see one another&rsquo;s accounts, quotes or
          collections. That separation is enforced by the database, not by the app.
        </p>

        <h2>How long we keep it</h2>
        <ul>
          <li>
            <strong>Your account</strong> — until you ask us to close it.
          </li>
          <li>
            <strong>Collection and payment records</strong> — kept after an account closes, because
            a recycling certificate has to remain verifiable and because tax records must be
            retained.
          </li>
          <li>
            <strong>Equipment photographs</strong> — not retained.
          </li>
        </ul>

        <h2>Your choices</h2>
        <p>
          Ask us and we will give you a copy of what we hold about you, correct anything that is
          wrong, or close your account and delete what we are not required to keep. If you are in
          California, the CCPA gives you these rights explicitly; we apply the same process wherever
          you are.
        </p>
        <p>
          You can edit your own name and phone number in the app at any time, on the Me screen.
        </p>

        <h2>Children</h2>
        <p>
          The app is for people running a business, an institution, or a collection round. It is not
          intended for anyone under 18 and we do not knowingly collect their information.
        </p>

        <h2>Changes</h2>
        <p>
          If we start collecting something new, we will change this page and date it before we do,
          not afterwards.
        </p>

        <h2>Contact</h2>
        <p>
          Write to <span className="mono">privacy@rebintech.com</span> with anything on this page,
          including a request to see or delete your data.
        </p>
      </article>
    </Chrome>
  );
}
