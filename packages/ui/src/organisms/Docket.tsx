import type { ReactNode } from "react";
import { View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { AppText } from "../atoms/AppText";
import { Stamp } from "../atoms/Stamp";
import { tokens } from "../tokens";

/**
 * A printed collection docket.
 *
 * The thing this app is remembered by, and it comes from the business rather
 * than from a style: a chain-of-custody operation hands people dockets, and
 * what a hospital or a vendor actually wants at the end is a piece of paper
 * saying what left the building.
 *
 * Square corners, because paper is. Mono throughout, because every figure on
 * it is a record. Perforated bottom edge, because a docket is torn from a
 * book.
 */

export function Docket({
  title,
  reference,
  date,
  children,
  totalLabel,
  total,
  stampLabel,
  stampTone = "done",
  stampAnimate = false,
}: {
  title: string;
  /** The record's own id, shown in mono, as it is on the paper. */
  reference: string;
  date: string;
  children: ReactNode;
  totalLabel?: string;
  total?: string;
  stampLabel?: string;
  stampTone?: "pending" | "active" | "done" | "dead";
  stampAnimate?: boolean;
}) {
  return (
    <View style={{ ...tokens.elevation.raised }}>
      <View
        style={{
          backgroundColor: tokens.color.surface,
          borderRadius: tokens.radius.docket,
          paddingHorizontal: tokens.space[4],
          paddingTop: tokens.space[4],
          paddingBottom: tokens.space[3],
          gap: tokens.space[2],
        }}
      >
        <AppText variant="label" tone="copper">{title}</AppText>

        <Rule />

        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <AppText variant="data" tone="secondary">{reference}</AppText>
          <AppText variant="data" tone="muted">{date}</AppText>
        </View>

        <View style={{ gap: tokens.space[2], paddingVertical: tokens.space[1] }}>{children}</View>

        {total ? (
          <>
            <Rule />
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
              <AppText variant="label" tone="muted">{totalLabel ?? "TOTAL"}</AppText>
              <AppText variant="figureLg">{total}</AppText>
            </View>
          </>
        ) : null}

        {stampLabel ? (
          <View style={{ alignItems: "center", paddingTop: tokens.space[2] }}>
            <Stamp label={stampLabel} tone={stampTone} animate={stampAnimate} />
          </View>
        ) : null}
      </View>

      <PerforatedEdge />
    </View>
  );
}

/** One line of a docket: quantity, what it is, and what it came to. */
export function DocketLine({
  quantity,
  name,
  qualifier,
  /** Serial or asset tag, when one was legible. The whole point of the record. */
  serial,
  amount,
}: {
  quantity: number;
  name: string;
  qualifier?: string;
  serial?: string | null;
  amount?: string;
}) {
  return (
    <View style={{ gap: 1 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: tokens.space[2] }}>
        <AppText variant="body" style={{ flex: 1 }}>
          <AppText variant="data" tone="muted">{`${quantity} × `}</AppText>
          {name}
        </AppText>
        {qualifier ? <AppText variant="data" tone="muted">{qualifier}</AppText> : null}
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: tokens.space[2] }}>
        <AppText variant="data" tone="copper">{serial ?? "—"}</AppText>
        {amount ? <AppText variant="figure">{amount}</AppText> : null}
      </View>
    </View>
  );
}

function Rule() {
  return <View style={{ height: 1, backgroundColor: tokens.color.divider }} />;
}

/**
 * The torn edge.
 *
 * Drawn rather than dashed-bordered so the notches read as paper rather than
 * as a dotted line: a repeating scallop, the shape a perforation leaves.
 */
function PerforatedEdge() {
  const notch = 10;
  const count = 40;
  const path = Array.from({ length: count }, (_, i) => {
    const x = i * notch;
    return `L ${x} 0 A ${notch / 2} ${notch / 2} 0 0 0 ${x + notch} 0`;
  }).join(" ");

  return (
    <Svg width="100%" height={6} viewBox={`0 0 ${count * notch} 6`} preserveAspectRatio="none">
      <Path d={`M 0 0 ${path} L ${count * notch} 0 L ${count * notch} -6 L 0 -6 Z`} fill={tokens.color.surface} />
    </Svg>
  );
}
