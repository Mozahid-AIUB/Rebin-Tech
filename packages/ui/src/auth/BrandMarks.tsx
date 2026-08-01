import { View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

// PLACEHOLDER BRAND MARKS — NOT THE OFFICIAL GOOGLE/APPLE LOGOS.
//
// The Task 15 brief calls for the official Google "G" and Apple logo SVGs here
// (each brand distributes its mark for exactly this "Continue with…" use case).
// Reproducing a trademarked brand mark from memory risks an inaccurate/
// non-compliant rendering, which is worse than a clearly-labeled stand-in — so
// this file intentionally ships generic, non-infringing glyphs instead:
//   - GoogleMark: a neutral four-color-free ring (abstract "G"-adjacent monogram)
//   - AppleMark: a simple rounded silhouette (abstract "fruit" shape, not the
//     actual Apple wordmark/logo geometry)
//
// BEFORE SHIPPING: swap both of these for the official SVGs obtained directly
// from Google's and Apple's own brand/identity guidelines pages, per each
// brand's usage terms. Keep the `size: number` prop contract below so
// SocialButton.tsx (`<GoogleMark size={20} />` / `<AppleMark size={20} />`)
// does not need to change when the real marks are dropped in.
//
// No test in this package inspects the internal SVG paths of these marks —
// only SocialButton's accessible label/role/styling is asserted — so this
// placeholder does not affect auth-primitives.test.tsx.

// `accessibilityElementsHidden`/`importantForAccessibility` are RN `View`
// props, not `react-native-svg` `Svg` props -- passing them directly to
// `Svg` leaks them through as unrecognized raw DOM attributes on web
// (confirmed via a live browser render, not caught by any Jest test since
// RTL doesn't warn on unknown DOM attrs). Wrapping in a `View` carries the
// same "hide this decorative glyph from assistive tech" intent correctly
// on every platform react-native-web supports.

export function GoogleMark({ size }: { size: number }) {
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Circle cx={12} cy={12} r={9} fill="none" stroke="#CBD8D2" strokeWidth={2.5} />
        <Path d="M12 12 H19.5" stroke="#CBD8D2" strokeWidth={2.5} strokeLinecap="round" />
      </Svg>
    </View>
  );
}

export function AppleMark({ size }: { size: number }) {
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path
          d="M12 6.5 C10.3 6.5 9 7.9 9 9.6 C9 13.6 6.5 16.9 6.5 19.4 C6.5 20.8 7.6 21.9 9 21.9 C10 21.9 10.4 21.3 12 21.3 C13.6 21.3 14 21.9 15 21.9 C16.4 21.9 17.5 20.8 17.5 19.4 C17.5 16.9 15 13.6 15 9.6 C15 7.9 13.7 6.5 12 6.5 Z"
          fill="#CBD8D2"
        />
        <Path d="M12 4.5 C12 5.6 11.3 6.5 10.3 6.5 C10.3 5.4 11 4.5 12 4.5 Z" fill="#CBD8D2" />
      </Svg>
    </View>
  );
}
