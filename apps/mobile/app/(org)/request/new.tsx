import { useMemo, useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import {
  DEVICE_CATEGORIES,
  MIN_PICKUP_UNITS,
  SIZE_TIERS,
  type DeviceCategory,
  type SizeTier,
} from "@rebin/shared";
import {
  AppText,
  Card,
  ChipMultiSelect,
  FormField,
  PillButton,
  RadioTile,
  Screen,
  SelectField,
  Stepper,
  tokens,
} from "@rebin/ui";
import { DEVICE_CATEGORY_OPTIONS, TIME_WINDOW_OPTIONS } from "../../../src/config/us-states";

// UI-only for now: this screen walks the S23-S26 steps and ends on a mock
// S28 confirmation. It does not call the API. pickup_requests + its RLS
// insert policy already exist (migration 0005/0008) and packages/shared
// already has pickupRequestSchema, so wiring a real submit is a follow-up
// task, not new schema work -- tracked here rather than in a separate doc
// so it stays next to the screen it belongs to:
//   - call pickupRequestSchema.safeParse before submit, show field errors
//     the same way signup/register.tsx does
//   - add createPickupRequest(orgId, input) to packages/api/src/org.ts
//     (insert into pickup_requests; RLS policy req_insert already allows it)
//   - windowStart/windowEnd need to become real ISO timestamps built from
//     the picked date + TIME_WINDOW_OPTIONS slot, in the org's facility_timezone
//   - dock address is hand-typed below; prefill from getOrganizationDetail
//     once that read is threaded into this screen
//   - S25 (AI camera inventory scan) is out of scope -- separate phase (P3)
//   - S29 (request detail w/ timeline) doesn't exist yet, so "View request"
//     from the confirmation step has nowhere to go; only "Back to dashboard"
//     is wired
const STEP_LABELS = ["Quantity", "Categories", "Schedule", "Review"] as const;
const TOTAL_STEPS = STEP_LABELS.length;
const DEFAULT_TIER = SIZE_TIERS[0]!;

type Step = 1 | 2 | 3 | 4;

export default function NewPickupRequest() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [submitted, setSubmitted] = useState(false);

  const [sizeTier, setSizeTier] = useState<SizeTier>("tier_10_30");
  const [unitCount, setUnitCount] = useState(String(DEFAULT_TIER.defaultCount));
  const [categories, setCategories] = useState<DeviceCategory[]>([]);
  const [timeWindow, setTimeWindow] = useState<string | null>(null);
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [dockAddress, setDockAddress] = useState("");
  const [instructions, setInstructions] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const selectedTier = useMemo(
    () => SIZE_TIERS.find((t) => t.value === sizeTier) ?? DEFAULT_TIER,
    [sizeTier],
  );

  function onTierSelect(tier: (typeof SIZE_TIERS)[number]) {
    setSizeTier(tier.value);
    setUnitCount(String(tier.defaultCount));
  }

  // Manually typing a count outside the selected tile's range re-selects the
  // tile it actually falls in, so the two controls can't disagree.
  function onUnitCountChange(raw: string) {
    const digits = raw.replace(/\D/g, "");
    setUnitCount(digits);
    const n = Number(digits);
    if (!digits || Number.isNaN(n)) return;
    const match = SIZE_TIERS.find((t) => n >= t.min && (t.max === null || n <= t.max));
    if (match) setSizeTier(match.value);
  }

  function validateStep1(): boolean {
    const n = Number(unitCount);
    if (!unitCount || Number.isNaN(n) || n < MIN_PICKUP_UNITS) {
      setErrors({ unitCount: `Minimum ${MIN_PICKUP_UNITS} devices required for pickup` });
      return false;
    }
    setErrors({});
    return true;
  }

  function validateStep2(): boolean {
    if (categories.length === 0) {
      setErrors({ categories: "Select at least one category" });
      return false;
    }
    setErrors({});
    return true;
  }

  function validateStep3(): boolean {
    const next: Record<string, string> = {};
    if (!timeWindow) next.timeWindow = "Pick a time window";
    if (contactName.trim().length < 2) next.contactName = "On-site contact is required";
    if (contactPhone.replace(/\D/g, "").length !== 10) next.contactPhone = "Enter a 10-digit phone number";
    if (dockAddress.trim().length < 3) next.dockAddress = "Dock address is required";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function next() {
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    if (step === 3 && !validateStep3()) return;
    setStep((s) => (Math.min(s + 1, TOTAL_STEPS) as Step));
  }

  function back() {
    if (step === 1) {
      router.back();
      return;
    }
    setErrors({});
    setStep((s) => (Math.max(s - 1, 1) as Step));
  }

  function submit() {
    // No API call -- see the note at the top of this file.
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <Screen footer={<PillButton label="Back to dashboard" onPress={() => router.replace("/(org)/dashboard")} />}>
        <View style={{ gap: tokens.space[2], alignItems: "center", paddingTop: tokens.space[6] }}>
          <AppText variant="display">Request submitted</AppText>
          <AppText variant="body" tone="secondary" style={{ textAlign: "center" }}>
            {`${unitCount} devices · ${TIME_WINDOW_OPTIONS.find((w) => w.value === timeWindow)?.label ?? ""}`}
          </AppText>
        </View>
        <Card accentBorder style={{ gap: tokens.space[2] }}>
          <AppText variant="h3">What happens next</AppText>
          <AppText variant="bodySm" tone="secondary">1. Our team reviews your request</AppText>
          <AppText variant="bodySm" tone="secondary">2. We confirm a pickup date and dispatch an agent</AppText>
          <AppText variant="bodySm" tone="secondary">3. You get a certificate of recycling once it's complete</AppText>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen
      footer={
        <View style={{ gap: tokens.space[2] }}>
          <PillButton
            label={step === TOTAL_STEPS ? "Submit request" : "Continue"}
            onPress={step === TOTAL_STEPS ? submit : next}
          />
          <PillButton label="Back" variant="ghost" onPress={back} />
        </View>
      }
    >
      <Stepper current={step} total={TOTAL_STEPS} labels={STEP_LABELS} />

      {step === 1 ? (
        <View style={{ gap: tokens.space[3] }}>
          <AppText variant="display">How many devices?</AppText>
          <View style={{ gap: tokens.space[2] }}>
            {SIZE_TIERS.map((tier) => (
              <RadioTile
                key={tier.value}
                label={tier.label}
                subtitle={tier.subtitle}
                selected={tier.value === sizeTier}
                onPress={() => onTierSelect(tier)}
              />
            ))}
          </View>
          <FormField
            label="Exact unit count"
            value={unitCount}
            onChangeText={onUnitCountChange}
            keyboardType="number-pad"
            error={errors.unitCount}
            helper={!errors.unitCount ? `Minimum ${MIN_PICKUP_UNITS}, default ${selectedTier.defaultCount}` : undefined}
          />
        </View>
      ) : null}

      {step === 2 ? (
        <View style={{ gap: tokens.space[3] }}>
          <AppText variant="display">What are you clearing out?</AppText>
          <AppText variant="body" tone="secondary">Select all that apply.</AppText>
          <ChipMultiSelect
            options={DEVICE_CATEGORY_OPTIONS}
            selected={categories}
            onChange={(next) => setCategories(next as DeviceCategory[])}
          />
          {errors.categories ? (
            <AppText variant="bodySm" style={{ color: tokens.color.danger }}>{errors.categories}</AppText>
          ) : null}
        </View>
      ) : null}

      {step === 3 ? (
        <View style={{ gap: tokens.space[3] }}>
          <AppText variant="display">Schedule & contact</AppText>
          <SelectField
            label="Time window"
            value={timeWindow}
            options={TIME_WINDOW_OPTIONS}
            onSelect={setTimeWindow}
            error={errors.timeWindow}
          />
          <FormField
            label="On-site point of contact"
            value={contactName}
            onChangeText={setContactName}
            error={errors.contactName}
          />
          <FormField
            label="Contact phone"
            value={contactPhone}
            onChangeText={(v) => setContactPhone(v.replace(/\D/g, "").slice(0, 10))}
            mask="phone"
            keyboardType="phone-pad"
            error={errors.contactPhone}
          />
          <FormField
            label="Facility dock address"
            value={dockAddress}
            onChangeText={setDockAddress}
            error={errors.dockAddress}
          />
          <FormField
            label="Dock access & special instructions (optional)"
            value={instructions}
            onChangeText={setInstructions}
            multiline
          />
        </View>
      ) : null}

      {step === 4 ? (
        <View style={{ gap: tokens.space[3] }}>
          <AppText variant="display">Review</AppText>
          <Card style={{ gap: tokens.space[1] }}>
            <AppText variant="label" tone="muted">QUANTITY</AppText>
            <AppText variant="h3">{`${unitCount} devices · ${selectedTier.label}`}</AppText>
          </Card>
          <Card style={{ gap: tokens.space[1] }}>
            <AppText variant="label" tone="muted">CATEGORIES</AppText>
            <AppText variant="body">
              {categories.map((c) => DEVICE_CATEGORY_OPTIONS.find((o) => o.value === c)?.label).join(", ")}
            </AppText>
          </Card>
          <Card style={{ gap: tokens.space[1] }}>
            <AppText variant="label" tone="muted">SCHEDULE & CONTACT</AppText>
            <AppText variant="body">{TIME_WINDOW_OPTIONS.find((w) => w.value === timeWindow)?.label}</AppText>
            <AppText variant="bodySm" tone="secondary">{contactName}</AppText>
            <AppText variant="bodySm" tone="secondary">{dockAddress}</AppText>
          </Card>
          <Card variant="alt">
            <AppText variant="bodySm" tone="accent">This pickup is free of charge.</AppText>
          </Card>
        </View>
      ) : null}
    </Screen>
  );
}
