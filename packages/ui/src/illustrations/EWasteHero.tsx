import { useEffect } from "react";
import Svg, { Circle, Ellipse, Path, Rect } from "react-native-svg";
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
 * Original illustration for the Portal Select hero: a monitor and laptop
 * flanking a recycling bin on a soft podium, with a phone tucked in front
 * — built entirely from the app's own tokens (not a stock asset) so it
 * always matches the current palette and scales cleanly at any density.
 * Deliberately fewer, larger shapes than a literal "pile of devices" so it
 * still reads clearly at small sizes (nav icons, list rows).
 */
export function EWasteHero({ size = 200 }: { size?: number }) {
  const bob = useSharedValue(0);

  useEffect(() => {
    bob.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
  }, [bob]);

  const leafProps = useAnimatedProps(() => ({
    transform: [{ translateY: -bob.value * 4 }],
  }));

  return (
    <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
      {/* soft halo */}
      <Circle cx="100" cy="92" r="92" fill={tokens.color.primaryLight} />

      {/* podium */}
      <Ellipse cx="100" cy="168" rx="72" ry="12" fill={tokens.color.surfaceAlt} />

      {/* monitor, back left — simple, upright, no clutter inside */}
      <Rect x="32" y="66" width="58" height="42" rx="5" fill={tokens.color.surface} stroke={tokens.color.border} strokeWidth="2.5" />
      <Rect x="40" y="74" width="42" height="26" rx="2" fill={tokens.color.primaryDark} />
      <Rect x="54" y="108" width="14" height="10" fill={tokens.color.surface} stroke={tokens.color.border} strokeWidth="2" />
      <Rect x="46" y="118" width="30" height="4" rx="2" fill={tokens.color.border} />

      {/* CPU tower, back right — tall box with a visible drive bay and power button, unambiguous */}
      <Rect x="130" y="56" width="34" height="66" rx="4" fill={tokens.color.surface} stroke={tokens.color.border} strokeWidth="2.5" />
      <Circle cx="147" cy="66" r="4" stroke={tokens.color.border} strokeWidth="2" fill="none" />
      <Rect x="137" y="78" width="20" height="4" rx="2" fill={tokens.color.border} />
      <Rect x="137" y="88" width="20" height="4" rx="2" fill={tokens.color.border} />
      <Rect x="137" y="98" width="20" height="4" rx="2" fill={tokens.color.border} />

      {/* phone, small, back-left of the bin's footprint, drawn before the bin so it tucks behind it */}
      <Rect x="32" y="132" width="20" height="34" rx="4" fill={tokens.color.surface} stroke={tokens.color.border} strokeWidth="2.5" />
      <Rect x="37" y="139" width="10" height="18" rx="1" fill={tokens.color.surfaceAlt} />

      {/* keyboard, drawn before the bin so it sits tucked at the bin's base */}
      <Rect x="60" y="150" width="60" height="20" rx="3" fill={tokens.color.surface} stroke={tokens.color.border} strokeWidth="2.5" />
      <Rect x="67" y="156" width="6" height="4" rx="1" fill={tokens.color.border} />
      <Rect x="77" y="156" width="6" height="4" rx="1" fill={tokens.color.border} />
      <Rect x="87" y="156" width="6" height="4" rx="1" fill={tokens.color.border} />
      <Rect x="97" y="156" width="6" height="4" rx="1" fill={tokens.color.border} />
      <Rect x="107" y="156" width="6" height="4" rx="1" fill={tokens.color.border} />
      <Rect x="67" y="163" width="46" height="4" rx="1" fill={tokens.color.border} />

      {/* the bin, front and center, drawn last so it overlaps the phone/keyboard behind it */}
      <Path
        d="M64 108 H136 L126 172 Q125 178 118 178 H82 Q75 178 74 172 Z"
        fill={tokens.color.primary}
      />
      <Rect x="58" y="98" width="84" height="14" rx="5" fill={tokens.color.primaryDark} />
      <Path
        d="M100 122 l8 14 h-6 l5 8 -14 -1 6 -9 h-6 z"
        fill={tokens.color.onPrimary}
      />

      {/* a leaf drifting above the bin — the "next life" this device gets */}
      <AnimatedPath
        d="M140 40 C150 32 162 32 168 42 C158 45 150 52 145 62 C137 56 135 46 140 40 Z"
        fill={tokens.color.success}
        animatedProps={leafProps}
      />
    </Svg>
  );
}
