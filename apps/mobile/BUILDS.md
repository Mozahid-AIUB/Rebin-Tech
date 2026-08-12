# Builds

eas.json cannot carry comments — its schema rejects unknown keys, including
the `"// note"` trick — so the reasoning lives here.

## Why a dev build rather than Expo Go

Expo Go carries one SDK at a time. This project is on SDK 57; updating Expo Go
to match would break every SDK 54 project on the same phone. A dev build is its
own app with its own runtime, so Expo Go can stay where it is.

It is also the only way to run two things this app already depends on:

- `react-native-keyboard-controller` is not bundled in Expo Go at all.
- `react-native-vision-camera`, which the plan wants for the agent's continuous
  scanner (S53), never could be.

## Profiles

| Profile | What it is | Why |
|---|---|---|
| `development` | Dev client, APK, internal | APK rather than the default AAB: an AAB must go through a store to install, and this build exists to be sideloaded from a link. |
| `preview` | No dev tooling, APK, internal | What a client installs to try the app before it reaches a store. |
| `production` | AAB, auto-incremented | What Play requires. |

## Building

```bash
eas login
cd apps/mobile
eas build --profile development --platform android
```

Answer **yes** to creating the EAS project and to generating a keystore — EAS
holds the keystore, which is what you want until there is a reason not to.

Then, per session:

```bash
npx expo start --dev-client
```

The dev client loads its JS from that server, so `EXPO_PUBLIC_*` values come
from `apps/mobile/.env` at bundle time rather than being baked into the APK.
Switching between the local Supabase stack and the cloud is still an edit to
that file and a restart — the build does not need redoing.

## Monorepo note

This is a pnpm workspace. If EAS fails to resolve `@rebin/ui`, `@rebin/api` or
`@rebin/shared`, the fix is at the repo root rather than in this package:
EAS needs to install from the workspace root so the symlinked packages resolve.
