import { View } from "react-native";
import type { AppraisedLine } from "@rebin/api";
import { AppText, tokens } from "@rebin/ui";

/**
 * Roughly what is recoverable from a line, under its price.
 *
 * The figures come from the catalog, not from the photograph. Nobody can see
 * the gold content of a laptop in an image -- it is inside a chip, under a
 * heatsink -- and a vision model asked anyway invents a number, differently
 * each time. Looking it up instead means the same laptop photographed twice
 * reads the same twice, which is the only version of this a seller can trust.
 * See 0040_material_content.sql.
 *
 * Shown as an aside rather than a table: it is context for the price, not a
 * second price. Everything here is approximate and says so.
 */
export function MaterialLine({ material }: { material: AppraisedLine["material"] }) {
  if (!material) return null;

  const parts = [
    // Grams below a kilo, kilos above -- "4500 g of steel" is a number to
    // decode, "4.5 kg" is one to read.
    fmtMass(material.copperG, "copper"),
    fmtMass(material.aluminiumG, "aluminium"),
    fmtMass(material.steelG, "steel"),
    fmtGold(material.goldMg),
  ].filter(Boolean);

  // A manually typed line has no catalog row, and a component nobody has
  // recorded figures for has nothing to say. Both render nothing rather than
  // an empty heading.
  if (parts.length === 0) return null;

  return (
    <View style={{ gap: 2 }}>
      <AppText variant="label" tone="muted">
        Roughly recoverable
      </AppText>
      <AppText variant="bodySm" tone="secondary">
        {parts.join(" · ")}
      </AppText>
    </View>
  );
}

/** "180 g copper", or "4.5 kg steel" once it passes a kilo. */
function fmtMass(grams: number | null, label: string): string | null {
  // Null is "not recorded" and must not print; zero is a real measurement
  // (a lead-acid battery genuinely has no recoverable gold) and prints.
  if (grams == null) return null;
  if (grams === 0) return null;
  return grams >= 1000
    ? `${(grams / 1000).toFixed(1)} kg ${label}`
    : `${grams} g ${label}`;
}

/**
 * Gold, in the unit that keeps it legible.
 *
 * Stored in milligrams because a laptop holds about 200 of them and grams
 * would round to zero. Shown in milligrams too, right up until a rack server
 * makes grams the shorter read.
 */
function fmtGold(mg: number | null): string | null {
  if (mg == null || mg === 0) return null;
  return mg >= 1000 ? `${(mg / 1000).toFixed(1)} g gold` : `${mg} mg gold`;
}

/**
 * Rescales a line's material totals when its quantity changes.
 *
 * The figures arrive already multiplied by the count the model gave, so
 * correcting three laptops to five has to carry them along -- otherwise the
 * card shows five laptops' price beside three laptops' copper.
 *
 * Divides by the old count and multiplies by the new rather than storing a
 * per-unit figure, because the per-unit number is the catalog's and this
 * screen should not be a second place it lives.
 */
export function scaleMaterial(
  material: AppraisedLine["material"],
  fromQuantity: number,
  toQuantity: number,
): AppraisedLine["material"] {
  if (!material || fromQuantity <= 0) return material;
  const factor = toQuantity / fromQuantity;
  const scale = (v: number | null) => (v == null ? null : Math.round(v * factor));
  return {
    copperG: scale(material.copperG),
    aluminiumG: scale(material.aluminiumG),
    steelG: scale(material.steelG),
    goldMg: scale(material.goldMg),
  };
}
