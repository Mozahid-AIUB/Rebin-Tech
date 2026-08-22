import { View } from "react-native";
import { configurationError } from "@rebin/api";
import { AppText, tokens } from "@rebin/ui";

/**
 * What a build with no backend shows instead of dying.
 *
 * `packages/api/src/client.ts` used to throw at module scope when
 * `EXPO_PUBLIC_SUPABASE_URL` or the anon key was absent. That throw happened
 * before the first frame, so the app closed itself on launch with no message
 * — the same symptom as a corrupt binary, on every device, with nothing in
 * the UI to distinguish a one-line build misconfiguration from a broken app.
 *
 * It is not hypothetical: an App Store build shipped that way because
 * `eas.json`'s production profile named no environment, and EAS resolves
 * variables per named environment. The preview APK worked, so the fault
 * looked platform-specific when it was neither.
 *
 * A build in this state genuinely cannot function — there is nothing to
 * connect to. But it can say which variable is missing, which turns half a
 * day of guessing into one glance. Deliberately plain: no branding, no retry
 * button, because there is nothing to retry until the app is rebuilt.
 */
export function ConfigurationNotice() {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: tokens.color.bg,
        alignItems: "center",
        justifyContent: "center",
        padding: tokens.space[5],
        gap: tokens.space[3],
      }}
    >
      <AppText variant="h2" style={{ textAlign: "center" }}>
        This build isn&apos;t configured
      </AppText>
      <AppText variant="bodySm" tone="secondary" style={{ textAlign: "center" }}>
        {configurationError}
      </AppText>
      <AppText variant="bodySm" tone="muted" style={{ textAlign: "center" }}>
        Rebuild with the environment variables set, then reinstall.
      </AppText>
    </View>
  );
}
