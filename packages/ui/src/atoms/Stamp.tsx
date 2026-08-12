import { View } from "react-native";
import { AppText } from "./AppText";
import { tokens } from "../tokens";
import { Land } from "../motion";

/**
 * A status, stamped rather than badged.
 *
 * A coloured pill is what every app uses and says nothing about this one. A
 * chain-of-custody business stamps its paperwork, so status here is a boxed
 * mono mark, set slightly off-square the way a hand-pressed stamp lands.
 *
 * The rotation is −2°, not −8°: enough to read as pressed by a person, little
 * enough that nobody thinks the layout broke.
 */

type Tone = "pending" | "active" | "done" | "dead";

const TONE: Record<Tone, { fg: string; border: string; bg: string }> = {
  pending: { fg: tokens.color.warning, border: tokens.color.warning, bg: "transparent" },
  active: { fg: tokens.color.info, border: tokens.color.info, bg: "transparent" },
  done: { fg: tokens.color.success, border: tokens.color.success, bg: "transparent" },
  dead: { fg: tokens.color.muted, border: tokens.color.border, bg: "transparent" },
};

export function Stamp({
  label,
  tone = "pending",
  /** Lands on a spring. Reserved for the moment a job is actually finished. */
  animate = false,
}: {
  label: string;
  tone?: Tone;
  animate?: boolean;
}) {
  const meta = TONE[tone];

  const mark = (
    <View
      accessibilityRole="text"
      accessibilityLabel={label}
      style={{
        alignSelf: "flex-start",
        paddingHorizontal: tokens.space[2],
        paddingVertical: 3,
        borderWidth: 1.5,
        borderColor: meta.border,
        backgroundColor: meta.bg,
        transform: [{ rotate: "-2deg" }],
      }}
    >
      <AppText
        variant="label"
        style={{ color: meta.fg, fontFamily: tokens.type.data.fontFamily, letterSpacing: 1.2 }}
      >
        {label.toUpperCase()}
      </AppText>
    </View>
  );

  return animate ? <Land>{mark}</Land> : mark;
}
