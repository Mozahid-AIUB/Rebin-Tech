import { useState } from "react";
import { View } from "react-native";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import {
  SIGNUP_ROLES,
  signupFormSchema,
  toAgentSignupInput,
  toBusinessSignupInput,
  toOrgSignupInput,
  type SignupFormInput,
  type SignupRole,
} from "@rebin/shared";
import { signIn, signUpAgent, signUpBusiness, signUpOrganization } from "@rebin/api";
import { AppText, AuthButton, AuthInput, AuthScreen, authTokens } from "@rebin/ui";
import {
  AGENT_VEHICLE_OPTIONS,
  BUSINESS_TYPE_OPTIONS,
  ORG_TYPE_OPTIONS,
  SIGNUP_ROLE_OPTIONS,
  US_STATES,
} from "../../../src/config/us-states";
import { DarkSelectField } from "../../../src/features/signup/DarkSelectField";
import { DarkToggleRow } from "../../../src/features/signup/DarkToggleRow";
import { SuccessStep } from "../../../src/features/signup/SuccessStep";
import { applyMask, displayMask } from "../../../src/features/signup/mask";

// See login.tsx's own `asHref` for the identical reasoning: a known,
// hand-authored route name, never unvalidated user input.
function asHref(path: string): Href {
  return path as Href;
}

// The role picker passes ?role=…; anything else (a hand-typed URL, a stale
// deep link) falls back to the most common path rather than rendering a form
// with no role selected.
function parseRole(raw: string | string[] | undefined): SignupRole {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return SIGNUP_ROLES.includes(value as SignupRole) ? (value as SignupRole) : "organization";
}

// Field labels that change with the role. Everything else on this form is
// worded identically for all three, so only the genuinely role-specific
// wording lives here.
const ENTITY_LABEL: Record<Exclude<SignupRole, "agent">, { label: string; placeholder: string }> = {
  organization: { label: "Organization name", placeholder: "e.g. Riverside Medical Center" },
  business: { label: "Business name", placeholder: "e.g. Eastside Electronics Repair" },
};

const ADDRESS_HEADING: Record<SignupRole, { title: string; hint: string }> = {
  organization: { title: "Pickup address", hint: "Where our agent should arrive." },
  business: { title: "Business address", hint: "Where your stock is picked up." },
  // Not a home address on purpose -- what routing needs is the area an agent
  // can cover, and asking a driver for their home address at signup is both
  // more intrusive and less useful.
  agent: { title: "Service area", hint: "Where you can take pickups." },
};

type Values = Partial<Record<keyof SignupFormInput | "entityName" | "orgType" | "businessType" | "ein" | "street" | "vehicle" | "hasDriversLicense", unknown>>;

export default function SignupRegister() {
  const router = useRouter();
  const params = useLocalSearchParams<{ role?: string }>();

  // Seeded from the card the user tapped, then owned by this screen -- the
  // dropdown below can change it without navigating, which is the whole point
  // of collapsing three flows into one form.
  const [role, setRole] = useState<SignupRole>(() => parseRole(params.role));
  // Every text field starts as "" rather than undefined: Zod reports a
  // never-touched field as "Required" (an invalid_type issue) instead of the
  // schema's own custom message, so an empty-but-touched field and a pristine
  // one would show different copy for the same mistake.
  const [values, setValues] = useState<Values>({
    contactName: "", email: "", phone: "", city: "", zip: "",
    password: "", confirmPassword: "",
    entityName: "", street: "", ein: "",
    hasDriversLicense: false,
  });
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [continuing, setContinuing] = useState(false);

  function set(key: string, value: unknown) {
    setValues((prev) => ({ ...prev, [key]: value }));
    // Clear this field's error the moment it's touched -- a stale error under
    // a field the user is actively fixing reads as "still wrong".
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function onRoleChange(next: SignupRole) {
    setRole(next);
    // Errors belong to the previous role's field set; carrying them across
    // would leave complaints pinned to fields that no longer render.
    setErrors({});
    setServerError(null);
  }

  async function onSubmit() {
    const parsed = signupFormSchema.safeParse({ ...values, role });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === "string" && !next[key]) next[key] = issue.message;
      }
      setErrors(next);
      return;
    }

    setSubmitting(true);
    setServerError(null);
    try {
      // Each role still has its own endpoint (and its own Edge Function + RPC
      // transaction); the shared form maps outward at this one seam.
      const input = parsed.data;
      if (input.role === "organization") await signUpOrganization(toOrgSignupInput(input));
      else if (input.role === "business") await signUpBusiness(toBusinessSignupInput(input));
      else await signUpAgent(toAgentSignupInput(input));
      setDone(true);
    } catch (e) {
      setServerError(e instanceof Error ? e.message : "Registration failed. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // Signing in here rather than sending the user to /login: the account is
  // usable the moment it exists (migration 0017), and asking someone to retype
  // the password they chose thirty seconds ago is friction with nothing behind
  // it. The root layout watches the session and routes to the right portal on
  // its own, so there is no navigation to do afterwards.
  async function onContinue() {
    setContinuing(true);
    setServerError(null);
    try {
      await signIn(String(values.email ?? ""), String(values.password ?? ""));
    } catch {
      // The account is registered either way -- falling back to the login
      // screen is a working path, not an error worth alarming them with.
      router.replace(asHref("/login"));
    } finally {
      setContinuing(false);
    }
  }

  if (done) {
    return <SuccessStep role={role} onContinue={() => void onContinue()} continuing={continuing} />;
  }

  const str = (k: string) => (values[k as keyof Values] as string | undefined) ?? "";

  return (
    <AuthScreen
      title="Create your account"
      // No subtitle: the dropdown immediately below already says "I'm signing
      // up as" and shows the selected role, so a sentence explaining that you
      // can pick your account type was narrating the control under it.
      onBack={() => router.back()}
      backLabel="Back to role selection"
      footer={<AuthButton label="Create account" onPress={() => void onSubmit()} loading={submitting} />}
    >
      <DarkSelectField
        label="I'm signing up as"
        value={role}
        options={SIGNUP_ROLE_OPTIONS}
        onSelect={(v) => onRoleChange(v as SignupRole)}
      />

      <FormSection title="About you" />
      <AuthInput
        label="Full name"
        placeholder="Your full name"
        value={str("contactName")}
        onChangeText={(v) => set("contactName", v)}
        error={errors.contactName}
        autoCapitalize="words"
      />
      <AuthInput
        label="Email"
        placeholder="you@example.com"
        value={str("email")}
        onChangeText={(v) => set("email", v)}
        error={errors.email}
        keyboardType="email-address"
      />
      <AuthInput
        label="Phone"
        placeholder="(555) 019-2345"
        value={displayMask(str("phone"), "phone")}
        onChangeText={(raw) => set("phone", applyMask(raw, "phone"))}
        error={errors.phone}
        keyboardType="number-pad"
      />

      {role !== "agent" ? (
        <>
          <FormSection title={role === "organization" ? "Your organization" : "Your business"} />
          <AuthInput
            label={ENTITY_LABEL[role].label}
            placeholder={ENTITY_LABEL[role].placeholder}
            value={str("entityName")}
            onChangeText={(v) => set("entityName", v)}
            error={errors.entityName}
            autoCapitalize="words"
          />
        </>
      ) : null}

      {role === "organization" ? (
        <DarkSelectField
          label="Organization type"
          value={str("orgType") || null}
          options={ORG_TYPE_OPTIONS}
          onSelect={(v) => set("orgType", v)}
          error={errors.orgType}
        />
      ) : null}

      {role === "business" ? (
        <>
          <DarkSelectField
            label="Business type"
            value={str("businessType") || null}
            options={BUSINESS_TYPE_OPTIONS}
            onSelect={(v) => set("businessType", v)}
            error={errors.businessType}
          />
          <AuthInput
            label="EIN (optional)"
            placeholder="9 digits"
            value={str("ein")}
            onChangeText={(raw) => set("ein", raw.replace(/\D/g, "").slice(0, 9))}
            error={errors.ein}
            keyboardType="number-pad"
          />
        </>
      ) : null}

      {role === "agent" ? (
        <>
          <FormSection title="How you work" />
          <DarkSelectField
            label="Vehicle"
            value={str("vehicle") || null}
            options={AGENT_VEHICLE_OPTIONS}
            onSelect={(v) => set("vehicle", v)}
            error={errors.vehicle}
          />
          <DarkToggleRow
            label="Valid driver's license?"
            description="Self-reported now, verified during onboarding"
            value={Boolean(values.hasDriversLicense)}
            onValueChange={(v) => set("hasDriversLicense", v)}
          />
        </>
      ) : null}

      <FormSection title={ADDRESS_HEADING[role].title} hint={ADDRESS_HEADING[role].hint} />
      {role !== "agent" ? (
        <AuthInput
          label="Street address"
          placeholder="Street address"
          value={str("street")}
          onChangeText={(v) => set("street", v)}
          error={errors.street}
        />
      ) : null}
      <AuthInput
        label="City"
        placeholder="City"
        value={str("city")}
        onChangeText={(v) => set("city", v)}
        error={errors.city}
        autoCapitalize="words"
      />
      <DarkSelectField
        label="State"
        value={str("state") || null}
        options={US_STATES}
        onSelect={(v) => set("state", v)}
        error={errors.state}
      />
      <AuthInput
        label="ZIP code"
        placeholder="12345"
        value={str("zip")}
        onChangeText={(raw) => set("zip", applyMask(raw, "zip"))}
        error={errors.zip}
        keyboardType="number-pad"
      />

      <FormSection title="Password" />
      <View style={{ gap: 6 }}>
        <AuthInput
          label="Create password"
          // The rules live in the helper line below, not here: a placeholder
          // disappears the moment the user starts typing, which is exactly
          // when they need the requirements. Stating them in both places was
          // the same sentence twice.
          placeholder="Enter a password"
          value={str("password")}
          onChangeText={(v) => set("password", v)}
          error={errors.password}
          secure
        />
        {!errors.password ? (
          <AppText variant="bodySm" style={{ color: authTokens.muted }}>
            At least 10 characters, with a number and a symbol
          </AppText>
        ) : null}
      </View>
      <AuthInput
        label="Confirm password"
        placeholder="Re-enter your password"
        value={str("confirmPassword")}
        onChangeText={(v) => set("confirmPassword", v)}
        error={errors.confirmPassword}
        secure
      />

      {serverError ? (
        <AppText variant="bodySm" style={{ color: "#E08B84" }}>{serverError}</AppText>
      ) : null}
    </AuthScreen>
  );
}

// A long single-page form needs internal landmarks or it reads as one
// undifferentiated column of inputs -- this is what the removed step wizard
// used to provide, minus the forced navigation.
function FormSection({ title, hint }: { title: string; hint?: string }) {
  return (
    <View style={{ marginTop: 10, gap: 2 }}>
      <AppText variant="label" style={{ color: authTokens.link }}>{title}</AppText>
      {hint ? (
        <AppText variant="bodySm" style={{ color: authTokens.muted }}>{hint}</AppText>
      ) : null}
    </View>
  );
}
