import { useCallback, useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { listCurrentPrices, type Appraisal, type AppraisedLine, type PriceItem } from "@rebin/api";
import { formatCents, formatWeight, GRAMS_PER_LB, lineArithmetic } from "@rebin/shared";
import { AppText, Card, FormField, PillButton, SectionHeader, tokens } from "@rebin/ui";
import { useLoader } from "../../hooks/useLoader";
import { Stepper } from "./Stepper";

/**
 * A quantity times a catalog row's weight and rate, rounded the same way
 * create_quote rounds it: at the line, not at the total.
 */
function priceLine(item: PriceItem, quantity: number): { weightG: number | null; lineTotalCents: number } {
  if (item.avgWeightG == null) {
    return { weightG: null, lineTotalCents: item.unitPriceCents * quantity };
  }
  const weightG = item.avgWeightG * quantity;
  return { weightG, lineTotalCents: Math.round((item.unitPriceCents * weightG) / GRAMS_PER_LB) };
}

/**
 * The business portal's second door.
 *
 * Until this existed the camera was the only way to raise a quote: no gallery
 * picker, no typing. A vendor who declined the camera permission, whose
 * warehouse is too dark to photograph in, or who opened the app while Gemini
 * was down had no way to transact at all -- an entire portal resting on one
 * external service and one hardware permission.
 *
 * The camera stays the headline. This is deliberately the plainer path, and it
 * is offered by name when a scan fails, which is when it is actually wanted.
 *
 * What it is *not* is a way around the catalog. Only the key, grade and
 * quantity are collected here; `create_quote` reads the price from the live
 * catalog on the way in, exactly as it does for a scan. A vendor who could
 * type their own price could set their own payout. There is no grade to pick:
 * catalog v3 has exactly one row per component, priced by weight rather than
 * by condition.
 */
export function ManualEntrySheet({
  visible,
  onClose,
  onDone,
}: {
  visible: boolean;
  onClose: () => void;
  onDone: (appraisal: Appraisal) => void;
}) {
  const insets = useSafeAreaInsets();
  const [catalog, setCatalog] = useState<PriceItem[]>([]);
  const [lines, setLines] = useState<AppraisedLine[]>([]);
  const [picked, setPicked] = useState<PriceItem | null>(null);
  const [quantity, setQuantity] = useState("");

  const { loading, error } = useLoader(
    useCallback(async () => {
      setCatalog(await listCurrentPrices());
    }, []),
  );

  const totalCents = lines.reduce((sum, line) => sum + line.lineTotalCents, 0);
  const count = Number(quantity);
  const canAdd = picked !== null && Number.isInteger(count) && count > 0;

  // Grouped so a vendor scans down the categories they actually hold rather
  // than one flat list of eighteen components.
  const byCategory = useMemo(() => {
    const groups = new Map<string, PriceItem[]>();
    for (const item of catalog) {
      const bucket = groups.get(item.category) ?? [];
      bucket.push(item);
      groups.set(item.category, bucket);
    }
    return [...groups.entries()];
  }, [catalog]);

  function add() {
    if (!picked || !canAdd) return;
    const { weightG, lineTotalCents } = priceLine(picked, count);
    setLines((prev) => [
      ...prev,
      {
        componentKey: picked.componentKey,
        displayName: picked.displayName,
        grade: picked.grade,
        quantity: count,
        // No model ran, so there is nothing to be confident about. See
        // AppraisedLine for why this is not 100.
        confidence: null,
        notes: null,
        unit: picked.unit,
        unitPriceCents: picked.unitPriceCents,
        weightG,
        lineTotalCents,
        source: "manual",
      },
    ]);
    setPicked(null);
    setQuantity("");
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: tokens.color.bg, paddingTop: insets.top }}>
        <ScrollView contentContainerStyle={{ padding: tokens.space[4], gap: tokens.space[3] }}>
          <AppText variant="display">Add items by hand</AppText>
          <AppText variant="bodySm" tone="secondary">
            Pick what you have and how many. Prices are today&apos;s catalog rates, the same ones a
            scan would use.
          </AppText>

          {error ? (
            <Card variant="alt">
              <AppText variant="bodySm" style={{ color: tokens.color.danger }}>
                Couldn&apos;t load the price list. {error}
              </AppText>
            </Card>
          ) : loading ? (
            <AppText variant="body" tone="muted">Loading the price list…</AppText>
          ) : null}

          {lines.length > 0 ? (
            <>
              <SectionHeader title="On this quote" />
              {lines.map((line, index) => (
                <Card key={`${line.componentKey}-${index}`} style={{ gap: tokens.space[1] }}>
                  <View
                    style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}
                  >
                    <AppText variant="h3">{line.displayName}</AppText>
                    <AppText variant="h3" tone="accent">{formatCents(line.lineTotalCents)}</AppText>
                  </View>
                  <AppText variant="bodySm" tone="muted">{lineArithmetic(line)}</AppText>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: tokens.space[3] }}>
                    {/* Correctable here too: a count typed a moment ago is as
                        easy to get wrong as one the model guessed, and having
                        to delete the line to fix a digit is worse. */}
                    <Stepper
                      label={line.displayName}
                      quantity={line.quantity}
                      onChange={(by) =>
                        setLines((prev) =>
                          prev.map((l, i) => {
                            if (i !== index) return l;
                            const quantity = Math.max(1, l.quantity + by);
                            const catalogItem = catalog.find((c) => c.componentKey === l.componentKey);
                            const { weightG, lineTotalCents } = catalogItem
                              ? priceLine(catalogItem, quantity)
                              : { weightG: l.weightG, lineTotalCents: l.unitPriceCents * quantity };
                            return { ...l, quantity, weightG, lineTotalCents };
                          }),
                        )
                      }
                    />
                    <View style={{ flex: 1 }} />
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${line.displayName}`}
                      onPress={() => setLines((prev) => prev.filter((_, i) => i !== index))}
                      style={{ minHeight: 44, justifyContent: "center" }}
                    >
                      <AppText variant="bodySm" style={{ color: tokens.color.danger }}>Remove</AppText>
                    </Pressable>
                  </View>
                </Card>
              ))}
            </>
          ) : null}

          {picked ? (
            <Card accentBorder style={{ gap: tokens.space[2] }}>
              <AppText variant="h3">{picked.displayName}</AppText>
              <AppText variant="bodySm" tone="muted">
                {picked.avgWeightG != null
                  ? `${formatCents(picked.unitPriceCents)} per lb · ~${formatWeight(picked.avgWeightG)} each`
                  : `${formatCents(picked.unitPriceCents)} ${picked.unit === "each" ? "each" : "per lb"}`}
              </AppText>
              <FormField
                label="How many?"
                value={quantity}
                onChangeText={(v) => setQuantity(v.replace(/\D/g, ""))}
                keyboardType="number-pad"
              />
              {canAdd ? (
                <AppText variant="bodySm" tone="accent">
                  {lineArithmetic(
                    (() => {
                      const { weightG, lineTotalCents } = priceLine(picked, count);
                      return { ...picked, quantity: count, weightG, lineTotalCents };
                    })(),
                  )}
                </AppText>
              ) : null}
              <PillButton label="Add to quote" disabled={!canAdd} onPress={add} />
              <PillButton label="Pick something else" variant="ghost" onPress={() => setPicked(null)} />
            </Card>
          ) : (
            byCategory.map(([category, items]) => (
              <View key={category} style={{ gap: tokens.space[1] }}>
                <SectionHeader title={CATEGORY_LABEL[category] ?? category} />
                {items.map((item) => (
                  <Pressable
                    // Keyed on both halves of the catalog's own unique index
                    // (catalog_version_id, component_key, grade). v3 prices
                    // each component once so the key alone is unique today,
                    // but v2 listed every component three times -- and a
                    // client still holding that catalog rendered three
                    // children with the same key. The row's real identity
                    // costs nothing to use and does not depend on which
                    // catalog happens to be loaded.
                    key={`${item.componentKey}:${item.grade}`}
                    accessibilityRole="button"
                    accessibilityLabel={item.displayName}
                    onPress={() => setPicked(item)}
                    style={{
                      minHeight: 52,
                      paddingHorizontal: tokens.space[4],
                      justifyContent: "center",
                      borderRadius: tokens.radius.card,
                      backgroundColor: tokens.color.surface,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <View>
                        <AppText variant="body">{item.displayName}</AppText>
                        {item.avgWeightG != null ? (
                          <AppText variant="bodySm" tone="muted">
                            {`~${formatWeight(item.avgWeightG)} each`}
                          </AppText>
                        ) : null}
                      </View>
                      <AppText variant="body" tone="accent">
                        {item.unit === "lb" ? `${formatCents(item.unitPriceCents)}/lb` : formatCents(item.unitPriceCents)}
                      </AppText>
                    </View>
                  </Pressable>
                ))}
              </View>
            ))
          )}
        </ScrollView>

        <View
          style={{
            padding: tokens.space[4],
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
            // No catalogVersionId: nothing here was priced against a version
            // the way a scan is. create_quote pins the live one on the way in.
            onPress={() => onDone({ items: lines, totalCents, catalogVersionId: null })}
          />
          <PillButton label="Cancel" variant="ghost" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

// The enum values are what the database stores; these are what the vendor
// picked them from.
const CATEGORY_LABEL: Record<string, string> = {
  computers_laptops: "Computers and laptops",
  monitors_displays: "Monitors and displays",
  server_gear: "Server gear",
  copiers_printers: "Copiers and printers",
  batteries_ups: "Batteries and UPS",
  components_parts: "Parts and components",
};
