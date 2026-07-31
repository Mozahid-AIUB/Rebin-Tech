import { Stack } from "expo-router";

// No RoleGuard here, deliberately: everything under (auth) is pre-session —
// Login (and future Sign Up / Forgot Password screens) must render for a
// signed-out visitor, which is exactly the state RoleGuard redirects away
// from. Compare (org)/_layout.tsx and (biz)/_layout.tsx, which do wrap in
// RoleGuard because those screens are only ever valid for an
// already-authenticated, role-resolved user.
export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
