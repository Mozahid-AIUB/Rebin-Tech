import { Pressable, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import type { QuoteRow, QuoteStatus } from "@rebin/api";
import { formatCents, formatUsDate } from "@rebin/shared";
import { AppText, Card, tokens } from "@rebin/ui";

function asHref(path: string): Href {
  return path as Href;
}

// Quote status is not request status, so it gets its own badge rather than
// bending StatusBadge's seven pickup states around four quote ones.
const STATUS_META: Record<QuoteStatus, { label: string; fg: string; bg: string }> = {
  offered: { label: "Open", fg: tokens.color.info, bg: "#E8EEF5" },
  accepted: { label: "Accepted", fg: tokens.color.success, bg: tokens.color.primaryLight },
  declined: { label: "Declined", fg: tokens.color.muted, bg: "#F0EFEA" },
  expired: { label: "Expired", fg: tokens.color.muted, bg: "#F0EFEA" },
};

// Quotes are dated in a fixed US zone for the same reason every other list in
// this app is: a date that shifts with the viewer's phone clock is worse than
// one that is consistently US Eastern.
const TZ = "America/New_York";

function daysLeft(expiresAt: string): number {
  return Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86_400_000);
}

/**
 * `estimate` is required, not defaulted, on purpose.
 *
 * A supplier's total is never final until Rebin's scale weighs it in — every
 * other business's is final at accept time. Two earlier commits qualified
 * that number screen by screen and still missed this card, because a default
 * (either way) is a value a caller can silently agree with by typing nothing.
 * Requiring the caller to look up `isSupplier` and pass it makes the omission
 * a type error instead of a silent one.
 */
export function QuoteCard({ quote, estimate }: { quote: QuoteRow; estimate: boolean }) {
  const router = useRouter();
  const meta = STATUS_META[quote.status];
  const remaining = daysLeft(quote.expiresAt);
  const total = formatCents(quote.totalCents);
  const totalLabel = estimate ? `Estimated ${total}` : total;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Quote for ${totalLabel}, ${meta.label}`}
      onPress={() => router.push(asHref(`/(biz)/quote/${quote.id}`))}
    >
      <Card style={{ gap: tokens.space[1] }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <View>
            <AppText variant="h2">{total}</AppText>
            {/* The scale has the final say for a supplier, so the figure this
                card prints in large type cannot stand alone -- it needs the
                same qualifier every other supplier-facing total already
                carries. */}
            {estimate ? (
              <AppText variant="label" tone="muted">Estimated — final price is set when we weigh it</AppText>
            ) : null}
          </View>
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
        <AppText variant="bodySm" tone="muted">
          {`${quote.itemCount} ${quote.itemCount === 1 ? "line" : "lines"} · quoted ${formatUsDate(quote.createdAt, TZ)}`}
        </AppText>
        {/* Only while it can still be taken, and only when the deadline is
            close enough to act on -- a countdown on a declined quote is noise. */}
        {quote.status === "offered" && remaining <= 3 ? (
          <AppText variant="label" style={{ color: tokens.color.warning }}>
            {remaining <= 0 ? "Expires today" : remaining === 1 ? "1 day left" : `${remaining} days left`}
          </AppText>
        ) : null}
      </Card>
    </Pressable>
  );
}
