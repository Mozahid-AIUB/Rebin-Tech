import type { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
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
  ios: { bundleIdentifier: "com.rebintech.app", supportsTablet: true },
  android: {
    package: "com.rebintech.app",
    adaptiveIcon: { backgroundColor: "#EDEFE9" },
  },
  plugins: [
    "expo-router",
    [
      // Without this the camera prompt shows iOS's generic wording, and on a
      // release build the store rejects a camera app with no stated purpose.
      // The copy says what the photo is for, because "allow camera access" is
      // not a reason.
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
};

export default config;
