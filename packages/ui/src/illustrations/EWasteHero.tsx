import { useEffect } from "react";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { tokens } from "../tokens";

const AnimatedPath = Animated.createAnimatedComponent(Path);

/**
 * Original illustration for the Portal Select hero: an e-waste bin taking in
 * retired electronics, with a recycling mark and a small "next life" leaf —
 * built from the app's own tokens (not a stock asset) so it always matches
 * the current palette and scales cleanly at any density. The leaf drifts
 * gently to suggest "life" without competing for attention with the copy.
 */
export function EWasteHero({ size = 160 }: { size?: number }) {
  const bob = useSharedValue(0);

  useEffect(() => {
    bob.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
  }, [bob]);

  const leafProps = useAnimatedProps(() => ({
    transform: [{ translateY: -bob.value * 4 }],
  }));

  return (
    <Svg width={size} height={size} viewBox="0 0 160 160" fill="none">
      {/* soft halo */}
      <Circle cx="80" cy="76" r="72" fill={tokens.color.primaryLight} />

      {/* retired monitor, tucked behind the bin */}
      <Rect x="30" y="46" width="46" height="34" rx="4" fill={tokens.color.surface} stroke={tokens.color.border} strokeWidth="2" />
      <Rect x="38" y="54" width="30" height="18" rx="2" fill={tokens.color.surfaceAlt} />

      {/* retired phone, tucked behind the bin */}
      <Rect x="102" y="50" width="22" height="38" rx="4" fill={tokens.color.surface} stroke={tokens.color.border} strokeWidth="2" />
      <Rect x="107" y="57" width="12" height="20" rx="1" fill={tokens.color.surfaceAlt} />

      {/* the bin */}
      <Path
        d="M46 78 H114 L106 138 Q105 144 99 144 H61 Q55 144 54 138 Z"
        fill={tokens.color.primary}
      />
      <Rect x="42" y="70" width="76" height="12" rx="4" fill={tokens.color.primaryDark} />

      {/* recycling mark on the bin */}
      <Path
        d="M80 96 l7 12 h-5 l4 7 -12 -1 5 -8 h-5 z"
        fill={tokens.color.onPrimary}
        opacity={0.95}
      />
      <Circle cx="80" cy="112" r="16" stroke={tokens.color.onPrimary} strokeWidth="2" opacity={0.35} fill="none" />

      {/* a small leaf — the "next life" this device gets, gently drifting */}
      <AnimatedPath
        d="M118 40 C126 34 136 34 140 42 C132 44 126 50 122 58 C116 52 114 44 118 40 Z"
        fill={tokens.color.success}
        animatedProps={leafProps}
      />
    </Svg>
  );
}
