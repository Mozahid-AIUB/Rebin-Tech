import { useCallback, useEffect, useState } from "react";
import { View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { decideQuote, getQuote, type QuoteDetail } from "@rebin/api";
import { formatCents, formatUsDate, scanDisposition } from "@rebin/shared";
import {
  AppText,
  Card,
  PillButton,
  Screen,
  SectionHeader,
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

export default function QuoteDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [quote, setQuote] = useState<QuoteDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmingDecline, setConfirmingDecline] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      setQuote(await getQuote(id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load this quote.");
    } finally {
      setLoading(false);
    }
  }, [id]);

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
        <AppText variant="body" tone={open ? "accent" : "muted"}>{STATUS_LINE[quote.status]}</AppText>
        <AppText variant="bodySm" tone="muted">
          {open
            ? `Quoted ${formatUsDate(quote.createdAt, TZ)} · good until ${formatUsDate(quote.expiresAt, TZ)}`
            : `Quoted ${formatUsDate(quote.createdAt, TZ)}`}
        </AppText>
      </View>

      <SectionHeader title="What we're buying" />
      {quote.items.map((line, index) => (
        <Card key={`${line.componentKey}-${line.grade}-${index}`} style={{ gap: tokens.space[1] }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <AppText variant="h3">{line.displayName}</AppText>
            <AppText variant="h3" tone="accent">{formatCents(line.lineTotalCents)}</AppText>
          </View>
          <AppText variant="bodySm" tone="muted">
            {`${line.quantity} × ${formatCents(line.unitPriceCents)} · ${line.grade}`}
          </AppText>
          {line.notes ? (
            <AppText variant="bodySm" tone="secondary">{line.notes}</AppText>
          ) : null}
          {/* Still worth flagging after the fact: if a grade is disputed on
              collection, this is the line that was uncertain. */}
          {line.confidence !== null && scanDisposition(line.confidence) !== "auto" ? (
            <AppText variant="label" style={{ color: tokens.color.warning }}>
              Graded with low confidence
            </AppText>
          ) : null}
        </Card>
      ))}

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

      {quote.status === "accepted" ? (
        <Card accentBorder style={{ gap: tokens.space[1] }}>
          <AppText variant="h3">What happens next</AppText>
          <AppText variant="bodySm" tone="secondary">
            We&apos;ll be in touch to arrange collection and payment.
          </AppText>
          {/* Shipping labels and payouts are the next two features. Saying so
              plainly beats a disabled button that implies they exist. */}
          <AppText variant="bodySm" tone="muted">
            Shipping labels and payouts arrive in a coming release.
          </AppText>
        </Card>
      ) : null}
    </Screen>
  );
}
