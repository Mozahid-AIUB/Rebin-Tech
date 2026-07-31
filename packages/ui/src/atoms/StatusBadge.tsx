import { View } from "react-native";
import type { RequestStatus } from "@rebin/shared";
import { AppText } from "./AppText";
import { tokens } from "../tokens";

const STATUS_META: Record<RequestStatus, { label: string; fg: string; bg: string }> = {
  pending:      { label: "Pending",      fg: tokens.color.warning, bg: tokens.color.surfaceWarm },
  under_review: { label: "Under Review", fg: tokens.color.warning, bg: tokens.color.surfaceWarm },
  scheduled:    { label: "Scheduled",    fg: tokens.color.info,    bg: "#E8EEF5" },
  dispatched:   { label: "Dispatched",   fg: tokens.color.info,    bg: "#E8EEF5" },
  in_transit:   { label: "In Transit",   fg: tokens.color.info,    bg: "#E8EEF5" },
  completed:    { label: "Completed",    fg: tokens.color.success, bg: tokens.color.primaryLight },
  cancelled:    { label: "Cancelled",    fg: tokens.color.muted,   bg: "#F0EFEA" },
};

export function StatusBadge({ status }: { status: RequestStatus }) {
  const meta = STATUS_META[status];
  return (
    <View
      accessibilityRole="text"
      style={{
        alignSelf: "flex-start",
        paddingHorizontal: tokens.space[2],
        paddingVertical: tokens.space[0] + 2,
        borderRadius: tokens.radius.chip,
        backgroundColor: meta.bg,
      }}
    >
      <AppText variant="label" style={{ color: meta.fg }}>{meta.label}</AppText>
    </View>
  );
}
