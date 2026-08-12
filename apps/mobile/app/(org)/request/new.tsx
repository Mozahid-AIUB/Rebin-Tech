import { useMemo, useRef, useState } from "react";
import { View, type TextInput } from "react-native";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { addPickupRequestItems, createPickupRequest, useSessionStore } from "@rebin/api";
import {
  MIN_PICKUP_UNITS,
  SIZE_TIERS,
  buildPickupWindow,
  nextPickupDates,
  pickupRequestSchema,
  type DeviceCategory,
  type ScanItem,
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
import { InventoryScanSheet } from "../../../src/features/scan/InventoryScanSheet";

// S23-S27 of the plan. Two pieces are deliberately still missing:
//   - S25 (AI camera inventory scan) belongs to phase P3 and has no backend.
//   - S29 (request detail with timeline) doesn't exist, so the confirmation
//     step offers only "Back to dashboard", not "View request".
//
// organizations.facility_timezone isn't in this screen's reads yet, so the
// window is resolved in a fixed US Eastern zone -- same stand-in the org
// dashboard uses, and the same thing to replace when that column is read.
const ORG_TZ = "America/New_York";
const STEP_LABELS = ["Quantity", "Categories", "Schedule", "Review"] as const;
const TOTAL_STEPS = STEP_LABELS.length;
const DEFAULT_TIER = SIZE_TIERS[0]!;

/** Two weeks of bookable weekdays -- enough to choose from without a calendar. */
function dateOptions(): { value: string; label: string }[] {
  const today = new Date().toISOString().slice(0, 10);
  return nextPickupDates(today, 10).map((value) => ({
    value,
    label: new Intl.DateTimeFormat("en-US", {
      timeZone: "UTC",
      weekday: "short",
      month: "short",
      day: "numeric",
    }).format(new Date(`${value}T12:00:00Z`)),
  }));
}

type Step = 1 | 2 | 3 | 4;

export default function NewPickupRequest() {
  const router = useRouter();
  const { assignments, activeIndex } = useSessionStore();
  const active = assignments[activeIndex];
  const orgId = active?.scopeType === "organization" ? active.scopeId : null;

  const [step, setStep] = useState<Step>(1);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [sizeTier, setSizeTier] = useState<SizeTier>("tier_10_30");
  const [unitCount, setUnitCount] = useState(String(DEFAULT_TIER.defaultCount));
  const [categories, setCategories] = useState<DeviceCategory[]>([]);
  const [scanning, setScanning] = useState(false);
  // Scanned devices, kept beside the form until the request exists to hang
  // them off -- pickup_request_items needs a request_id, which only exists
  // after the insert.
  const [manifest, setManifest] = useState<ScanItem[]>([]);
  const [pickupDate, setPickupDate] = useState<string | null>(null);
  const [timeWindow, setTimeWindow] = useState<string | null>(null);
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [dockAddress, setDockAddress] = useState("");
  const [instructions, setInstructions] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // The return key walks the contact fields in order rather than dismissing
  // the keyboard between each one.
  const phoneRef = useRef<TextInput>(null);
  const dockRef = useRef<TextInput>(null);

  const selectedTier = useMemo(
    () => SIZE_TIERS.find((t) => t.value === sizeTier) ?? DEFAULT_TIER,
    [sizeTier],
  );
  // Computed once per mount: the list would otherwise shift under the user if
  // a render happened to cross midnight.
  const dates = useMemo(dateOptions, []);

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
    if (!pickupDate) next.pickupDate = "Pick a date";
    if (!timeWindow) next.timeWindow = "Pick a time window";
    if (contactName.trim().length < 2) next.contactName = "On-site contact is required";
    if (contactPhone.replace(/\D/g, "").length !== 10) next.contactPhone = "Enter a 10-digit phone number";
    if (dockAddress.trim().length < 3) next.dockAddress = "Dock address is required";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function next() {
    // A refused step buzzes. On a phone the error text may be above the fold,
    // and a button that appears to do nothing is worse than one that says no.
    const ok =
      step === 1 ? validateStep1() : step === 2 ? validateStep2() : step === 3 ? validateStep3() : true;
    if (!ok) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
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

  /**
   * Folds a finished scan back into the form: every category seen gets ticked,
   * and the count rises to at least what was scanned.
   *
   * Raised rather than replaced -- an org that scanned six of forty laptops
   * still has forty, and overwriting 40 with 6 would silently shrink their
   * booking.
   */
  function onScanDone(scanned: ScanItem[]) {
    setScanning(false);
    if (scanned.length === 0) return;

    setManifest((prev) => {
      const merged = [...prev, ...scanned];
      const seen = new Set(merged.map((item) => item.deviceCategory));
      setCategories((current) => Array.from(new Set([...current, ...seen])) as DeviceCategory[]);
      const current = Number(unitCount);
      if (Number.isNaN(current) || merged.length > current) {
        setUnitCount(String(merged.length));
        const tier = SIZE_TIERS.find(
          (t) => merged.length >= t.min && (t.max === null || merged.length <= t.max),
        );
        if (tier) setSizeTier(tier.value);
      }
      return merged;
    });
  }

  async function submit() {
    if (!orgId || !pickupDate || !timeWindow) {
      setSubmitError("No organization is active for this account.");
      return;
    }

    const parsed = pickupRequestSchema.safeParse({
      sizeTier,
      unitCount: Number(unitCount),
      categories,
      ...buildPickupWindow(pickupDate, timeWindow, ORG_TZ),
      onSiteContactName: contactName.trim(),
      onSiteContactPhone: contactPhone,
      dockAddress: dockAddress.trim(),
      instructions,
    });
    if (!parsed.success) {
      // The per-step checks above cover every field, so a failure here means
      // the two disagree -- worth surfacing rather than silently swallowing.
      setSubmitError(parsed.error.issues[0]?.message ?? "Check your answers and try again.");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      const { id } = await createPickupRequest(orgId, { ...parsed.data, timezone: ORG_TZ });

      // Written after the request exists, because the items reference its id.
      // A failure here must not lose the booking: the pickup is real either
      // way, and the manifest can be rebuilt on site by the agent.
      if (manifest.length > 0) {
        try {
          await addPickupRequestItems(
            id,
            manifest.map((item) => ({
              category: item.deviceCategory,
              make: item.make,
              model: item.model,
              serial: item.serial,
              confidence: Math.round(item.confidence),
              source: "scan" as const,
            })),
          );
        } catch {
          // Deliberately swallowed -- see above.
        }
      }
      setSubmitted(true);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Couldn't submit your request.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <Screen footer={<PillButton label="Back to dashboard" onPress={() => router.replace("/(org)/dashboard")} />}>
        <View style={{ gap: tokens.space[2], alignItems: "center", paddingTop: tokens.space[6] }}>
          <AppText variant="display">Request submitted</AppText>
          <AppText variant="body" tone="secondary" style={{ textAlign: "center" }}>
            {`${unitCount} devices · ${dates.find((d) => d.value === pickupDate)?.label ?? ""}, ${
              TIME_WINDOW_OPTIONS.find((w) => w.value === timeWindow)?.label ?? ""
            }`}
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
            loading={submitting}
            onPress={step === TOTAL_STEPS ? () => void submit() : next}
          />
          <PillButton label="Back" variant="ghost" onPress={back} />
        </View>
      }
    >
      <InventoryScanSheet
        visible={scanning}
        onClose={() => setScanning(false)}
        onDone={onScanDone}
      />

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

          {/* S25. Optional on purpose: an org that already knows it has forty
              laptops should not have to photograph forty laptops. What the
              scan adds is the asset tags, which is what turns a booking into
              a compliance record. */}
          <Card style={{ gap: tokens.space[2] }}>
            <AppText variant="label" tone="accent">OPTIONAL</AppText>
            <AppText variant="h3">Scan devices with the camera</AppText>
            <AppText variant="bodySm" tone="secondary">
              We&apos;ll read the make, model and asset tag, tick the right categories, and count
              them for you.
            </AppText>
            <PillButton
              label="Open camera"
              variant="secondary"
              onPress={() => setScanning(true)}
            />
            {manifest.length > 0 ? (
              <AppText variant="bodySm" tone="accent">
                {manifest.length === 1 ? "1 device scanned" : `${manifest.length} devices scanned`}
              </AppText>
            ) : null}
          </Card>
        </View>
      ) : null}

      {step === 3 ? (
        <View style={{ gap: tokens.space[3] }}>
          <AppText variant="display">Schedule & contact</AppText>
          <SelectField
            label="Preferred date"
            value={pickupDate}
            options={dates}
            onSelect={setPickupDate}
            error={errors.pickupDate}
          />
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
            autoComplete="name"
            textContentType="name"
            autoCapitalize="words"
            returnKeyType="next"
            onSubmitEditing={() => phoneRef.current?.focus()}
          />
          <FormField
            label="Contact phone"
            value={contactPhone}
            onChangeText={(v) => setContactPhone(v.replace(/\D/g, "").slice(0, 10))}
            mask="phone"
            keyboardType="phone-pad"
            error={errors.contactPhone}
            autoComplete="tel"
            textContentType="telephoneNumber"
            ref={phoneRef}
            returnKeyType="next"
            onSubmitEditing={() => dockRef.current?.focus()}
          />
          <FormField
            label="Facility dock address"
            value={dockAddress}
            onChangeText={setDockAddress}
            error={errors.dockAddress}
            autoComplete="street-address"
            textContentType="fullStreetAddress"
            ref={dockRef}
            returnKeyType="done"
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
            <AppText variant="body">
              {`${dates.find((d) => d.value === pickupDate)?.label ?? ""} · ${
                TIME_WINDOW_OPTIONS.find((w) => w.value === timeWindow)?.label ?? ""
              }`}
            </AppText>
            <AppText variant="bodySm" tone="secondary">{contactName}</AppText>
            <AppText variant="bodySm" tone="secondary">{dockAddress}</AppText>
          </Card>
          <Card variant="alt">
            <AppText variant="bodySm" tone="accent">This pickup is free of charge.</AppText>
          </Card>
          {submitError ? (
            <AppText variant="bodySm" style={{ color: tokens.color.danger }}>{submitError}</AppText>
          ) : null}
        </View>
      ) : null}
    </Screen>
  );
}
