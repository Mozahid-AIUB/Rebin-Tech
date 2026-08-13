import { useCallback, useState } from "react";
import { View } from "react-native";
import { listPickupRequests, useSessionStore, type PickupRequestRow } from "@rebin/api";
import type { RequestStatus } from "@rebin/shared";
import {
  AppText,
  Card,
  ChipSingleSelect,
  EmptyState,
  FormField,
  PillButton,
  Screen,
  tokens,
} from "@rebin/ui";
import { useLoader } from "../../src/hooks/useLoader";
import { RequestCard } from "../../src/features/org-dashboard/RequestCard";

// S30's filter chips and ID search. Infinite scroll is not here: 50 rows is
// more history than any org has, and paging is worth building against a list
// long enough to need it rather than guessing at the interaction now.
const PAGE_SIZE = 50;

// Not every status: 'under_review', 'dispatched' and 'in_transit' are stages
// the platform moves a request through, and a chip per stage would be a filter
// bar longer than most orgs' entire history. These four are the states a
// customer actually sorts by.
const FILTERS = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "scheduled", label: "Scheduled" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
] as const;

type Filter = (typeof FILTERS)[number]["value"];

const EMPTY_COPY: Record<Filter, { title: string; body: string }> = {
  all: {
    title: "No requests yet",
    body: "Every pickup you schedule will appear here with its current status.",
  },
  pending: { title: "No pending requests", body: "Nothing is waiting on us right now." },
  scheduled: { title: "No scheduled requests", body: "Nothing is booked in at the moment." },
  completed: { title: "No completed requests", body: "Finished pickups will collect here." },
  cancelled: { title: "No cancelled requests", body: "Nothing has been called off." },
};

export default function OrgRequests() {
  const { assignments, activeIndex } = useSessionStore();
  const active = assignments[activeIndex];
  const orgId = active?.scopeType === "organization" ? active.scopeId : null;

  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<PickupRequestRow[]>([]);

  const { loading, error, reload } = useLoader(
    useCallback(async () => {
      // RoleGuard should make this unreachable; saying so beats an
      // empty screen that reads as a brand-new account.
      if (!orgId) throw new Error("No organization is active for this account.");
      setRows(
        await listPickupRequests(orgId, {
          status: filter === "all" ? undefined : (filter as RequestStatus),
          idPrefix: search.trim() || undefined,
          limit: PAGE_SIZE,
        }),
      );
    }, [orgId, filter, search]),
  );

  return (
    <Screen>
      <AppText variant="display">Requests</AppText>

      {/* Single-select: a request has one status, so two chips at once would
          always return nothing. */}
      <ChipSingleSelect
        options={FILTERS}
        value={filter}
        onChange={(next) => setFilter(next as Filter)}
      />

      <FormField
        label="Search by request ID"
        value={search}
        onChangeText={setSearch}
        placeholder="First few characters"
      />

      {loading ? (
        <AppText variant="body" tone="muted">Loading your requests…</AppText>
      ) : error ? (
        <Card variant="alt" style={{ gap: tokens.space[2] }}>
          <AppText variant="h3">Couldn&apos;t load your requests</AppText>
          <AppText variant="bodySm" tone="muted">{error}</AppText>
          <PillButton label="Try again" variant="secondary" onPress={reload} />
        </Card>
      ) : rows.length === 0 ? (
        // The copy names the filter, so an empty screen reads as "nothing
        // matched" rather than "you have never booked a pickup".
        <EmptyState
          title={search.trim() ? "Nothing matched that ID" : EMPTY_COPY[filter].title}
          body={
            search.trim()
              ? "Check the first few characters and try again."
              : EMPTY_COPY[filter].body
          }
        />
      ) : (
        <View style={{ gap: tokens.space[2] }}>
          {rows.map((row) => (
            <RequestCard key={row.id} request={row} />
          ))}
        </View>
      )}
    </Screen>
  );
}
