import type { ReactNode } from "react";
import { View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import { authTokens } from "../tokens";
import { AppText } from "../atoms/AppText";
import { BotanicalBackdrop } from "./BotanicalBackdrop";

export function AuthScreen({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: authTokens.bg }}>
      <LinearGradient
        colors={[authTokens.bg, authTokens.bgDeep]}
        style={{ position: "absolute", inset: 0 }}
      />
      <BotanicalBackdrop />
      <KeyboardAwareScrollView
        bottomOffset={24}
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: insets.top + 32,
          paddingBottom: insets.bottom + 24,
          paddingHorizontal: 24,
          gap: 16,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View entering={FadeInDown.duration(320)} style={{ gap: 6, marginBottom: 8 }}>
          <AppText variant="display" style={{ color: authTokens.text }}>{title}</AppText>
          {subtitle ? (
            <AppText variant="body" style={{ color: authTokens.muted }}>{subtitle}</AppText>
          ) : null}
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(320).delay(60)} style={{ gap: 12 }}>
          {children}
        </Animated.View>

        {footer ? (
          <Animated.View entering={FadeInDown.duration(320).delay(120)} style={{ marginTop: "auto", gap: 12 }}>
            {footer}
          </Animated.View>
        ) : null}
      </KeyboardAwareScrollView>
    </View>
  );
}
