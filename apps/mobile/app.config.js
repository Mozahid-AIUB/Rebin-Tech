// Plain JS rather than TypeScript on purpose.
//
// With app.config.ts, EAS reads the config through @expo/config, which
// transpiles it by requiring `typescript` from its own location. Under pnpm's
// strict node_modules that resolution fails, and the failure surfaces as
// "Cannot read properties of undefined (reading 'CommonJS')" -- a message that
// says nothing about the cause. No TypeScript, no transpile step, no problem.
//
// Nothing here needs types: it is a literal object, and Expo validates it.

/** @type {import('expo/config').ExpoConfig} */
const config = {
  name: "Rebin Tech",
  slug: "rebin-tech",
  scheme: "rebintech",
  version: "0.1.0",
  orientation: "portrait",
  userInterfaceStyle: "light",
  // Silkscreen off-white, matching tokens.color.bg. This is the colour behind
  // the app before the first frame paints, so a stale value here shows as a
  // flash of the old palette on every cold start.
  backgroundColor: "#EDEFE9",
  // Spelled out because Expo's defaults point at ./assets/images/, and these
  // live in ./assets/ -- left implicit, Metro spends every launch failing to
  // read a directory that does not exist.
  icon: "./assets/icon.png",
  ios: {
    bundleIdentifier: "com.rebintech.app",
    supportsTablet: true,
    infoPlist: {
      // Declared so App Store Connect stops asking on every single upload.
      // The app uses HTTPS and Supabase's auth, which is exempt encryption
      // under the US export rules -- but an undeclared build sits in
      // "Missing Compliance" until someone answers the question by hand.
      ITSAppUsesNonExemptEncryption: false,
    },
    // Every build Apple accepts must carry a build number higher than the
    // last one under the same version. `autoIncrement` in eas.json advances
    // it; this is the floor it counts from.
    buildNumber: "1",
  },
  android: {
    package: "com.rebintech.app",
    adaptiveIcon: {
      foregroundImage: "./assets/android-icon-foreground.png",
      backgroundImage: "./assets/android-icon-background.png",
      monochromeImage: "./assets/android-icon-monochrome.png",
      backgroundColor: "#EDEFE9",
    },
  },
  web: { favicon: "./assets/favicon.png" },
  plugins: [
    "expo-router",
    [
      // Without this the camera prompt shows the platform's generic wording,
      // and a release build is rejected for asking a camera app's question
      // with no stated purpose. The copy says what the photo is for, because
      // "allow camera access" is not a reason.
      "expo-image-picker",
      {
        photosPermission:
          "Rebin Tech uses your photos to identify and price the devices you're recycling.",
        cameraPermission:
          "Rebin Tech uses the camera to identify devices and read their asset tags.",
      },
    ],
  ],
  experiments: { typedRoutes: true },
  owner: "mozahidislam",
  extra: {
    // Written here rather than left for `eas init` to insert: a dynamic config
    // is not a file EAS can edit, so it has to be told.
    eas: { projectId: "d7a7f1f0-dde3-4fe7-8790-9347317bde60" },
  },
  updates: {
    url: "https://u.expo.dev/d7a7f1f0-dde3-4fe7-8790-9347317bde60",
  },
  runtimeVersion: { policy: "appVersion" },
};

module.exports = config;
