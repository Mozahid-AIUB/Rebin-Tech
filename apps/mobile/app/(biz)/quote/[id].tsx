import { useCallback, useEffect, useState } from "react";
import { View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { decideQuote, getBusiness, getQuote, useSessionStore, type QuoteDetail } from "@rebin/api";
import {
  formatCents,
  formatUsDate,
  scanDisposition,
  SUPPLIER_BUSINESS_TYPE,
  WAREHOUSE_ADDRESS,
  WAREHOUSE_ADDRESS_PENDING_NOTE,
} from "@rebin/shared";
import {
  AppText,
  Card,
  Docket,
  DocketLine,
  PillButton,
  Screen,
  tokens,
} from "@rebin/ui";

// S43. The offer in full, and the two answers to it.
//
// Everything shown is read from quote_items, which copied the catalog's prices
// at quote time. Re-reading the live catalog here would silently reprice an
// offer that had already been made -- the failure the versioned catalog exists
// to prevent.
const TZ = "America/New_York";

const STATUS_LINE: Record<QuoteDetail["status"], string> = {
  offered: "This offer is open",
  accepted: "You accepted this offer",
  declined: "You declined this offer",
  expired: "This offer expired",
};

const STAMP: Record<QuoteDetail["status"], { label: string; tone: "pending" | "active" | "done" | "dead" }> = {
  offered: { label: "Open", tone: "active" },
  accepted: { label: "Accepted", tone: "done" },
  declined: { label: "Declined", tone: "dead" },
  expired: { label: "Expired", tone: "dead" },
};

export default function QuoteDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { assignments, activeIndex } = useSessionStore();
  const active = assignments[activeIndex];
  const businessId = active?.scopeType === "business" ? active.scopeId : null;

  const [quote, setQuote] = useState<QuoteDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmingDecline, setConfirmingDecline] = useState(false);
  // Whether this total is still catalog-only or already backed by a scale.
  // Read from business_type, not the role: a supplier and a repair shop are
  // both biz_owner, so the role alone can't tell this screen which it has.
  const [isSupplier, setIsSupplier] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [quoteResult, business] = await Promise.all([
        getQuote(id),
        businessId ? getBusiness(businessId) : Promise.resolve(null),
      ]);
      setQuote(quoteResult);
      setIsSupplier(business?.businessType === SUPPLIER_BUSINESS_TYPE);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load this quote.");
    } finally {
      setLoading(false);
    }
  }, [id, businessId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function decide(accept: boolean) {
    if (!id) return;
    setBusy(true);
    setActionError(null);
    try {
      await decideQuote(id, accept);
      setConfirmingDecline(false);
      await load();
    } catch (e) {
      // The RPC refuses an expired or already-answered quote and says which.
      setActionError(e instanceof Error ? e.message : "Couldn't record that answer.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <Screen>
        <AppText variant="body" tone="muted">Loading this quote…</AppText>
      </Screen>
    );
  }

  if (error || !quote) {
    return (
      <Screen>
        <Card variant="alt" style={{ gap: tokens.space[2] }}>
          <AppText variant="h3">Couldn&apos;t load this quote</AppText>
          <AppText variant="bodySm" tone="muted">{error ?? "It may have been removed."}</AppText>
          <PillButton label="Try again" variant="secondary" onPress={() => void load()} />
        </Card>
        <PillButton label="Back" variant="ghost" onPress={() => router.back()} />
      </Screen>
    );
  }

  const open = quote.status === "offered";
  // Only a finished collection has anything to report. An agent still on the
  // road has no counts yet -- expected_units is snapshotted when the job is
  // closed, not when it is claimed -- so a card built from a live job would be
  // "Collected null of null".
  const outcome = quote.collection?.status === "collected" ? quote.collection : null;
  const held = outcome?.reconciliation === "mismatch";

  return (
    <Screen
      footer={
        open ? (
          <View style={{ gap: tokens.space[2] }}>
            <PillButton
              label={`Accept ${formatCents(quote.totalCents)}`}
              loading={busy}
              onPress={() => void decide(true)}
            />
            <PillButton
              label="Decline"
              variant="ghost"
              onPress={() => setConfirmingDecline(true)}
            />
          </View>
        ) : (
          <PillButton label="Back to quotes" variant="secondary" onPress={() => router.back()} />
        )
      }
    >
      <View style={{ gap: tokens.space[1] }}>
        <AppText variant="display">{formatCents(quote.totalCents)}</AppText>
        {/* Covers the Accept button below too -- this is the total the button
            repeats, so the qualifier only needs to live here once. The number
            comes from the catalog; for a supplier the scale has the final say. */}
        {isSupplier ? (
          <AppText variant="bodySm" tone="muted">
            Estimated — final price is set when we weigh it
          </AppText>
        ) : null}
        <AppText variant="body" tone={open ? "accent" : "muted"}>{STATUS_LINE[quote.status]}</AppText>
        <AppText variant="bodySm" tone="muted">
          {open
            ? `Quoted ${formatUsDate(quote.createdAt, TZ)} · good until ${formatUsDate(quote.expiresAt, TZ)}`
            : `Quoted ${formatUsDate(quote.createdAt, TZ)}`}
        </AppText>
      </View>

      <Docket
        title="Rebin · collection docket"
        reference={`QT-${quote.id.slice(0, 8).toUpperCase()}`}
        date={formatUsDate(quote.createdAt, TZ)}
        totalLabel={isSupplier ? "ESTIMATED TOTAL" : "TOTAL"}
        total={formatCents(quote.totalCents)}
        stampLabel={STAMP[quote.status].label}
        stampTone={STAMP[quote.status].tone}
        stampAnimate={quote.status === "accepted"}
      >
        {quote.items.map((line, index) => (
          <DocketLine
            key={`${line.componentKey}-${line.grade}-${index}`}
            quantity={line.quantity}
            name={line.displayName}
            qualifier={line.grade}
            // The note is what the model saw. On a docket it stands where a
            // serial would, because it is the same thing: evidence for the
            // line above it.
            serial={line.notes}
            amount={formatCents(line.lineTotalCents)}
          />
        ))}
      </Docket>

      {actionError ? (
        <AppText variant="bodySm" style={{ color: tokens.color.danger }}>{actionError}</AppText>
      ) : null}

      {confirmingDecline ? (
        <Card variant="alt" style={{ gap: tokens.space[2] }}>
          <AppText variant="h3">Decline this offer?</AppText>
          <AppText variant="bodySm" tone="muted">
            You can scan the same stock again later, but prices move — the next offer may differ.
          </AppText>
          <PillButton label="Yes, decline" variant="danger" loading={busy} onPress={() => void decide(false)} />
          <PillButton label="Keep it open" variant="ghost" onPress={() => setConfirmingDecline(false)} />
        </Card>
      ) : null}

      {/* Withdrawn once someone has actually been: promising to arrange a
          collection under a card that says what was collected reads as two
          screens arguing, and it is the held-payout case where a vendor is
          reading most carefully. */}
      {quote.status === "accepted" && !outcome ? (
        <Card accentBorder style={{ gap: tokens.space[1] }}>
          <AppText variant="h3">What happens next</AppText>
          {isSupplier ? (
            <>
              {/* Nobody is collecting from a supplier -- they ship. Saying
                  "collection" here would be false in the one word that
                  matters, right after they've just committed to this total. */}
              <AppText variant="bodySm" tone="secondary">
                Ship it to the Rebin Tech warehouse. We weigh and sort it on
                arrival, and your payout follows within seven days.
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
            </>
          ) : (
            <>
              <AppText variant="bodySm" tone="secondary">
                We&apos;ll be in touch to arrange collection and payment.
              </AppText>
              {/* Shipping labels and payouts are the next two features. Saying so
                  plainly beats a disabled button that implies they exist. */}
              <AppText variant="bodySm" tone="muted">
                Shipping labels and payouts arrive in a coming release.
              </AppText>
            </>
          )}
        </Card>
      ) : null}

      {/* A count that agreed with the offer says nothing here. It is the
          expected outcome, and narrating it would teach the vendor to skim
          past the one card on this screen that ever needs reading. */}
      {outcome && (outcome.reconciliation === "mismatch" || outcome.reconciliation === "resolved") ? (
        <Card accentBorder style={{ gap: tokens.space[1] }}>
          <AppText variant="h3">
            Collected {outcome.actualUnits} of {outcome.expectedUnits}
          </AppText>
          {held ? (
            <>
              <AppText variant="bodySm" tone="secondary">
                That is not the count this offer covered, so payment is on hold while the
                office checks the count with our driver.
              </AppText>
              {/* A hold with no end to it reads as money lost. Naming who is
                  doing the checking, and that it is not the vendor, is the
                  whole difference between a delay and a dispute. */}
              <AppText variant="bodySm" tone="muted">
                Nothing is needed from you — we&apos;ll write as soon as it&apos;s settled.
              </AppText>
            </>
          ) : (
            <>
              <AppText variant="bodySm" tone="secondary">
                The office settled the difference and released the payment.
              </AppText>
              {/* The resolution note is the only account of what happened that
                  anyone will have six weeks later, so it is shown rather than
                  summarised. */}
              <AppText variant="bodySm" tone="muted">{outcome.resolutionNote}</AppText>
            </>
          )}
        </Card>
      ) : null}
    </Screen>
  );
}
