import { useState } from "react";
import { Pressable, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { orgSignupSchema, type OrgSignupInput } from "@rebin/shared";
import { signUpOrganization } from "@rebin/api";
import { AppText, AuthButton, AuthScreen, authTokens } from "@rebin/ui";
import { Step1Org } from "../../../src/features/org-signup/Step1Org";
import { Step2Contact } from "../../../src/features/org-signup/Step2Contact";
import { Step3Facility } from "../../../src/features/org-signup/Step3Facility";
import { SuccessStep } from "../../../src/features/org-signup/SuccessStep";
import { DarkStepper } from "../../../src/features/org-signup/DarkStepper";

// See login.tsx's and RoleGuard.tsx's own `asHref` for the identical
// reasoning: "/pending" is a known, hand-authored route name this task
// doesn't build (out of scope, same as the brief's own literal reference to
// it), so Expo Router's codegen'd route typing doesn't know it yet. Never
// unvalidated user input, so this cast can't hide a typo class of bug.
function asHref(path: string): Href {
  return path as Href;
}

const STEP_LABELS = ["Organization", "Contact", "Facility"] as const;
const STEP_FIELDS: Record<number, (keyof OrgSignupInput)[]> = {
  1: ["orgName", "orgType"],
  2: ["contactName", "contactTitle", "workEmail", "phone"],
  3: ["street", "city", "state", "zip", "password", "confirmPassword"],
};

export default function OrgSignup() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  // NOTE: deviation from the brief's literal initial state (`{ dockAccess:
  // false }` only). Verified directly against this repo's installed Zod
  // (3.25.76): `z.string().min(2, "custom message")`'s custom message is
  // only used for a `too_small` issue — a field that is genuinely `undefined`
  // (never typed into) fails with Zod's own default `invalid_type` message,
  // "Required", not the schema's custom message. That made the "blocks
  // advancing past step 1 with an empty organization name" test fail: it
  // expects the exact copy "Organization name is required", but a pristine,
  // never-touched `orgName` produced "Required" instead. Seeding every
  // text-input-driven field as "" (matching what `set()` already stores the
  // instant a user types anything, and what AuthInput's own `value ?? ""`
  // display already assumes) makes the empty-vs-untouched states identical,
  // so `.min()`'s custom message always fires. `orgType`/`state` are left
  // unset — they're modal-picker fields with no custom validation message
  // tied to "too_small", so undefined vs "" doesn't change their (untested)
  // error text. No validation/step-navigation logic changed, only the
  // initial values object.
  const [values, setValues] = useState<Partial<OrgSignupInput>>({
    orgName: "",
    contactName: "",
    contactTitle: "",
    workEmail: "",
    phone: "",
    street: "",
    city: "",
    zip: "",
    password: "",
    confirmPassword: "",
    dockAccess: false,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof OrgSignupInput, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  function set<K extends keyof OrgSignupInput>(key: K, value: OrgSignupInput[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function validateStep(n: number): boolean {
    const result = orgSignupSchema.safeParse(values);
    if (result.success) return true;
    const stepKeys = STEP_FIELDS[n] ?? [];
    const next: Partial<Record<keyof OrgSignupInput, string>> = {};
    for (const issue of result.error.issues) {
      const key = issue.path[0] as keyof OrgSignupInput | undefined;
      if (key && stepKeys.includes(key)) next[key] = issue.message;
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function onNext() {
    if (!validateStep(step)) return;
    if (step < 3) {
      setStep(step + 1);
      return;
    }

    const parsed = orgSignupSchema.safeParse(values);
    if (!parsed.success) {
      validateStep(3);
      return;
    }

    setSubmitting(true);
    setServerError(null);
    try {
      await signUpOrganization(parsed.data);
      setStep(4);
    } catch (e) {
      setServerError(e instanceof Error ? e.message : "Registration failed. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (step === 4) {
    return <SuccessStep onContinue={() => router.replace(asHref("/pending"))} />;
  }

  return (
    <AuthScreen
      title="Register your organization"
      subtitle="A few details, then you're queued for verification."
      footer={
        <View style={{ gap: 12 }}>
          <AuthButton
            label={step === 3 ? "Complete Registration" : "Continue"}
            onPress={() => void onNext()}
            loading={submitting}
          />
          {step > 1 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back"
              onPress={() => setStep(step - 1)}
              style={{ minHeight: 44, alignItems: "center", justifyContent: "center" }}
            >
              <AppText variant="h3" style={{ color: authTokens.text }}>Back</AppText>
            </Pressable>
          ) : null}
        </View>
      }
    >
      <DarkStepper current={step} total={3} labels={STEP_LABELS} />
      {step === 1 ? <Step1Org values={values} errors={errors} set={set} /> : null}
      {step === 2 ? <Step2Contact values={values} errors={errors} set={set} /> : null}
      {step === 3 ? <Step3Facility values={values} errors={errors} set={set} /> : null}
      {serverError ? (
        <AppText variant="bodySm" style={{ color: "#E08B84" }}>{serverError}</AppText>
      ) : null}
    </AuthScreen>
  );
}
