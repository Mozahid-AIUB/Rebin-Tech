import { useCallback, useEffect, useState } from "react";
import { getBusiness, getProfileName, useSessionStore, type BusinessSummary } from "@rebin/api";
import { AppText, Card, PillButton, tokens } from "@rebin/ui";
import { PortalHome } from "../../src/features/portal/PortalHome";

// P4 builds the real business flow (quote request, tier select, EasyPost
// label, Stripe payouts). What exists today is the account itself, so that is
// all this screen claims: who you are, which business you're in, and what
// opens next. No stat tiles -- there are no quotes, shipments or payouts to
// count yet, so every number would be a fabricated zero.
export default function BizDashboard() {
  const { userId, assignments, activeIndex } = useSessionStore();
  const active = assignments[activeIndex];
  const businessId = active?.scopeType === "business" ? active.scopeId : null;

  const [firstName, setFirstName] = useState<string | null>(null);
  const [business, setBusiness] = useState<BusinessSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId || !businessId) {
      setLoading(false);
      setError("No business is active for this account.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [name, biz] = await Promise.all([getProfileName(userId), getBusiness(businessId)]);
      setFirstName(name?.trim().split(/\s+/)[0] ?? null);
      setBusiness(biz);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load your dashboard.");
    } finally {
      setLoading(false);
    }
  }, [userId, businessId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PortalHome
      firstName={firstName}
      accountName={business?.name ?? null}
      loading={loading}
      error={error}
      onRetry={() => void load()}
    >
      <Card accentBorder style={{ gap: tokens.space[2] }}>
        <AppText variant="label" tone="accent">SELL YOUR STOCK</AppText>
        <AppText variant="h2">Get a quote</AppText>
        <AppText variant="bodySm" tone="secondary">
          Send us what you have and we&apos;ll price it against the live catalog.
        </AppText>
        <PillButton label="Request a quote" disabled onPress={() => {}} />
        <AppText variant="bodySm" tone="muted">Quoting opens with the next release.</AppText>
      </Card>
    </PortalHome>
  );
}
