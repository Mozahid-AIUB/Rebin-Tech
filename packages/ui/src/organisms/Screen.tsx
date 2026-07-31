import type { ReactNode } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { tokens } from "../tokens";

export function Screen({
  children,
  footer,
  scroll = true,
}: {
  children: ReactNode;
  footer?: ReactNode;
  scroll?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const body = (
    <View style={{ padding: tokens.space[4], gap: tokens.space[4], paddingBottom: tokens.space[7] }}>
      {children}
    </View>
  );
  return (
    <View style={{ flex: 1, backgroundColor: tokens.color.bg, paddingTop: insets.top }}>
      {scroll ? <ScrollView keyboardShouldPersistTaps="handled">{body}</ScrollView> : body}
      {footer ? (
        <View
          style={{
            padding: tokens.space[4],
            paddingBottom: insets.bottom + tokens.space[3],
            borderTopWidth: 1,
            borderTopColor: tokens.color.divider,
            backgroundColor: tokens.color.surface,
          }}
        >
          {footer}
        </View>
      ) : null}
    </View>
  );
}
