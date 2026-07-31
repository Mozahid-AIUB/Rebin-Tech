import type { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "Rebin Tech",
  slug: "rebin-tech",
  scheme: "rebintech",
  version: "0.1.0",
  orientation: "portrait",
  userInterfaceStyle: "light",
  backgroundColor: "#F6F4ED",
  ios: { bundleIdentifier: "com.rebintech.app", supportsTablet: true },
  android: { package: "com.rebintech.app", adaptiveIcon: { backgroundColor: "#F6F4ED" } },
  plugins: ["expo-router"],
  experiments: { typedRoutes: true },
};

export default config;
