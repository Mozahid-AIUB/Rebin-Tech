import { View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { authTokens } from "../tokens";

/**
 * The Rebin mark for pre-auth screens: a recycling turn drawn as a leaf.
 *
 * Deliberately geometric rather than illustrative -- it has to hold up at 44px
 * inside a badge, where any finer detail turns to mud. Uses the dark-forest
 * auth palette only, so it sits on the auth backdrop without a light plate
 * behind it (a white logo tile on a dark screen is the single loudest thing on
 * the page, which is exactly what we're avoiding here).
 */
export function RebinMark({ size = 44 }: { size?: number }) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.3,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: authTokens.surface,
        borderWidth: 1,
        borderColor: authTokens.border,
      }}
    >
      <Svg width={size * 0.55} height={size * 0.55} viewBox="0 0 24 24" fill="none">
        {/* Leaf body */}
        <Path
          d="M20 4C11 4 5 8 5 15a7 7 0 0 0 1.2 4C9 12 14 9 19 8c-4 2.5-7.5 6-9.5 11.5C16 20.5 20 16 20 4Z"
          fill={authTokens.primary}
        />
        {/* Stem, drawn in the link green so the mark reads as two-tone at size */}
        <Path
          d="M6.2 20.5C7.5 16 10.5 12.4 15 10"
          stroke={authTokens.link}
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </Svg>
    </View>
  );
}
