import { View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { authTokens } from "../tokens";

const LEAF = "M0 60 C 20 40, 40 20, 60 0 C 48 26, 30 46, 0 60 Z";

export function BotanicalBackdrop() {
  return (
    <View pointerEvents="none" style={{ position: "absolute", inset: 0, opacity: 0.06 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width="100%" height="100%" viewBox="0 0 400 800">
        <Path d={LEAF} fill={authTokens.primary} transform="translate(-10 700) scale(2.4)" />
        <Path d={LEAF} fill={authTokens.primary} transform="translate(330 660) scale(-1.8 1.8)" />
        <Path d={LEAF} fill={authTokens.primary} transform="translate(20 620) scale(1.4)" />
      </Svg>
    </View>
  );
}
