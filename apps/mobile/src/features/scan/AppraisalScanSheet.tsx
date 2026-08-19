import { useState } from "react";
import { Modal, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { appraisePhoto, type Appraisal, type AppraisedLine } from "@rebin/api";
import { formatCents, formatWeight, scanDisposition } from "@rebin/shared";
import { AppText, Card, EmptyState, PillButton, tokens } from "@rebin/ui";
import { capturePhotoForScan } from "./capture";
import { Stepper } from "./Stepper";

// S35-S37. Same camera and the same "one still per subject" flow as the
// organization's inventory sheet, with one decisive difference: every line
// carries a price, and that price comes from the catalog rather than from the
// model (plan §6). The Edge Function attaches it, so nothing here can be
// talked into a different number by a photograph. There is no grade either --
// catalog v3 has exactly one row per component, priced by weight rather than
// by condition, and the Edge Function does that arithmetic before this screen
// ever sees the line.

// Grams per pound. Matches create_quote (0034_weight_pricing.sql) and the
// appraise Edge Function -- so a quantity correction made here lands on the
// same total the RPC would compute for the same quantity.
const GRAMS_PER_LB = 453.59237;

/**
 * Shows the arithmetic behind a total rather than just the total: "12 x 4.4
 * lb = 52.9 lb at $0.80/lb". Falls back to a plain per-item read for a line
 * with no weight, which is still priced per item.
 */
function lineArithmetic(line: { quantity: number; unitPriceCents: number; weightG: number | null }): string {
  if (line.weightG == null) {
    return `${line.quantity} × ${formatCents(line.unitPriceCents)}`;
  }
  const perUnitG = line.weightG / line.quantity;
  return (
    `${line.quantity} × ${formatWeight(perUnitG)} = ${formatWeight(line.weightG)} ` +
    `at ${formatCents(line.unitPriceCents)}/lb`
  );
}

export function AppraisalScanSheet({
  visible,
  onClose,
  onDone,
  onFallback,
}: {
  visible: boolean;
  onClose: () => void;
  onDone: (appraisal: Appraisal) => void;
  /**
   * Hands the vendor over to typing the lot in by hand.
   *
   * Offered only after a photo has actually failed. A dark warehouse, a
   * declined camera permission or a model that will not read the label leaves
   * someone staring at an error with nothing under it but the button that
   * just failed -- the way out belongs where they hit the wall, not on a
   * screen they would have to know to go back to.
   */
  onFallback?: () => void;
}) {
  const [lines, setLines] = useState<AppraisedLine[]>([]);
  const [catalogVersionId, setCatalogVersionId] = useState<string | null>(null);
  const insets = useSafeAreaInsets();
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalCents = lines.reduce((sum, line) => sum + line.lineTotalCents, 0);

  async function onCapture() {
    setError(null);
    const shot = await capturePhotoForScan();
    if (!shot.ok) {
      if (shot.reason === "permission") {
        setError("Camera access is off. Turn it on in Settings to scan your stock.");
      } else if (shot.reason === "failed") {
        setError("Couldn't prepare that photo. Try again.");
      }
      return;
    }

    setScanning(true);
    try {
      const result = await appraisePhoto(shot.photo.base64, shot.photo.mimeType);
      if (result.items.length === 0) {
        setError("Nothing we buy showed up in that photo. Try another angle.");
        return;
      }
      setLines((prev) => [...prev, ...result.items]);
      // Every line in one quote has to be priced against one catalog, so the
      // first scan fixes the version the rest are read against.
      setCatalogVersionId((prev) => prev ?? result.catalogVersionId);
    } catch (e) {
      // Lines already priced stay: losing four confirmed items because the
      // fifth photo failed would be its own bug.
      setError(e instanceof Error ? e.message : "Couldn't read that photo.");
    } finally {
      setScanning(false);
    }
  }

  function removeAt(index: number) {
    setLines((prev) => prev.filter((_, i) => i !== index));
  }

  /**
   * Corrects what the model counted.
   *
   * A photograph of a pallet hides most of a pallet, so the count is the
   * number this screen is most often wrong about -- and it is the number the
   * offer is multiplied by. Without this the only correction available was
   * deleting the line and photographing it again.
   *
   * The unit price is not touched, because it never came from the phone: the
   * line is re-multiplied by the catalog rate the Edge Function attached, and
   * `create_quote` reads that rate again server-side regardless. For a
   * weight-priced line unitPriceCents is a rate per pound, not a price per
   * item, so the weight is re-derived from the per-unit weight this line
   * already carries rather than dropped from the multiplication.
   */
  function adjustAt(index: number, by: 1 | -1) {
    setLines((prev) =>
      prev.map((line, i) => {
        if (i !== index) return line;
        // Floored at one. A line that could reach zero would sit on the quote
        // reading as an item worth nothing rather than an item that is not
        // there -- removing is a separate button for that reason.
        const quantity = Math.max(1, line.quantity + by);
        if (line.weightG == null) {
          return { ...line, quantity, lineTotalCents: line.unitPriceCents * quantity };
        }
        const perUnitG = line.weightG / line.quantity;
        const weightG = Math.round(perUnitG * quantity);
        const lineTotalCents = Math.round((line.unitPriceCents * weightG) / GRAMS_PER_LB);
        return { ...line, quantity, weightG, lineTotalCents };
      }),
    );
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: tokens.color.bg, paddingTop: insets.top }}>
        <ScrollView contentContainerStyle={{ padding: tokens.space[4], gap: tokens.space[3] }}>
          <AppText variant="display">Scan your stock</AppText>
          <AppText variant="bodySm" tone="secondary">
            Photograph what you have. We&apos;ll identify it and price it against today&apos;s
            catalog.
          </AppText>

          <PillButton label="Take a photo" loading={scanning} onPress={() => void onCapture()} />

          {/* A spinner inside a button is easy to miss while someone is
              looking at the thing they just photographed. Reading a label off
              a photo takes a couple of seconds even on a good connection, and
              silence for that long reads as a broken button. */}
          {scanning ? (
            <AppText variant="bodySm" tone="accent" style={{ textAlign: "center" }}>
              Reading the photo…
            </AppText>
          ) : null}

          {error ? (
            <AppText variant="bodySm" style={{ color: tokens.color.danger }}>{error}</AppText>
          ) : null}

          {error && onFallback ? (
            <PillButton
              label="Add them by hand instead"
              variant="secondary"
              onPress={onFallback}
            />
          ) : null}

          {lines.length === 0 ? (
            <EmptyState
              title="Nothing scanned yet"
              body="Photograph a batch and we'll quote it."
            />
          ) : (
            lines.map((line, index) => (
              <Card key={`${line.componentKey}-${index}`} style={{ gap: tokens.space[1] }}>
                <View
                  style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}
                >
                  <AppText variant="h3">{line.displayName}</AppText>
                  <AppText variant="h3" tone="accent">{formatCents(line.lineTotalCents)}</AppText>
                </View>
                <AppText variant="bodySm" tone="muted">{lineArithmetic(line)}</AppText>
                {line.notes ? (
                  <AppText variant="bodySm" tone="secondary">{line.notes}</AppText>
                ) : null}

                {/* An identification the model was unsure of is worth real
                    money, so it is called out to be argued with rather than
                    accepted. A null confidence is a hand-typed line -- there
                    was no model to doubt, so there is nothing here to check. */}
                {line.confidence !== null && scanDisposition(line.confidence) !== "auto" ? (
                  <AppText variant="label" style={{ color: tokens.color.warning }}>
                    Check this one
                  </AppText>
                ) : null}

                <View style={{ flexDirection: "row", alignItems: "center", gap: tokens.space[3] }}>
                  <Stepper
                    label={line.displayName}
                    quantity={line.quantity}
                    onChange={(by) => adjustAt(index, by)}
                  />
                  <View style={{ flex: 1 }} />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${line.displayName}`}
                    onPress={() => removeAt(index)}
                    style={{ minHeight: 44, justifyContent: "center" }}
                  >
                    <AppText variant="bodySm" style={{ color: tokens.color.danger }}>Remove</AppText>
                  </Pressable>
                </View>
              </Card>
            ))
          )}
        </ScrollView>

        <View
          style={{
            padding: tokens.space[4],
            // The system navigation bar sits under this one; without the inset
            // the last button is half of one.
            paddingBottom: insets.bottom + tokens.space[4],
            gap: tokens.space[2],
            borderTopWidth: 1,
            borderTopColor: tokens.color.divider,
            backgroundColor: tokens.color.surface,
          }}
        >
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <AppText variant="body" tone="muted">Estimated offer</AppText>
            <AppText variant="display">{formatCents(totalCents)}</AppText>
          </View>
          <PillButton
            label={lines.length === 0 ? "Use this quote" : `Use this quote · ${formatCents(totalCents)}`}
            disabled={lines.length === 0}
            onPress={() => onDone({ items: lines, totalCents, catalogVersionId })}
          />
          <PillButton label="Cancel" variant="ghost" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}
