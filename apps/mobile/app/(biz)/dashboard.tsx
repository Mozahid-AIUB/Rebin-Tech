import { useCallback, useState } from "react";
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
import {
  formatCents,
  summariseQuotes,
  SUPPLIER_BUSINESS_TYPE,
  WAREHOUSE_ADDRESS,
  WAREHOUSE_ADDRESS_PENDING_NOTE,
} from "@rebin/shared";
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
import { useLoader } from "../../src/hooks/useLoader";
import { AppraisalScanSheet } from "../../src/features/scan/AppraisalScanSheet";
import { ManualEntrySheet } from "../../src/features/scan/ManualEntrySheet";
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
  // Kept apart from the loader's own error: a quote that failed to save is
  // not a dashboard that failed to load, and offering "Try again" against the
  // wrong one sends the user back to the wrong place.
  const [saveError, setSaveError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [typing, setTyping] = useState(false);
  const [quoting, setQuoting] = useState(false);

  const { loading, error, reload } = useLoader(
    useCallback(async () => {
      // RoleGuard should make this unreachable; saying so beats an empty
      // dashboard that reads as a brand-new account.
      if (!userId || !businessId) throw new Error("No business is active for this account.");
      const [name, biz, rows] = await Promise.all([
        getProfileName(userId),
        getBusiness(businessId),
        listQuotes(businessId),
      ]);
      setFirstName(name?.trim().split(/\s+/)[0] ?? null);
      setBusiness(biz);
      setQuotes(rows);
    }, [userId, businessId]),
  );

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
    setTyping(false);
    setQuoting(true);
    setSaveError(null);
    try {
      const quoteId = await createQuote(
        businessId,
        appraisal.items.map((item) => ({
          componentKey: item.componentKey,
          grade: item.grade,
          quantity: item.quantity,
          confidence: item.confidence,
          notes: item.notes,
          // Carried through so an operator reviewing a quote can tell a line
          // the camera read from one somebody typed.
          source: item.source,
        })),
      );
      reload();
      router.push(asHref(`/(biz)/quote/${quoteId}`));
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Couldn't save that quote.");
    } finally {
      setQuoting(false);
    }
  }

  const stats = summariseQuotes(quotes);
  // A supplier and a repair shop are both biz_owner -- the role can't tell
  // them apart, so this reads the loaded business row instead of asking again.
  const isSupplier = business?.businessType === SUPPLIER_BUSINESS_TYPE;

  return (
    <Screen
      footer={
        <View style={{ gap: tokens.space[1] }}>
          <PillButton
            label="Scan your stock"
            loading={quoting}
            onPress={() => setScanning(true)}
          />
          {/* Deliberately the quieter of the two. The camera is what this
              portal is for; typing is what it falls back to. */}
          <PillButton
            label="Add items by hand"
            variant="ghost"
            onPress={() => setTyping(true)}
          />
          {/* Sits with the button that failed rather than in the list above
              it: a scan the vendor just finished is what they are looking at,
              and the lines it produced are gone by the time this shows. */}
          {saveError ? (
            <AppText
              variant="bodySm"
              style={{ textAlign: "center", color: tokens.color.danger }}
            >
              {saveError}
            </AppText>
          ) : (
            <AppText variant="bodySm" tone="muted" style={{ textAlign: "center" }}>
              Photograph what you have · priced against today&apos;s catalog
            </AppText>
          )}
        </View>
      }
    >
      <AppraisalScanSheet
        visible={scanning}
        onClose={() => setScanning(false)}
        onDone={(appraisal) => void onAppraised(appraisal)}
        onFallback={() => {
          setScanning(false);
          setTyping(true);
        }}
      />
      <ManualEntrySheet
        visible={typing}
        onClose={() => setTyping(false)}
        onDone={(appraisal) => void onAppraised(appraisal)}
      />

      <View style={{ gap: 4 }}>
        <AppText variant="display">
          {firstName ? `${greeting(new Date().getHours())}, ${firstName}` : greeting(new Date().getHours())}
        </AppText>
        {business ? <AppText variant="body" tone="muted">{business.name}</AppText> : null}
      </View>

      {/* A supplier collects their own stock and ships it on -- they never
          have a pickup to schedule, and a screen that only hid a pickup
          control would leave them with no answer to "so what do I do now". */}
      {isSupplier ? (
        <Card accentBorder style={{ gap: tokens.space[1] }}>
          <AppText variant="h3">Ship it to us</AppText>
          <AppText variant="bodySm" tone="secondary">
            Send your collection to the Rebin Tech warehouse. We weigh and sort
            it on arrival, and your payout follows within seven days.
          </AppText>
          {WAREHOUSE_ADDRESS ? (
            <AppText variant="bodySm" tone="muted" selectable>
              {WAREHOUSE_ADDRESS}
            </AppText>
          ) : (
            <AppText variant="bodySm" tone="muted">
              {WAREHOUSE_ADDRESS_PENDING_NOTE}
            </AppText>
          )}
        </Card>
      ) : null}

      {loading ? (
        <AppText variant="body" tone="muted">Loading your dashboard…</AppText>
      ) : error ? (
        <Card variant="alt" style={{ gap: tokens.space[2] }}>
          <AppText variant="h3">Couldn&apos;t load your dashboard</AppText>
          <AppText variant="bodySm" tone="muted">{error}</AppText>
          <PillButton label="Try again" variant="secondary" onPress={reload} />
        </Card>
      ) : (
        <>
          <StatRow>
            <StatTile value={stats.openCount} label="OPEN OFFERS" tone="accent" index={0} />
            <StatTile value={stats.openValueCents / 100} prefix="$" label="ON THE TABLE" index={1} />
            <StatTile
              value={stats.acceptedValueCents / 100}
              prefix="$"
              label="ACCEPTED"
              index={2}
              tone={stats.acceptedValueCents > 0 ? "default" : "muted"}
            />
          </StatRow>
          {/* Three unlabelled dollar figures read as a cart total as easily
              as an amount owed to you -- an App Store reviewer read this
              screen exactly that way (Guideline 3.1.1, "external mechanism
              for purchases"). Every figure on this dashboard is money Rebin
              Tech owes the vendor, never the reverse, and that has to be
              said next to the numbers, not just be true of the business. */}
          <AppText variant="label" tone="muted">
            You'll be paid this — Rebin Tech never charges you
          </AppText>
          {/* The number above comes from the catalog, not a scale. For a
              supplier the scale has the final say, so an unqualified total
              here would be a promise this dashboard can't keep. */}
          {isSupplier ? (
            <AppText variant="label" tone="muted">
              Estimated — final price is set when we weigh it
            </AppText>
          ) : null}

          <SectionHeader title="Recent quotes" />
          {quotes.length === 0 ? (
            <EmptyState
              title="No quotes yet"
              body="Scan a batch of stock and we'll price it against the live catalog."
            />
          ) : (
            <View style={{ gap: tokens.space[2] }}>
              {quotes.slice(0, 5).map((quote) => (
                <QuoteCard key={quote.id} quote={quote} estimate={isSupplier} />
              ))}
            </View>
          )}
        </>
      )}
    </Screen>
  );
}
