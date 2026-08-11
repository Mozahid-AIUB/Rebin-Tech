import { useCallback, useEffect, useState } from "react";
import { View } from "react-native";
import { useRouter, type Href } from "expo-router";
import {
  createQuote,
  getBusiness,
  getProfileName,
  listQuotes,
  useSessionStore,
  type BusinessSummary,
  type Appraisal,
  type QuoteRow,
} from "@rebin/api";
import { formatCents, summariseQuotes } from "@rebin/shared";
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
import { AppraisalScanSheet } from "../../src/features/scan/AppraisalScanSheet";
import { QuoteCard } from "../../src/features/quotes/QuoteCard";

// S34, built to the same shape as the organization home: three honest stats,
// the list of what is in flight, and the one action this portal is for sitting
// in the footer where a thumb reaches it.
//
// "Paid this month" from the plan is absent. Accepting a quote is not being
// paid, and nothing pays anything until the payout flow exists -- reporting
// agreed money as received money is a number a vendor plans around and then
// cannot find in their bank.

function greeting(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function asHref(path: string): Href {
  return path as Href;
}

export default function BizDashboard() {
  const router = useRouter();
  const { userId, assignments, activeIndex } = useSessionStore();
  const active = assignments[activeIndex];
  const businessId = active?.scopeType === "business" ? active.scopeId : null;

  const [firstName, setFirstName] = useState<string | null>(null);
  const [business, setBusiness] = useState<BusinessSummary | null>(null);
  const [quotes, setQuotes] = useState<QuoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [quoting, setQuoting] = useState(false);

  const load = useCallback(async () => {
    if (!userId || !businessId) {
      setLoading(false);
      setError("No business is active for this account.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [name, biz, rows] = await Promise.all([
        getProfileName(userId),
        getBusiness(businessId),
        listQuotes(businessId),
      ]);
      setFirstName(name?.trim().split(/\s+/)[0] ?? null);
      setBusiness(biz);
      setQuotes(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load your dashboard.");
    } finally {
      setLoading(false);
    }
  }, [userId, businessId]);

  useEffect(() => {
    void load();
  }, [load]);

  /**
   * Saves what the camera priced as a real offer.
   *
   * Only the key, grade and quantity go up. The prices the sheet displayed came
   * from the catalog on the way down, and create_quote reads them again on the
   * way back -- so the offer stored is the catalog's, not the phone's.
   */
  async function onAppraised(appraisal: Appraisal) {
    if (!businessId) return;
    setScanning(false);
    setQuoting(true);
    setError(null);
    try {
      const quoteId = await createQuote(
        businessId,
        appraisal.items.map((item) => ({
          componentKey: item.componentKey,
          grade: item.grade,
          quantity: item.quantity,
          confidence: item.confidence,
          notes: item.notes,
        })),
      );
      await load();
      router.push(asHref(`/(biz)/quote/${quoteId}`));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save that quote.");
    } finally {
      setQuoting(false);
    }
  }

  const stats = summariseQuotes(quotes);

  return (
    <Screen
      footer={
        <View style={{ gap: tokens.space[1] }}>
          <PillButton
            label="Scan your stock"
            loading={quoting}
            onPress={() => setScanning(true)}
          />
          <AppText variant="bodySm" tone="muted" style={{ textAlign: "center" }}>
            Photograph what you have · priced against today&apos;s catalog
          </AppText>
        </View>
      }
    >
      <AppraisalScanSheet
        visible={scanning}
        onClose={() => setScanning(false)}
        onDone={(appraisal) => void onAppraised(appraisal)}
      />

      <View style={{ gap: 4 }}>
        <AppText variant="display">
          {firstName ? `${greeting(new Date().getHours())}, ${firstName}` : greeting(new Date().getHours())}
        </AppText>
        {business ? <AppText variant="body" tone="muted">{business.name}</AppText> : null}
      </View>

      {loading ? (
        <AppText variant="body" tone="muted">Loading your dashboard…</AppText>
      ) : error ? (
        <Card variant="alt" style={{ gap: tokens.space[2] }}>
          <AppText variant="h3">Couldn&apos;t load your dashboard</AppText>
          <AppText variant="bodySm" tone="muted">{error}</AppText>
          <PillButton label="Try again" variant="secondary" onPress={() => void load()} />
        </Card>
      ) : (
        <>
          <StatRow>
            <StatTile value={String(stats.openCount)} label="OPEN OFFERS" tone="accent" />
            <StatTile value={formatCents(stats.openValueCents)} label="ON THE TABLE" />
            <StatTile
              value={formatCents(stats.acceptedValueCents)}
              label="ACCEPTED"
              tone={stats.acceptedValueCents > 0 ? "default" : "muted"}
            />
          </StatRow>

          <SectionHeader title="Recent quotes" />
          {quotes.length === 0 ? (
            <EmptyState
              title="No quotes yet"
              body="Scan a batch of stock and we'll price it against the live catalog."
            />
          ) : (
            <View style={{ gap: tokens.space[2] }}>
              {quotes.slice(0, 5).map((quote) => (
                <QuoteCard key={quote.id} quote={quote} />
              ))}
            </View>
          )}
        </>
      )}
    </Screen>
  );
}
