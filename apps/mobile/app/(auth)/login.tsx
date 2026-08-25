import { useState } from "react";
import { Linking, Pressable, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { LEGAL_URLS, loginSchema } from "@rebin/shared";
import { AppText, AuthButton, AuthInput, AuthScreen, FONT, LegalCopy, authTokens } from "@rebin/ui";
import { useLogin } from "../../src/hooks/useLogin";

// See RoleGuard.tsx's and the root _layout.tsx's own `asHref` for the
// identical reasoning. "/signup" is a known, hand-authored route name, never
// unvalidated user input, so this cast can't hide a typo class of bug.
function asHref(path: string): Href {
  return path as Href;
}

// Small, local decorative icons for this screen only (a leading mail/lock
// glyph per input field). Kept local rather than added to packages/ui since
// they're specific to this screen's layout, not general-purpose primitives
// other screens need yet.
function MailIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
      <Rect x="1.5" y="3.5" width="15" height="11" rx="2" stroke={authTokens.primary} strokeWidth="1.4" />
      <Path d="M2.5 4.5 L9 10 L15.5 4.5" stroke={authTokens.primary} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function LockIcon() {
  return (
    <Svg width={16} height={18} viewBox="0 0 16 18" fill="none">
      <Rect x="1.5" y="7.5" width="13" height="9" rx="2" stroke={authTokens.primary} strokeWidth="1.4" />
      <Path d="M4.5 7.5 V5 a3.5 3.5 0 0 1 7 0 V7.5" stroke={authTokens.primary} strokeWidth="1.4" />
      <Circle cx="8" cy="12" r="1.3" fill={authTokens.primary} />
    </Svg>
  );
}

// Small local checkbox for "Remember me" -- no dark-forest checkbox exists
// in packages/ui yet (Task 15 didn't build one), so this stays screen-local
// rather than speculatively adding a new shared primitive for one use site.
function RememberMeCheckbox({ checked, onToggle }: { checked: boolean; onToggle: () => void }) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel="Remember me"
      accessibilityState={{ checked }}
      onPress={onToggle}
      style={{ flexDirection: "row", alignItems: "center", gap: 8, minHeight: 44 }}
    >
      <View
        style={{
          width: 18,
          height: 18,
          borderRadius: 5,
          borderWidth: 1.5,
          borderColor: checked ? authTokens.primary : authTokens.border,
          backgroundColor: checked ? authTokens.primary : "transparent",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {checked ? (
          <Svg width={11} height={9} viewBox="0 0 11 9" fill="none">
            <Path d="M1 4.5 L4 7.5 L10 1" stroke={authTokens.onPrimary} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        ) : null}
      </View>
      <AppText variant="bodySm" style={{ color: authTokens.muted }}>Remember me</AppText>
    </Pressable>
  );
}

export default function Login() {
  const router = useRouter();
  const { submit, isPending, error } = useLogin();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [rememberMe, setRememberMe] = useState(true);
  const [forgotNotice, setForgotNotice] = useState(false);

  // The master plan lists S05 (Forgot Password) as P1 -- a Supabase-hosted
  // reset-email flow with no custom UI built yet. Routing to "/forgot-password"
  // hit a route that doesn't exist, a dead tap Apple's reviewer would read as
  // the same class of bug as the Sign in with Apple crash. An honest, visible
  // status beats a silent no-op until S05 is actually built.
  function onForgotPassword() {
    setForgotNotice(true);
  }

  function onSubmit() {
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      const next: { email?: string; password?: string } = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (key === "email" || key === "password") next[key] = issue.message;
      }
      setFieldErrors(next);
      return;
    }
    setFieldErrors({});
    void submit(parsed.data);
  }

  return (
    <AuthScreen title="Welcome back!" subtitle="Log in to continue your eco-journey">
      <AuthInput
        label="Email"
        placeholder="Enter your email"
        value={email}
        onChangeText={setEmail}
        error={fieldErrors.email}
        keyboardType="email-address"
        icon={<MailIcon />}
      />
      <AuthInput
        label="Password"
        placeholder="Enter your password"
        value={password}
        onChangeText={setPassword}
        error={fieldErrors.password}
        secure
        icon={<LockIcon />}
      />

      {error ? (
        <View
          style={{
            padding: 12,
            borderRadius: 12,
            backgroundColor: authTokens.surfacePressed,
            borderWidth: 1,
            borderColor: "#E08B84",
          }}
        >
          <AppText variant="bodySm" style={{ color: "#E08B84" }}>
            {error}
          </AppText>
        </View>
      ) : null}

      {/* Spacing here is deliberately uneven, not a uniform stack: the two
          fields sit tight as one group, then each boundary (options row ->
          CTA) opens up a step. Even gaps everywhere give the eye no grouping
          to latch onto. */}
      <View style={{ marginTop: 2, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        {/* UI-only for now, same P2a-style pattern used elsewhere in this
            plan (control is visible/wired to local state; no persistence
            behind it yet -- a later task can add real "stay signed in"
            behavior without redesigning this row). */}
        <RememberMeCheckbox checked={rememberMe} onToggle={() => setRememberMe((v) => !v)} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Forgot password"
          onPress={onForgotPassword}
          style={{ minHeight: 44, justifyContent: "center" }}
        >
          <AppText variant="bodySm" style={{ color: authTokens.link }}>
            Forgot Password?
          </AppText>
        </Pressable>
      </View>

      {forgotNotice ? (
        <AppText variant="bodySm" style={{ color: authTokens.muted, textAlign: "center" }}>
          Password reset is coming soon.
        </AppText>
      ) : null}

      <View style={{ marginTop: 10 }}>
        <AuthButton label="Log In" onPress={onSubmit} loading={isPending} />
      </View>

      {/* One footer, not three. This screen previously stacked three centered
          link rows (sign up / legal / "Not you? Back to home"); the last was
          also redundant -- the splash's own CTA is what lands you here, and the
          stack back gesture already covers returning. Sign up is the only real
          alternative action, so it gets the weight; the legal line is fine
          print pinned underneath it. */}
      <View style={{ marginTop: 14, gap: 10, alignItems: "center" }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Sign up"
          // Now the role picker, not the organization form directly: which
          // account type you're creating is the first real decision, and
          // dropping a business owner or an agent straight into an
          // organization form is how you get bad signups.
          onPress={() => router.push(asHref("/signup"))}
          style={{ minHeight: 44, justifyContent: "center", alignItems: "center" }}
        >
          <AppText variant="body" style={{ color: authTokens.muted }}>
            Don&apos;t have an account?{" "}
            <AppText variant="body" style={{ color: authTokens.link, fontFamily: FONT.semibold }}>
              Sign up
            </AppText>
          </AppText>
        </Pressable>

        {/* Opened in the browser rather than pushed as a route. These
            pointed at /legal/privacy and /legal/terms, which were never
            built -- tapping either did nothing, on the one screen where a
            promise is being made. The documents live in the web app, and
            linking to them means the version a lawyer edits is the version
            the phone shows. Apple follows the privacy link during review,
            so it has to reach the public internet either way. */}
        <LegalCopy
          prefix="By continuing you accept our"
          onPrivacy={() => void Linking.openURL(LEGAL_URLS.privacy)}
          onTerms={() => void Linking.openURL(LEGAL_URLS.terms)}
        />
      </View>
    </AuthScreen>
  );
}
