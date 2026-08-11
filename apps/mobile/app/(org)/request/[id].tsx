import { useCallback, useEffect, useState } from "react";
import { View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  cancelPickupRequest,
  getPickupRequest,
  reschedulePickupRequest,
  type PickupRequestDetail,
} from "@rebin/api";
import {
  REQUEST_STATUSES,
  buildPickupWindow,
  formatUsDate,
  formatUsTimeWindow,
  nextPickupDates,
  type RequestStatus,
} from "@rebin/shared";
import {
  AppText,
  Card,
  PillButton,
  Screen,
  SectionHeader,
  SelectField,
  StatusBadge,
  tokens,
} from "@rebin/ui";
import { DEVICE_CATEGORY_OPTIONS, TIME_WINDOW_OPTIONS } from "../../../src/config/us-states";

// S29. The plan also specifies an assigned-agent card, a live map while
// en route, and a certificate download. None of the three has a data source --
// there is no dispatch table, no agent location, and no certificates table --
// so they arrive with the features that produce them rather than as tiles that
// could only ever render placeholder text.

// The stages a pickup passes through, in order. 'cancelled' is deliberately
// absent: it ends the request rather than advancing it, and drawing it as a
// step would imply every pickup passes through it.
const TIMELINE: readonly { status: RequestStatus; label: string }[] = [
  { status: "pending", label: "Submitted" },
  { status: "under_review", label: "Under review" },
  { status: "scheduled", label: "Scheduled" },
  { status: "dispatched", label: "Agent dispatched" },
  { status: "in_transit", label: "In transit" },
  { status: "completed", label: "Completed" },
];

/** Before an agent is on the way, the customer can still change their mind. */
const CHANGEABLE: readonly RequestStatus[] = ["pending", "under_review", "scheduled"];

function labelForCategory(value: string): string {
  return DEVICE_CATEGORY_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

function Timeline({ status }: { status: RequestStatus }) {
  const currentIndex = TIMELINE.findIndex((s) => s.status === status);
  const cancelled = status === "cancelled";

  return (
    <View style={{ gap: tokens.space[2] }}>
      {TIMELINE.map((step, i) => {
        // A cancelled request keeps the stages it actually reached; everything
        // after is neither done nor coming.
        const done = !cancelled && i <= currentIndex;
        const state = done ? "done" : "upcoming";
        return (
          <View
            key={step.status}
            accessibilityLabel={`${step.label}, ${state}`}
            style={{ flexDirection: "row", alignItems: "center", gap: tokens.space[2] }}
          >
            <View
              style={{
                width: 12,
                height: 12,
                borderRadius: 6,
                borderWidth: 2,
                borderColor: done ? tokens.color.primary : tokens.color.border,
                backgroundColor: done ? tokens.color.primary : "transparent",
              }}
            />
            <AppText variant="bodySm" tone={done ? "default" : "muted"}>{step.label}</AppText>
          </View>
        );
      })}
    </View>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ gap: 2 }}>
      <AppText variant="label" tone="muted">{label}</AppText>
      <AppText variant="body">{value}</AppText>
    </View>
  );
}

export default function RequestDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [request, setRequest] = useState<PickupRequestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);
  const [newDate, setNewDate] = useState<string | null>(null);
  const [newWindow, setNewWindow] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      setRequest(await getPickupRequest(id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load this request.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onCancel() {
    if (!id) return;
    setBusy(true);
    setActionError(null);
    try {
      await cancelPickupRequest(id);
      setConfirmingCancel(false);
      await load();
    } catch (e) {
      // The RPC refuses a dispatched pickup, and its message says why. Showing
      // it beats a generic failure the user can do nothing with.
      setActionError(e instanceof Error ? e.message : "Couldn't cancel this pickup.");
    } finally {
      setBusy(false);
    }
  }

  async function onReschedule() {
    if (!id || !newDate || !newWindow || !request) return;
    setBusy(true);
    setActionError(null);
    try {
      const window = buildPickupWindow(newDate, newWindow, request.timezone);
      await reschedulePickupRequest(id, window.windowStart, window.windowEnd);
      setRescheduling(false);
      setNewDate(null);
      setNewWindow(null);
      await load();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Couldn't move this pickup.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <Screen>
        <AppText variant="body" tone="muted">Loading this request…</AppText>
      </Screen>
    );
  }

  if (error || !request) {
    return (
      <Screen>
        <Card variant="alt" style={{ gap: tokens.space[2] }}>
          <AppText variant="h3">Couldn&apos;t load this request</AppText>
          <AppText variant="bodySm" tone="muted">{error ?? "It may have been removed."}</AppText>
          <PillButton label="Try again" variant="secondary" onPress={() => void load()} />
        </Card>
        <PillButton label="Back" variant="ghost" onPress={() => router.back()} />
      </Screen>
    );
  }

  const changeable = CHANGEABLE.includes(request.status);
  const dates = nextPickupDates(new Date().toISOString().slice(0, 10), 10).map((value) => ({
    value,
    label: new Intl.DateTimeFormat("en-US", {
      timeZone: "UTC",
      weekday: "short",
      month: "short",
      day: "numeric",
    }).format(new Date(`${value}T12:00:00Z`)),
  }));

  return (
    <Screen>
      <View style={{ gap: tokens.space[1] }}>
        <AppText variant="display">{`${request.unitCount} devices`}</AppText>
        <StatusBadge status={request.status} />
        <AppText variant="bodySm" tone="muted">
          {`Requested ${formatUsDate(request.createdAt, request.timezone)}`}
        </AppText>
      </View>

      <SectionHeader title="Progress" />
      <Card>
        <Timeline status={request.status} />
      </Card>

      <SectionHeader title="Details" />
      <Card style={{ gap: tokens.space[3] }}>
        <Field
          label="PICKUP WINDOW"
          value={`${formatUsDate(request.windowStart, request.timezone)} · ${formatUsTimeWindow(
            request.windowStart,
            request.windowEnd,
            request.timezone,
          )}`}
        />
        <Field label="CATEGORIES" value={request.categories.map(labelForCategory).join(", ")} />
        <Field label="ON-SITE CONTACT" value={request.onSiteContactName} />
        <Field label="CONTACT PHONE" value={request.onSiteContactPhone} />
        <Field label="DOCK ADDRESS" value={request.dockAddress} />
        {request.instructions ? (
          <Field label="INSTRUCTIONS" value={request.instructions} />
        ) : null}
      </Card>

      {actionError ? (
        <AppText variant="bodySm" style={{ color: tokens.color.danger }}>{actionError}</AppText>
      ) : null}

      {changeable && rescheduling ? (
        <Card style={{ gap: tokens.space[3] }}>
          <AppText variant="h3">Move this pickup</AppText>
          <SelectField label="New date" value={newDate} options={dates} onSelect={setNewDate} />
          <SelectField
            label="New time window"
            value={newWindow}
            options={TIME_WINDOW_OPTIONS}
            onSelect={setNewWindow}
          />
          <PillButton
            label="Confirm new time"
            loading={busy}
            disabled={!newDate || !newWindow}
            onPress={() => void onReschedule()}
          />
          <PillButton label="Never mind" variant="ghost" onPress={() => setRescheduling(false)} />
        </Card>
      ) : null}

      {changeable && confirmingCancel ? (
        <Card variant="alt" style={{ gap: tokens.space[2] }}>
          <AppText variant="h3">Cancel this pickup?</AppText>
          <AppText variant="bodySm" tone="muted">
            We&apos;ll drop it from the schedule. You can book another any time.
          </AppText>
          <PillButton label="Yes, cancel it" variant="danger" loading={busy} onPress={() => void onCancel()} />
          <PillButton label="Keep it" variant="ghost" onPress={() => setConfirmingCancel(false)} />
        </Card>
      ) : null}

      {changeable && !rescheduling && !confirmingCancel ? (
        <View style={{ gap: tokens.space[2] }}>
          <PillButton label="Reschedule" variant="secondary" onPress={() => setRescheduling(true)} />
          <PillButton label="Cancel pickup" variant="ghost" onPress={() => setConfirmingCancel(true)} />
        </View>
      ) : null}

      <PillButton label="Back" variant="ghost" onPress={() => router.back()} />
    </Screen>
  );
}
