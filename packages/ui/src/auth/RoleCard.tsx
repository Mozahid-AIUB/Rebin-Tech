import type { ReactNode } from "react";
import { Pressable, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { AppText } from "../atoms/AppText";
import { authTokens, FONT } from "../tokens";

/**
 * One selectable role on the signup role picker.
 *
 * Layout is a deliberate hierarchy rather than three same-weight lines: an
 * accent-tinted icon tile anchors the row, the title carries the choice, the
 * "for" line qualifies it, and the three bullets are demoted to fine print so
 * the card is scannable at a glance and readable on a second pass. The accent
 * appears only as a tint (icon tile, bullets, chevron) -- filling the whole
 * card with it would make three cards fight each other and the CTA.
 */
export function RoleCard({
  title,
  audience,
  points,
  accent,
  icon,
  onPress,
}: {
  title: string;
  /** Who this role is for -- one short line under the title. */
  audience: string;
  /** Exactly three; more turns the card into a wall and breaks the rhythm
   * across the stack of cards. */
  points: readonly [string, string, string];
  accent: string;
  icon: ReactNode;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      // The bullets are decorative detail for a sighted scan; the accessible
      // name is the actual decision being made, so a screen-reader user isn't
      // read a nine-line card to choose between three options.
      accessibilityLabel={`${title}. ${audience}`}
      accessibilityHint="Opens sign up for this role"
      onPress={onPress}
      style={({ pressed }) => ({
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: pressed ? accent : authTokens.border,
        backgroundColor: pressed ? authTokens.surfacePressed : authTokens.surface,
      })}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            alignItems: "center",
            justifyContent: "center",
            // 18% tint of the accent: enough to read as "this card's color"
            // without becoming a second solid block competing with the CTA.
            backgroundColor: `${accent}2E`,
          }}
        >
          {icon}
        </View>

        <View style={{ flex: 1, gap: 3 }}>
          <AppText variant="h3" style={{ color: authTokens.text }}>{title}</AppText>
          <AppText variant="bodySm" style={{ color: authTokens.muted }}>{audience}</AppText>
        </View>

        <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
          <Path
            d="M6.5 3.5 L12 9 L6.5 14.5"
            stroke={accent}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </View>

      <View
        // Hidden from assistive tech: already folded into the card's own
        // accessibilityLabel/hint above.
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{
          marginTop: 12,
          paddingTop: 12,
          borderTopWidth: 1,
          borderTopColor: authTokens.border,
          gap: 6,
        }}
      >
        {points.map((point) => (
          <View key={point} style={{ flexDirection: "row", alignItems: "center", gap: 9 }}>
            <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: accent }} />
            <AppText variant="bodySm" style={{ color: authTokens.muted, fontFamily: FONT.medium, flex: 1 }}>
              {point}
            </AppText>
          </View>
        ))}
      </View>
    </Pressable>
  );
}
