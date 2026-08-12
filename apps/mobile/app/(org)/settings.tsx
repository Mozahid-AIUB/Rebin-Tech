import { useCallback, useEffect, useRef, useState } from "react";
import { View, type TextInput } from "react-native";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { getOrganizationDetail, updateOwnOrganization, useSessionStore } from "@rebin/api";
import {
  AppText,
  Card,
  FormField,
  PillButton,
  Screen,
  SectionHeader,
  SelectField,
  ToggleRow,
  tokens,
} from "@rebin/ui";
import { ORG_TYPE_OPTIONS, US_STATES } from "../../src/config/us-states";

// S33. Notification preferences from the plan aren't here -- there is no
// notifications table and nothing sends anything yet, so the toggles would
// save a preference no code reads.
//
// The same rules the RPC enforces, checked here first: a round trip to be told
// a ZIP is five digits is a worse way to learn it. The server still validates,
// because this copy can't be trusted.
function validate(values: {
  name: string;
  street: string;
  city: string;
  state: string;
  zip: string;
}): Record<string, string> {
  const errors: Record<string, string> = {};
  if (values.name.trim().length < 2) errors.name = "Organization name is required";
  if (values.street.trim().length < 3) errors.street = "Street address is required";
  if (values.city.trim().length < 2) errors.city = "City is required";
  if (!/^[A-Z]{2}$/.test(values.state)) errors.state = "Select a state";
  if (!/^\d{5}(\d{4})?$/.test(values.zip)) errors.zip = "Enter a valid ZIP code";
  return errors;
}

export default function OrgSettings() {
  const router = useRouter();
  const { assignments, activeIndex } = useSessionStore();
  const active = assignments[activeIndex];
  const orgId = active?.scopeType === "organization" ? active.scopeId : null;
  // Requesters can book pickups but not move the address every future pickup
  // arrives at, matching the RPC's own check.
  const canEdit = active?.role === "org_owner" || active?.role === "org_admin";

  const [name, setName] = useState("");
  const [orgType, setOrgType] = useState<string | null>(null);
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState<string | null>(null);
  const [zip, setZip] = useState("");
  const [dockAccess, setDockAccess] = useState(false);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const streetRef = useRef<TextInput>(null);
  const cityRef = useRef<TextInput>(null);
  const zipRef = useRef<TextInput>(null);

  const load = useCallback(async () => {
    if (!orgId) {
      setLoading(false);
      setLoadError("No organization is active for this account.");
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const org = await getOrganizationDetail(orgId);
      if (!org) throw new Error("This organization no longer exists.");
      setName(org.name);
      setOrgType(org.orgType);
      setStreet(org.address.street);
      setCity(org.address.city);
      setState(org.address.state);
      setZip(org.address.zip);
      setDockAccess(org.dockAccess);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Couldn't load your organization.");
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSave() {
    if (!orgId) return;
    const next = validate({ name, street, city, state: state ?? "", zip });
    setErrors(next);
    setSaved(false);
    if (Object.keys(next).length > 0) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setSaving(true);
    setSaveError(null);
    try {
      await updateOwnOrganization(orgId, {
        name,
        orgType: orgType ?? "other",
        street,
        city,
        state: state ?? "",
        zip,
        dockAccess,
      });
      setSaved(true);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Couldn't save your changes.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Screen>
        <AppText variant="body" tone="muted">Loading your organization…</AppText>
      </Screen>
    );
  }

  if (loadError) {
    return (
      <Screen>
        <Card variant="alt" style={{ gap: tokens.space[2] }}>
          <AppText variant="h3">Couldn&apos;t load your organization</AppText>
          <AppText variant="bodySm" tone="muted">{loadError}</AppText>
          <PillButton label="Try again" variant="secondary" onPress={() => void load()} />
        </Card>
        <PillButton label="Back" variant="ghost" onPress={() => router.back()} />
      </Screen>
    );
  }

  return (
    <Screen>
      <AppText variant="display">Organization</AppText>

      {!canEdit ? (
        <Card variant="alt">
          <AppText variant="bodySm" tone="muted">
            Only an owner or admin can change these details.
          </AppText>
        </Card>
      ) : null}

      <SectionHeader title="Profile" />
      <FormField
        label="Organization name"
        value={name}
        onChangeText={(v) => { setName(v); setSaved(false); }}
        error={errors.name}
        autoCapitalize="words"
        returnKeyType="next"
        onSubmitEditing={() => streetRef.current?.focus()}
      />
      <SelectField
        label="Organization type"
        value={orgType}
        options={ORG_TYPE_OPTIONS}
        onSelect={(v) => { setOrgType(v); setSaved(false); }}
      />

      <SectionHeader title="Pickup address" />
      <FormField
        label="Street address"
        value={street}
        onChangeText={(v) => { setStreet(v); setSaved(false); }}
        error={errors.street}
        autoComplete="street-address"
        textContentType="streetAddressLine1"
        ref={streetRef}
        returnKeyType="next"
        onSubmitEditing={() => cityRef.current?.focus()}
      />
      <FormField
        label="City"
        value={city}
        onChangeText={(v) => { setCity(v); setSaved(false); }}
        error={errors.city}
        autoComplete="postal-address-locality"
        textContentType="addressCity"
        autoCapitalize="words"
        ref={cityRef}
        returnKeyType="next"
        onSubmitEditing={() => zipRef.current?.focus()}
      />
      <SelectField
        label="State"
        value={state}
        options={US_STATES}
        onSelect={(v) => { setState(v); setSaved(false); }}
        error={errors.state}
      />
      <FormField
        label="ZIP code"
        value={zip}
        onChangeText={(v) => { setZip(v.replace(/\D/g, "").slice(0, 9)); setSaved(false); }}
        mask="zip"
        error={errors.zip}
        autoComplete="postal-code"
        textContentType="postalCode"
        ref={zipRef}
        returnKeyType="done"
      />
      <ToggleRow
        label="Loading dock"
        description="We'll send a lift-gate truck when there's no dock."
        value={dockAccess}
        onValueChange={(v) => { setDockAccess(v); setSaved(false); }}
      />

      {saveError ? (
        <AppText variant="bodySm" style={{ color: tokens.color.danger }}>{saveError}</AppText>
      ) : null}
      {saved ? (
        <AppText variant="bodySm" tone="accent">Saved.</AppText>
      ) : null}

      <View style={{ gap: tokens.space[2] }}>
        <PillButton
          label="Save changes"
          loading={saving}
          disabled={!canEdit}
          onPress={() => void onSave()}
        />
        <PillButton label="Back" variant="ghost" onPress={() => router.back()} />
      </View>
    </Screen>
  );
}
