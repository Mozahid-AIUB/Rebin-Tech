import { AppText, EmptyState, Screen } from "@rebin/ui";

// S38-S41 (quote request, tier select, offer, accept) are phase P4. The tab
// exists now so the portal's shape is settled; it shows an honest empty state
// rather than a stub that pretends to be a feature.
export default function BizQuotes() {
  return (
    <Screen>
      <AppText variant="display">Quotes</AppText>
      <EmptyState
        title="No quotes yet"
        body="Once quoting opens, every offer you request will appear here with its price and status."
      />
    </Screen>
  );
}
