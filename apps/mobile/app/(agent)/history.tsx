import { useCallback, useEffect, useState } from "react";
import { View } from "react-native";
import { getAgentSummary, listMyJobs, type AgentSummary, type MyJob } from "@rebin/api";
import {
  AppText,
  Card,
  EmptyState,
  PillButton,
  Screen,
  SectionHeader,
  StatRow,
  StatTile,
  tokens,
} from "@rebin/ui";
import { JobCard } from "../../src/features/jobs/JobCard";

// S64, minus earnings. There is no agent pay table and nothing calculates a
// rate, so a money figure here would be invented -- the same reason the
// organization's "devices recycled" waited for this portal to exist. What can
// be shown honestly is the work: jobs finished and devices collected.

export default function AgentHistory() {
  const [jobs, setJobs] = useState<MyJob[]>([]);
  const [summary, setSummary] = useState<AgentSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [rows, stats] = await Promise.all([listMyJobs(), getAgentSummary()]);
      setJobs(rows.filter((j) => j.status === "collected"));
      setSummary(stats);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load your history.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Screen>
      <AppText variant="display">History</AppText>

      {loading ? (
        <AppText variant="body" tone="muted">Loading your history…</AppText>
      ) : error ? (
        <Card variant="alt" style={{ gap: tokens.space[2] }}>
          <AppText variant="h3">Couldn&apos;t load your history</AppText>
          <AppText variant="bodySm" tone="muted">{error}</AppText>
          <PillButton label="Try again" variant="secondary" onPress={() => void load()} />
        </Card>
      ) : (
        <>
          <StatRow>
            <StatTile value={String(summary?.jobsCompleted ?? 0)} label="JOBS DONE" tone="accent" />
            <StatTile value={String(summary?.devicesCollected ?? 0)} label="DEVICES" />
          </StatRow>

          <SectionHeader title="Completed jobs" />
          {jobs.length === 0 ? (
            <EmptyState
              title="Nothing completed yet"
              body="Jobs you finish will collect here."
            />
          ) : (
            <View style={{ gap: tokens.space[2] }}>
              {jobs.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </View>
          )}
        </>
      )}
    </Screen>
  );
}
