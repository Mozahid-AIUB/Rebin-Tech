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
 * Original illustration for the Portal Select hero: a cluster of retired
 * devices (laptop, monitor, tower, phone, keyboard, mouse, battery) on a
 * podium, spilling into a recycling bin — built entirely from the app's own
 * tokens (not a stock asset) so it always matches the current palette and
 * scales cleanly at any density. The leaf drifts gently to suggest "life"
 * without competing for attention with the copy around it.
 */
export function EWasteHero({ size = 220 }: { size?: number }) {
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
    <Svg width={size} height={size} viewBox="0 0 220 220" fill="none">
      {/* soft halo */}
      <Circle cx="110" cy="96" r="98" fill={tokens.color.primaryLight} />

      {/* podium */}
      <Ellipse cx="110" cy="186" rx="86" ry="14" fill={tokens.color.surfaceAlt} />
      <Ellipse cx="110" cy="182" rx="86" ry="14" fill={tokens.color.surface} stroke={tokens.color.border} strokeWidth="1.5" />

      {/* laptop, left, angled open */}
      <Rect x="18" y="120" width="62" height="42" rx="3" fill={tokens.color.surface} stroke={tokens.color.border} strokeWidth="2" />
      <Rect x="23" y="125" width="52" height="30" rx="2" fill={tokens.color.primaryDark} />
      <Path d="M23 155 h52 l3 -1" stroke={tokens.color.success} strokeWidth="0" fill="none" />
      <Path d="M12 162 h72 l6 8 h-84 z" fill={tokens.color.surfaceAlt} stroke={tokens.color.border} strokeWidth="1.5" />

      {/* tower / desktop unit, back right */}
      <Rect x="152" y="76" width="34" height="86" rx="4" fill={tokens.color.surface} stroke={tokens.color.border} strokeWidth="2" />
      <Circle cx="169" cy="90" r="4" fill={tokens.color.border} />
      <Rect x="159" y="104" width="20" height="3" rx="1.5" fill={tokens.color.border} />
      <Rect x="159" y="112" width="20" height="3" rx="1.5" fill={tokens.color.border} />

      {/* monitor, behind the bin, screen showing a leaf */}
      <Rect x="70" y="46" width="72" height="52" rx="4" fill={tokens.color.surface} stroke={tokens.color.border} strokeWidth="2" />
      <Rect x="78" y="54" width="56" height="36" rx="2" fill={tokens.color.primaryDark} />
      <Path
        d="M104 78 C100 66, 112 62, 118 68 C112 70, 108 74, 106 80 C102 78, 100 76, 104 78 Z"
        fill={tokens.color.success}
      />
      <Rect x="98" y="98" width="16" height="10" fill={tokens.color.border} />
      <Rect x="88" y="108" width="36" height="4" rx="2" fill={tokens.color.border} />

      {/* the bin, front and center, overlapping the devices */}
      <Path
        d="M76 118 H144 L134 176 Q133 182 126 182 H94 Q87 182 86 176 Z"
        fill={tokens.color.primary}
      />
      <Rect x="70" y="110" width="80" height="12" rx="4" fill={tokens.color.primaryDark} />
      <Path
        d="M110 130 l7 12 h-5 l4 7 -12 -1 5 -8 h-5 z"
        fill={tokens.color.onPrimary}
        opacity={0.95}
      />

      {/* phone, front-left of the bin */}
      <Rect x="52" y="140" width="20" height="36" rx="4" fill={tokens.color.surface} stroke={tokens.color.border} strokeWidth="2" />
      <Rect x="56" y="146" width="12" height="20" rx="1" fill={tokens.color.surfaceAlt} />

      {/* keyboard, front */}
      <Rect x="66" y="168" width="46" height="14" rx="2" fill={tokens.color.surface} stroke={tokens.color.border} strokeWidth="1.5" />

      {/* mouse, front-right */}
      <Path d="M148 160 q10 -6 10 6 v10 q0 6 -10 6 q-10 0 -10 -6 v-10 q0 -12 10 -6z" fill={tokens.color.surface} stroke={tokens.color.border} strokeWidth="1.5" />

      {/* battery, right side */}
      <Rect x="180" y="126" width="16" height="34" rx="3" fill={tokens.color.surface} stroke={tokens.color.border} strokeWidth="2" />
      <Rect x="185" y="120" width="6" height="6" fill={tokens.color.border} />
      <Path d="M186 135 l-4 7 h4 l-3 6" stroke={tokens.color.warning} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />

      {/* a small leaf drifting above the bin — the "next life" this device gets */}
      <AnimatedPath
        d="M150 40 C160 32 172 32 178 42 C168 45 160 52 155 62 C147 56 145 46 150 40 Z"
        fill={tokens.color.success}
        animatedProps={leafProps}
      />
    </Svg>
  );
}
