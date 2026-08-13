import { useCallback, useState } from "react";
import { View } from "react-native";
import { useRouter, type Href } from "expo-router";
import {
  claimCollection,
  claimJob,
  getAgentSummary,
  getProfileName,
  listAvailableJobs,
  listMyJobs,
  useSessionStore,
  type AgentSummary,
  type AvailableJob,
  type MyJob,
} from "@rebin/api";
import { formatCents, formatUsDate, formatUsTimeWindow } from "@rebin/shared";
import {
  AppText,
  Card,
  ChipSingleSelect,
  EmptyState,
  PillButton,
  Screen,
  SectionHeader,
  StatRow,
  StatTile,
  tokens,
} from "@rebin/ui";
import { useLoader } from "../../src/hooks/useLoader";
import { JobCard, KIND_LABEL } from "../../src/features/jobs/JobCard";

// S49. Same shape as the other two portals: honest stats, the list that
// matters, and the work in one place.
//
// The board is not filtered by distance. Routing on service area needs
// geocoded addresses, and matching on a ZIP string would hide a job one street
// over -- worse than showing everything while the board is small.
//
// It carries both errands: an organization's free pickup and a business's
// paid collection. They are labelled by who they are for rather than by
// whether they pay -- "Organization" tells a driver to expect a dock and a
// booked time, "Business" a shop and a call to arrange one.

function greeting(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function asHref(path: string): Href {
  return path as Href;
}

const TABS = [
  { value: "mine", label: "My jobs" },
  { value: "board", label: "Job board" },
] as const;

type Tab = (typeof TABS)[number]["value"];

/** Jobs an agent is still expected to do something about. */
const OPEN: readonly MyJob["status"][] = ["claimed", "en_route", "on_site"];

export default function AgentDispatch() {
  const router = useRouter();
  const { userId } = useSessionStore();

  const [tab, setTab] = useState<Tab>("mine");
  const [firstName, setFirstName] = useState<string | null>(null);
  const [summary, setSummary] = useState<AgentSummary | null>(null);
  const [mine, setMine] = useState<MyJob[]>([]);
  const [board, setBoard] = useState<AvailableJob[]>([]);
  // "Another agent already took this job" belongs to the tap that hit it, not
  // to the board's own load -- and a background refresh must not wipe it
  // before the agent has read why their claim bounced.
  const [claimError, setClaimError] = useState<string | null>(null);
  const [claiming, setClaiming] = useState<string | null>(null);

  const { loading, error, reload } = useLoader(
    useCallback(async () => {
      const [name, stats, jobs, available] = await Promise.all([
        userId ? getProfileName(userId) : Promise.resolve(null),
        getAgentSummary(),
        listMyJobs(),
        listAvailableJobs(),
      ]);
      setFirstName(name?.trim().split(/\s+/)[0] ?? null);
      setSummary(stats);
      setMine(jobs);
      setBoard(available);
    }, [userId]),
  );

  async function onClaim(job: AvailableJob) {
    setClaiming(job.subjectId);
    setClaimError(null);
    try {
      const jobId =
        job.kind === "collection"
          ? await claimCollection(job.subjectId)
          : await claimJob(job.subjectId);
      reload();
      router.push(asHref(`/(agent)/job/${jobId}`));
    } catch (e) {
      // "Another agent already took this job" is the common one, and it is
      // worth reading rather than a generic failure.
      setClaimError(e instanceof Error ? e.message : "Couldn't claim that job.");
      // The board is stale by definition here -- a claim fails because someone
      // else got there first, so the card that was just tapped should not
      // still be sitting on it. Refreshing keeps the list honest without
      // wiping the message, which is what the split error state is for.
      reload();
    } finally {
      setClaiming(null);
    }
  }

  const openJobs = mine.filter((j) => OPEN.includes(j.status));

  return (
    <Screen>
      <View style={{ gap: 4 }}>
        <AppText variant="display">
          {firstName ? `${greeting(new Date().getHours())}, ${firstName}` : greeting(new Date().getHours())}
        </AppText>
        <AppText variant="body" tone="muted">Field agent</AppText>
      </View>

      {loading ? (
        <AppText variant="body" tone="muted">Loading your work…</AppText>
      ) : (
        <>
          <StatRow>
            <StatTile value={summary?.jobsActive ?? 0} label="IN HAND" tone="accent" index={0} />
            <StatTile value={summary?.jobsCompleted ?? 0} label="COMPLETED" index={1} />
            <StatTile
              value={
                (summary?.collectedValueCents ?? 0) > 0
                  ? formatCents(summary!.collectedValueCents)
                  : String(summary?.devicesCollected ?? 0)
              }
              label={(summary?.collectedValueCents ?? 0) > 0 ? "PAID OUT" : "DEVICES"}
              index={2}
              tone={(summary?.devicesCollected ?? 0) > 0 ? "default" : "muted"}
            />
          </StatRow>

          <ChipSingleSelect options={TABS} value={tab} onChange={(v) => setTab(v as Tab)} />

          {error ? (
            <Card variant="alt" style={{ gap: tokens.space[2] }}>
              <AppText variant="bodySm" tone="muted">{error}</AppText>
              <PillButton label="Try again" variant="secondary" onPress={reload} />
            </Card>
          ) : null}

          {/* A bounced claim gets its own line and no retry button. "Another
              agent already took this job" is not something trying again
              fixes -- the board below has refreshed and the job is gone. */}
          {claimError ? (
            <Card variant="alt">
              <AppText variant="bodySm" style={{ color: tokens.color.danger }}>
                {claimError}
              </AppText>
            </Card>
          ) : null}

          {tab === "mine" ? (
            openJobs.length === 0 ? (
              <EmptyState
                title="Nothing in hand"
                body="Take a job from the board and it will show up here."
              />
            ) : (
              <View style={{ gap: tokens.space[2] }}>
                {openJobs.map((job) => (
                  <JobCard key={job.id} job={job} />
                ))}
              </View>
            )
          ) : board.length === 0 ? (
            <EmptyState
              title="No jobs on the board"
              body="Scheduled pickups appear here as soon as they're confirmed."
            />
          ) : (
            <View style={{ gap: tokens.space[2] }}>
              <SectionHeader title={`${board.length} available`} />
              {board.map((job) => (
                <Card key={job.subjectId} style={{ gap: tokens.space[2] }}>
                  <View
                    style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}
                  >
                    <AppText variant="h3">{job.accountName}</AppText>
                    <AppText variant="h3" tone="accent">
                      {job.payoutCents !== null ? formatCents(job.payoutCents) : `${job.unitCount}`}
                    </AppText>
                  </View>
                  <AppText variant="label" tone="accent">{KIND_LABEL[job.kind]}</AppText>
                  <AppText variant="bodySm" tone="muted">
                    {`${job.street}, ${job.city}, ${job.state} · ${job.unitCount} devices`}
                  </AppText>
                  {job.windowStart && job.windowEnd ? (
                    <AppText variant="bodySm" tone="secondary">
                      {`${formatUsDate(job.windowStart, job.timezone)} · ${formatUsTimeWindow(job.windowStart, job.windowEnd, job.timezone)}`}
                    </AppText>
                  ) : (
                    <AppText variant="bodySm" tone="secondary">
                      Call the shop to arrange a time
                    </AppText>
                  )}
                  <PillButton
                    label="Take this job"
                    loading={claiming === job.subjectId}
                    onPress={() => void onClaim(job)}
                  />
                </Card>
              ))}
            </View>
          )}
        </>
      )}
    </Screen>
  );
}
