import { useCallback, useEffect, useState } from "react";
import { View } from "react-native";
import { useRouter, type Href } from "expo-router";
import {
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
import { formatUsDate, formatUsTimeWindow } from "@rebin/shared";
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
import { JobCard } from "../../src/features/jobs/JobCard";

// S49. Same shape as the other two portals: honest stats, the list that
// matters, and the work in one place.
//
// The board is not filtered by distance. Routing on service area needs
// geocoded addresses, and matching on a ZIP string would hide a job one street
// over -- worse than showing everything while the board is small.

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [claiming, setClaiming] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
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
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load your work.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onClaim(job: AvailableJob) {
    setClaiming(job.requestId);
    setError(null);
    try {
      const jobId = await claimJob(job.requestId);
      await load();
      router.push(asHref(`/(agent)/job/${jobId}`));
    } catch (e) {
      // "Another agent already took this job" is the common one, and it is
      // worth reading rather than a generic failure.
      setError(e instanceof Error ? e.message : "Couldn't claim that job.");
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
            <StatTile value={String(summary?.jobsActive ?? 0)} label="IN HAND" tone="accent" />
            <StatTile value={String(summary?.jobsCompleted ?? 0)} label="COMPLETED" />
            <StatTile
              value={String(summary?.devicesCollected ?? 0)}
              label="DEVICES"
              tone={(summary?.devicesCollected ?? 0) > 0 ? "default" : "muted"}
            />
          </StatRow>

          <ChipSingleSelect options={TABS} value={tab} onChange={(v) => setTab(v as Tab)} />

          {error ? (
            <Card variant="alt" style={{ gap: tokens.space[2] }}>
              <AppText variant="bodySm" tone="muted">{error}</AppText>
              <PillButton label="Try again" variant="secondary" onPress={() => void load()} />
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
                <Card key={job.requestId} style={{ gap: tokens.space[2] }}>
                  <View
                    style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}
                  >
                    <AppText variant="h3">{job.orgName}</AppText>
                    <AppText variant="h3" tone="accent">{`${job.unitCount}`}</AppText>
                  </View>
                  <AppText variant="bodySm" tone="muted">
                    {`${job.city}, ${job.state} · ${formatUsDate(job.windowStart, job.timezone)}`}
                  </AppText>
                  <AppText variant="bodySm" tone="secondary">
                    {formatUsTimeWindow(job.windowStart, job.windowEnd, job.timezone)}
                  </AppText>
                  <PillButton
                    label="Take this job"
                    loading={claiming === job.requestId}
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
