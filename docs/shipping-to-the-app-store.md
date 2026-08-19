# Shipping the mobile app to Apple

Apple rejects far more often for a missing sentence than for a broken build.
This is what has to be true before an upload is worth making.

## What the repo already handles

- **Bundle identifier** `com.rebintech.app`, and the same on Android.
- **Permission strings.** The camera and photo-library prompts explain what
  the photo is for, via the `expo-image-picker` plugin. Apple rejects a build
  whose prompt is the platform's generic wording, because "allow camera
  access" is not a reason.
- **Export compliance.** `ITSAppUsesNonExemptEncryption: false` is declared,
  so a build does not sit in "Missing Compliance" waiting for someone to
  answer the question by hand. The app uses HTTPS and Supabase auth, which is
  exempt.
- **Build number.** `autoIncrement` in `eas.json` advances it; Apple refuses a
  build whose number is not higher than the last one under the same version.
- **Icons.** No transparency in `icon.png`, which iOS rejects outright.

## What a person has to do

### Before the first upload

1. **Apple Developer Program** — $99/year, and enrolment can take a couple of
   days. Nothing else can start until this exists.
2. **App Store Connect record** — create the app, matching the bundle
   identifier exactly.
3. **Privacy policy at a public URL.** Apple requires one and follows the
   link. `/privacy` in the web app is written; it has to be deployed and
   reachable before review, not after.
4. **Support URL.** Apple requires somewhere a user can ask for help. A
   contact page or a mailto is enough.

### The privacy questionnaire

App Store Connect asks what the app collects. Answer it from what the code
actually does, not from what feels safe — a wrong answer here is a rejection
and a resubmission.

| Apple's category | This app |
|---|---|
| Contact info | Yes — name, email, phone, at signup |
| Location | Yes — a collection address, typed, not device GPS |
| User content | **Photographs are sent but not stored.** Declare the camera use; the images are not retained |
| Identifiers | Account ID only |
| Purchases | None |
| Tracking | None. No third-party analytics, no ad SDK |

### The demo account — this is the usual rejection

The reviewer signs in. Everything behind the login is invisible to them
otherwise, and "we could not review your app" is the most common outcome of
forgetting this.

Give them, in the review notes:

- a **supplier** account, which shows the most of the product
- the password
- one sentence on what to do: sign in, tap Scan, photograph any electronic
  device, see the estimate

A supplier account is the right choice because it reaches a quote without
needing Rebin to schedule anything.

### What the reviewer must not hit

- **A dead end.** Every screen needs a way back. A screen that can only be
  left by force-quitting is a rejection.
- **A promise the app cannot keep.** The seven-day payout line is honest --
  an operator records the payment -- but nothing in the app should claim a
  capability that is not built.
- **Placeholder content.** No "lorem ipsum", no test rows visible in a demo
  account, no obviously fake business names in the reviewer's own view.

## Building

```bash
# Once per machine
npx eas init --account mozahidislam

# The upload Apple wants
npx eas build --platform ios --profile production
```

EAS creates and keeps the signing certificates. **Do not manage them by
hand.** If the certificate is lost, updates to an already-published app stop
being possible.

Then:

```bash
npx eas submit --platform ios --latest
```

## After the first release

`runtimeVersion` is `appVersion`, so an over-the-air update only reaches
builds with a matching version. A change to native code -- a new permission,
a new native module -- needs a new build through review; a change to
JavaScript alone can go out over the air.
