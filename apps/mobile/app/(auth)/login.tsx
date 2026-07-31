import { useState } from "react";
import { Pressable, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { loginSchema } from "@rebin/shared";
import { AppText, AuthButton, AuthInput, AuthScreen, LegalCopy, authTokens } from "@rebin/ui";
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

export default function Login() {
  const router = useRouter();
  const { submit, isPending, error } = useLogin();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

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
      title="Welcome back"
      subtitle="Log in to Rebin Tech."
      footer={
        <View style={{ gap: 12 }}>
          <AuthButton label="Log In" onPress={onSubmit} loading={isPending} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Register"
            onPress={() => router.push(asHref("/signup/organization"))}
            style={{ minHeight: 44, justifyContent: "center", alignItems: "center" }}
          >
            <AppText variant="bodySm" style={{ color: authTokens.muted }}>
              Don&apos;t have an account?{" "}
              <AppText variant="bodySm" style={{ color: authTokens.link }}>
                Register
              </AppText>
            </AppText>
          </Pressable>
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
        </View>
      }
    >
      <AuthInput
        label="Email"
        placeholder="you@company.com"
        value={email}
        onChangeText={setEmail}
        error={fieldErrors.email}
        keyboardType="email-address"
      />
      <AuthInput
        label="Password"
        placeholder="Enter your password"
        value={password}
        onChangeText={setPassword}
        error={fieldErrors.password}
        secure
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

      <LegalCopy
        prefix="By continuing you accept our"
        onPrivacy={() => router.push(asHref("/legal/privacy"))}
        onTerms={() => router.push(asHref("/legal/terms"))}
      />
    </AuthScreen>
  );
}
