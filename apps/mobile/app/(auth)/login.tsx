import { useState } from "react";
import { Pressable, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { loginSchema } from "@rebin/shared";
import { AppText, AuthButton, AuthDivider, AuthInput, AuthScreen, LegalCopy, SocialButton, authTokens } from "@rebin/ui";
import { useLogin } from "../../src/hooks/useLogin";

// See RoleGuard.tsx's and the root _layout.tsx's own `asHref` for the
// identical reasoning. Two call sites in this file need it: the "Not you?"
// link back to "/" (a real, existing route, so this is just satisfying the
// broader union type) and "Forgot password" -> "/forgot-password", a screen
// this task doesn't build (out of scope, same as the brief's own literal
// reference to it) so Expo Router's codegen'd route typing doesn't know it
// yet. Both are known, hand-authored route names, never unvalidated user
// input, so this cast can't hide a typo class of bug.
function asHref(path: string): Href {
  return path as Href;
}

// Small, local decorative icons for this screen only (a leading mail/lock
// glyph per field, and the two icons in the trust-badge card below). Kept
// local rather than added to packages/ui since they're specific to this
// screen's layout, not general-purpose primitives other screens need yet.
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

function ShieldCheckIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 22 22" fill="none">
      <Path d="M11 2.5 L18.5 5.5 V10.5 C18.5 15 15.5 18 11 19.5 C6.5 18 3.5 15 3.5 10.5 V5.5 Z" fill="#FFFFFF" />
      <Path d="M7.5 11 L10 13.5 L14.5 8.5" stroke={authTokens.primary} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function GlobeLeafIcon() {
  return (
    <Svg width={30} height={30} viewBox="0 0 30 30" fill="none">
      <Circle cx="14" cy="16" r="10" fill={authTokens.primary} opacity={0.25} />
      <Circle cx="14" cy="16" r="10" stroke={authTokens.primary} strokeWidth="1.4" />
      <Path d="M6 16 h16M14 6 c4 4 4 16 0 20" stroke={authTokens.primary} strokeWidth="1" opacity={0.6} />
      <Path
        d="M20 6 c4 -2 8 -1 9 3 c-4 1 -7 3 -9 6 c-3 -3 -3 -7 0 -9z"
        fill={authTokens.link}
      />
    </Svg>
  );
}

export default function Login() {
  const router = useRouter();
  const { submit, isPending, error } = useLogin();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [socialNotice, setSocialNotice] = useState<string | null>(null);

  // Real Google/Apple sign-in needs native SDK setup (OAuth client IDs,
  // Apple Sign In entitlements, a token-exchange endpoint) that Task 16
  // builds -- not yet wired. Rather than a silent no-op (which would look
  // broken/unresponsive to a real tester tapping the button) or a fake
  // success, tapping either button surfaces an honest, visible status.
  function onSocialPress(provider: "google" | "apple") {
    setSocialNotice(
      provider === "google"
        ? "Sign in with Google is coming soon."
        : "Sign in with Apple is coming soon.",
    );
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
    <AuthScreen
      title="Welcome back!"
      subtitle="Log in to continue your eco-journey"
      footer={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to home"
          onPress={() => router.replace(asHref("/"))}
          style={{ minHeight: 44, justifyContent: "center", alignItems: "center" }}
        >
          <AppText variant="bodySm" style={{ color: authTokens.muted }}>
            Not you?{" "}
            <AppText variant="bodySm" style={{ color: authTokens.link }}>
              Back to home
            </AppText>
          </AppText>
        </Pressable>
      }
    >
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

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Forgot password"
        onPress={() => router.push(asHref("/forgot-password"))}
        style={{ minHeight: 44, justifyContent: "center", alignItems: "flex-end" }}
      >
        <AppText variant="bodySm" style={{ color: authTokens.link }}>
          Forgot your password?
        </AppText>
      </Pressable>

      <AuthDivider label="Or continue with" />

      <View style={{ gap: 12 }}>
        <SocialButton provider="google" onPress={() => onSocialPress("google")} />
        <SocialButton provider="apple" onPress={() => onSocialPress("apple")} />
      </View>

      {socialNotice ? (
        <AppText variant="bodySm" style={{ color: authTokens.muted, textAlign: "center" }}>
          {socialNotice}
        </AppText>
      ) : null}

      <AuthButton label="Log In" onPress={onSubmit} loading={isPending} />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Sign up"
        onPress={() => router.push(asHref("/signup/organization"))}
        style={{ minHeight: 44, justifyContent: "center", alignItems: "center" }}
      >
        <AppText variant="bodySm" style={{ color: authTokens.muted }}>
          Don&apos;t have an account?{" "}
          <AppText variant="bodySm" style={{ color: authTokens.link }}>
            Sign up
          </AppText>
        </AppText>
      </Pressable>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          padding: 14,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: authTokens.border,
        }}
      >
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            backgroundColor: authTokens.primary,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ShieldCheckIcon />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="bodySm" style={{ color: authTokens.text, fontWeight: "700" }}>
            Your data is safe with us.
          </AppText>
          <AppText variant="label" style={{ color: authTokens.muted, fontSize: 10, textTransform: "none", letterSpacing: 0 }}>
            We protect your information and contribute to a cleaner planet.
          </AppText>
        </View>
        <GlobeLeafIcon />
      </View>

      <LegalCopy
        prefix="By continuing you accept our"
        onPrivacy={() => router.push(asHref("/legal/privacy"))}
        onTerms={() => router.push(asHref("/legal/terms"))}
      />
    </AuthScreen>
  );
}
