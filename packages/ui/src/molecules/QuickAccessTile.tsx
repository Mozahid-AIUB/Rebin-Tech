import type { ComponentType } from "react";
import { Pressable, View, type ColorValue } from "react-native";
import { AppText } from "../atoms/AppText";
import { tokens } from "../tokens";
import { usePortalTheme } from "../theme";

/**
 * A square shortcut to somewhere else in the portal.
 *
 * Only for destinations that exist. A grid is read as a map of the product, so
 * a tile that opens nothing tells the user the app is broken rather than
 * unfinished.
 */
export function QuickAccessTile({
  label,
  Icon,
  onPress,
}: {
  label: string;
  Icon: ComponentType<{ color: ColorValue }>;
  onPress: () => void;
}) {
  const { accent, accentSubtle } = usePortalTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        minHeight: 88,
        gap: tokens.space[1],
        alignItems: "center",
        justifyContent: "center",
        padding: tokens.space[2],
        borderRadius: tokens.radius.card,
        borderWidth: 1,
        borderColor: tokens.color.border,
        backgroundColor: pressed ? accentSubtle : tokens.color.surface,
      })}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 12,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: accentSubtle,
        }}
      >
        <Icon color={accent} />
      </View>
      <AppText variant="bodySm">{label}</AppText>
    </Pressable>
  );
}

export function QuickAccessRow({ children }: { children: React.ReactNode }) {
  return <View style={{ flexDirection: "row", gap: tokens.space[2] }}>{children}</View>;
}
