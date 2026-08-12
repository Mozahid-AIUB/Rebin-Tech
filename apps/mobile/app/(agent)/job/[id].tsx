import { useCallback, useEffect, useState } from "react";
import { Linking, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  advanceJob,
  getPickupRequest,
  getQuote,
  listMyJobs,
  type JobStatus,
  type MyJob,
  type PickupRequestDetail,
  type QuoteDetail,
} from "@rebin/api";
import { formatCents, formatUsDate, formatUsTimeWindow } from "@rebin/shared";
import {
  AppText,
  Card,
  FormField,
  PillButton,
  Screen,
  SectionHeader,
  tokens,
} from "@rebin/ui";
import { DEVICE_CATEGORY_OPTIONS } from "../../../src/config/us-states";

// S50-S52 and the settlement step, collapsed into one screen.
//
// The plan splits these across a job detail, a scanner and a settlement sheet.
// The scanner belongs to the paid flow -- an organization pickup is free, so
// there is nothing to appraise on site, only to count. What an agent needs
// here is the address, who to ask for, what was booked, and one button that
// moves the job on.
//
// Signature capture and the Bluetooth scale from the plan are absent: both are
// native modules that need a dev build, and neither changes what the record
// says. They belong with the paid-collection flow that also needs them.

const NEXT: Partial<Record<JobStatus, { status: JobStatus; label: string; hint: string }>> = {
  claimed: {
    status: "en_route",
    label: "Start driving",
    hint: "We'll tell the customer you're on the way.",
  },
  en_route: {
    status: "on_site",
    label: "I've arrived",
    hint: "Check in when you reach the dock.",
  },
};

function categoryLabel(value: string): string {
  return DEVICE_CATEGORY_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

export default function AgentJobDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [job, setJob] = useState<MyJob | null>(null);
  const [request, setRequest] = useState<PickupRequestDetail | null>(null);
  const [quote, setQuote] = useState<QuoteDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [counting, setCounting] = useState(false);
  const [actualUnits, setActualUnits] = useState("");
  const [notes, setNotes] = useState("");

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      // No get-one-job RPC: an agent has a handful of jobs, so filtering the
      // list they already have beats a second function to maintain.
      const found = (await listMyJobs()).find((j) => j.id === id) ?? null;
      setJob(found);
      if (found) {
        // The subject is a pickup request or a quote depending on the errand,
        // and each carries different things worth showing on a doorstep.
        if (found.kind === "pickup") setRequest(await getPickupRequest(found.subjectId));
        else setQuote(await getQuote(found.subjectId));
        setActualUnits((current) => current || String(found.unitCount));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load this job.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function advance(status: JobStatus, units?: number) {
    if (!id) return;
    setBusy(true);
    setActionError(null);
    try {
      await advanceJob(id, status, units, notes || undefined);
      setCounting(false);
      await load();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Couldn't update this job.");
    } finally {
      setBusy(false);
    }
  }

  function onCollect() {
    const units = Number(actualUnits);
    if (!actualUnits || Number.isNaN(units) || units < 0) {
      setActionError("Enter how many devices you collected.");
      return;
    }
    void advance("collected", units);
  }

  if (loading) {
    return (
      <Screen dark>
        <AppText variant="body" tone="muted">Loading this job…</AppText>
      </Screen>
    );
  }

  if (error || !job) {
    return (
      <Screen dark>
        <Card variant="alt" style={{ gap: tokens.space[2] }}>
          <AppText variant="h3">Couldn&apos;t load this job</AppText>
          <AppText variant="bodySm" tone="muted">{error ?? "It may have been reassigned."}</AppText>
          <PillButton label="Try again" variant="secondary" onPress={() => void load()} />
        </Card>
        <PillButton label="Back" variant="ghost" onPress={() => router.back()} />
      </Screen>
    );
  }

  const next = NEXT[job.status];
  const done = job.status === "collected";
  const address = `${job.street}, ${job.city}, ${job.state} ${job.zip}`;

  return (
    <Screen
      dark
      footer={
        done ? (
          <PillButton label="Back to my jobs" variant="secondary" onPress={() => router.back()} />
        ) : job.status === "on_site" && !counting ? (
          <PillButton label="Collect and finish" onPress={() => setCounting(true)} />
        ) : next ? (
          <View style={{ gap: tokens.space[1] }}>
            <PillButton label={next.label} loading={busy} onPress={() => void advance(next.status)} />
            <AppText variant="bodySm" tone="muted" style={{ textAlign: "center" }}>{next.hint}</AppText>
          </View>
        ) : null
      }
    >
      <View style={{ gap: tokens.space[1] }}>
        <AppText variant="display">{job.accountName}</AppText>
        <AppText variant="label" tone="accent">
          {job.kind === "pickup" ? "Organization" : "Business"}
        </AppText>
        {job.windowStart && job.windowEnd ? (
          <AppText variant="body" tone="secondary">
            {`${formatUsDate(job.windowStart, job.timezone)} · ${formatUsTimeWindow(job.windowStart, job.windowEnd, job.timezone)}`}
          </AppText>
        ) : (
          <AppText variant="body" tone="secondary">
            Call the shop to arrange a time
          </AppText>
        )}
      </View>

      <SectionHeader title="Where" />
      <Card style={{ gap: tokens.space[2] }}>
        <AppText variant="body">{address}</AppText>
        {/* Opens whichever maps app the phone has rather than embedding one:
            a driver already trusts their own navigation. */}
        <PillButton
          label="Open in maps"
          variant="secondary"
          onPress={() => void Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(address)}`)}
        />
      </Card>

      {request ? (
        <>
          <SectionHeader title="Who to ask for" />
          <Card style={{ gap: tokens.space[2] }}>
            <AppText variant="h3">{request.onSiteContactName}</AppText>
            <PillButton
              label={`Call ${request.onSiteContactPhone}`}
              variant="secondary"
              onPress={() => void Linking.openURL(`tel:${request.onSiteContactPhone}`)}
            />
            {request.instructions ? (
              <AppText variant="bodySm" tone="secondary">{request.instructions}</AppText>
            ) : null}
          </Card>

          <SectionHeader title="What's booked" />
          <Card style={{ gap: tokens.space[1] }}>
            <AppText variant="h3">{`${request.unitCount} devices`}</AppText>
            <AppText variant="bodySm" tone="muted">
              {request.categories.map(categoryLabel).join(", ")}
            </AppText>
          </Card>
        </>
      ) : null}

      {quote ? (
        <>
          <SectionHeader title="What you're collecting" />
          {quote.items.map((line, index) => (
            <Card key={`${line.componentKey}-${index}`} style={{ gap: 2 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <AppText variant="body">{`${line.quantity} × ${line.displayName}`}</AppText>
                <AppText variant="body" tone="muted">{line.grade}</AppText>
              </View>
            </Card>
          ))}
          {/* The figure the vendor is expecting. Payment itself is not wired
              yet, so this says what is owed rather than pretending it moves
              money. */}
          <Card accentBorder style={{ gap: tokens.space[1] }}>
            <AppText variant="label" tone="accent">AGREED PRICE</AppText>
            <AppText variant="display">{formatCents(quote.totalCents)}</AppText>
            <AppText variant="bodySm" tone="muted">
              Payment is arranged by the office — payouts arrive in a coming release.
            </AppText>
          </Card>
        </>
      ) : null}

      {actionError ? (
        <AppText variant="bodySm" style={{ color: tokens.color.danger }}>{actionError}</AppText>
      ) : null}

      {counting ? (
        <Card accentBorder style={{ gap: tokens.space[3] }}>
          <AppText variant="h3">What did you actually collect?</AppText>
          <AppText variant="bodySm" tone="secondary">
            Count what goes on the truck. This is the number on the customer&apos;s recycling
            record, so it matters more than what they booked.
          </AppText>
          <FormField
            label="Devices collected"
            value={actualUnits}
            onChangeText={(v) => setActualUnits(v.replace(/\D/g, ""))}
            keyboardType="number-pad"
            helper={`${job.unitCount} were booked`}
          />
          <FormField
            label="Anything worth noting? (optional)"
            value={notes}
            onChangeText={setNotes}
            multiline
            placeholder="Extra pallet, damaged unit, gate code…"
          />
          <PillButton label="Finish this job" loading={busy} onPress={onCollect} />
          <PillButton label="Not yet" variant="ghost" onPress={() => setCounting(false)} />
        </Card>
      ) : null}

      {done ? (
        <Card accentBorder style={{ gap: tokens.space[1] }}>
          <AppText variant="h3">Collected</AppText>
          <AppText variant="bodySm" tone="secondary">
            {`${job.unitCount} expected`}
          </AppText>
          <AppText variant="bodySm" tone="muted">
            The customer&apos;s request is marked completed.
          </AppText>
        </Card>
      ) : null}
    </Screen>
  );
}
