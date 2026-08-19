import { useCallback, useState } from "react";
import { View } from "react-native";
import { getBusiness, listQuotes, useSessionStore, type BusinessSummary, type QuoteRow } from "@rebin/api";
import { SUPPLIER_BUSINESS_TYPE } from "@rebin/shared";
import {
  AppText,
  Card,
  ChipSingleSelect,
  EmptyState,
  PillButton,
  Screen,
  tokens,
} from "@rebin/ui";
import { useLoader } from "../../src/hooks/useLoader";
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
  const [business, setBusiness] = useState<BusinessSummary | null>(null);

  const { loading, error, reload } = useLoader(
    useCallback(async () => {
      // RoleGuard should make this unreachable; saying so beats an
      // empty screen that reads as a brand-new account.
      if (!businessId) throw new Error("No business is active for this account.");
      const [rows, biz] = await Promise.all([listQuotes(businessId), getBusiness(businessId)]);
      setQuotes(rows);
      setBusiness(biz);
    }, [businessId]),
  );

  const shown = filter === "all" ? quotes : quotes.filter((q) => q.status === filter);
  // A supplier and a repair shop are both biz_owner -- the role can't tell
  // them apart, so this reads the loaded business row instead.
  const isSupplier = business?.businessType === SUPPLIER_BUSINESS_TYPE;

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
          <PillButton label="Try again" variant="secondary" onPress={reload} />
        </Card>
      ) : shown.length === 0 ? (
        <EmptyState title={EMPTY_COPY[filter].title} body={EMPTY_COPY[filter].body} />
      ) : (
        <View style={{ gap: tokens.space[2] }}>
          {shown.map((quote) => (
            <QuoteCard key={quote.id} quote={quote} estimate={isSupplier} />
          ))}
        </View>
      )}
    </Screen>
  );
}
