import { Pressable, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import type { JobKind, JobStatus, MyJob } from "@rebin/api";
import { formatCents, formatUsDate, formatUsTimeWindow } from "@rebin/shared";
import { AppText, Card, tokens } from "@rebin/ui";

function asHref(path: string): Href {
  return path as Href;
}

// Worded from the agent's side of the screen -- what they have to do next,
// not what the record says. "Claimed" is a database state; "To do" is a job.
const STATUS_META: Record<JobStatus, { label: string; fg: string; bg: string }> = {
  claimed: { label: "To do", fg: tokens.color.warning, bg: tokens.color.surfaceWarm },
  en_route: { label: "On the way", fg: tokens.color.info, bg: "#E8EEF5" },
  on_site: { label: "On site", fg: tokens.color.info, bg: "#E8EEF5" },
  collected: { label: "Collected", fg: tokens.color.success, bg: tokens.color.primaryLight },
  cancelled: { label: "Dropped", fg: tokens.color.muted, bg: "#F0EFEA" },
};

// Named by who the job is for, not by whether it pays. An agent reading
// "Organization" knows to expect a loading dock and a contact waiting at a
// booked time; "Business" means a shop, a price, and a call to arrange a time.
// "Free" and "Paid" describe the money and leave out everything else.
export const KIND_LABEL: Record<JobKind, string> = {
  pickup: "Organization",
  collection: "Business",
};

export function JobCard({ job }: { job: MyJob }) {
  const router = useRouter();
  const meta = STATUS_META[job.status];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${job.accountName}, ${KIND_LABEL[job.kind]}, ${meta.label}`}
      onPress={() => router.push(asHref(`/(agent)/job/${job.id}`))}
    >
      <Card style={{ gap: tokens.space[1] }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <AppText variant="h3">{job.accountName}</AppText>
          <View
            accessibilityRole="text"
            style={{
              paddingHorizontal: tokens.space[2],
              paddingVertical: tokens.space[0] + 2,
              borderRadius: tokens.radius.chip,
              backgroundColor: meta.bg,
            }}
          >
            <AppText variant="label" style={{ color: meta.fg }}>{meta.label}</AppText>
          </View>
        </View>

        <AppText variant="label" tone="accent">{KIND_LABEL[job.kind]}</AppText>

        {/* A pickup has a booked window; a collection has a price and a time
            the agent arranges by phone. Showing an empty window on a
            collection would read as missing data rather than as absent by
            design. Times are in the facility's zone, not the driver's: the
            dock staff are waiting at their eight o'clock. */}
        {job.windowStart && job.windowEnd ? (
          <AppText variant="bodySm" tone="secondary">
            {`${formatUsDate(job.windowStart, job.timezone)} · ${formatUsTimeWindow(job.windowStart, job.windowEnd, job.timezone)}`}
          </AppText>
        ) : job.payoutCents !== null ? (
          <AppText variant="bodySm" tone="secondary">
            {`${formatCents(job.payoutCents)} to pay · call to arrange a time`}
          </AppText>
        ) : null}

        <AppText variant="bodySm" tone="muted">
          {`${job.street}, ${job.city} · ${job.unitCount} devices`}
        </AppText>
      </Card>
    </Pressable>
  );
}
