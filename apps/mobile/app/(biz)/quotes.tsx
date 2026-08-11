import { useCallback, useEffect, useState } from "react";
import { View } from "react-native";
import { listQuotes, useSessionStore, type QuoteRow } from "@rebin/api";
import {
  AppText,
  Card,
  ChipSingleSelect,
  EmptyState,
  PillButton,
  Screen,
  tokens,
} from "@rebin/ui";
import { QuoteCard } from "../../src/features/quotes/QuoteCard";

// S44. Filtering happens here rather than in the query, unlike the
// organization's request list: list_quotes returns a business's whole history
// in one call because a shop has tens of quotes, not thousands, and the RPC
// already computes the expiry each row should be read as.
const FILTERS = [
  { value: "all", label: "All" },
  { value: "offered", label: "Open" },
  { value: "accepted", label: "Accepted" },
  { value: "declined", label: "Declined" },
  { value: "expired", label: "Expired" },
] as const;

type Filter = (typeof FILTERS)[number]["value"];

const EMPTY_COPY: Record<Filter, { title: string; body: string }> = {
  all: {
    title: "No quotes yet",
    body: "Scan a batch of stock and we'll price it against the live catalog.",
  },
  offered: { title: "Nothing open", body: "You've answered every offer we've made." },
  accepted: { title: "Nothing accepted yet", body: "Offers you take will collect here." },
  declined: { title: "Nothing declined", body: "Offers you turn down will show up here." },
  expired: { title: "Nothing expired", body: "Offers you let lapse will show up here." },
};

export default function BizQuotes() {
  const { assignments, activeIndex } = useSessionStore();
  const active = assignments[activeIndex];
  const businessId = active?.scopeType === "business" ? active.scopeId : null;

  const [filter, setFilter] = useState<Filter>("all");
  const [quotes, setQuotes] = useState<QuoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!businessId) {
      setLoading(false);
      setError("No business is active for this account.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setQuotes(await listQuotes(businessId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load your quotes.");
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    void load();
  }, [load]);

  const shown = filter === "all" ? quotes : quotes.filter((q) => q.status === filter);

  return (
    <Screen>
      <AppText variant="display">Quotes</AppText>

      <ChipSingleSelect
        options={FILTERS}
        value={filter}
        onChange={(next) => setFilter(next as Filter)}
      />

      {loading ? (
        <AppText variant="body" tone="muted">Loading your quotes…</AppText>
      ) : error ? (
        <Card variant="alt" style={{ gap: tokens.space[2] }}>
          <AppText variant="h3">Couldn&apos;t load your quotes</AppText>
          <AppText variant="bodySm" tone="muted">{error}</AppText>
          <PillButton label="Try again" variant="secondary" onPress={() => void load()} />
        </Card>
      ) : shown.length === 0 ? (
        <EmptyState title={EMPTY_COPY[filter].title} body={EMPTY_COPY[filter].body} />
      ) : (
        <View style={{ gap: tokens.space[2] }}>
          {shown.map((quote) => (
            <QuoteCard key={quote.id} quote={quote} />
          ))}
        </View>
      )}
    </Screen>
  );
}
