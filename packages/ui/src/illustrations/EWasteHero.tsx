import { useEffect } from "react";
import Svg, {
  Defs,
  Ellipse,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from "react-native-svg";
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
 * Original illustration for the Portal Select hero: retired devices grouped
 * on a lit podium around a recycling bin sprouting leaves.
 *
 * Built entirely from the app's own tokens (not a stock asset) so it always
 * matches the palette and stays crisp at any density. Depth comes from
 * layered gradients, contact shadows, and specular highlights rather than a
 * raster render — SVG can't do photoreal 3D, so this leans into a clean,
 * dimensional product-shot look instead.
 */
export function EWasteHero({ size = 220 }: { size?: number }) {
  const bob = useSharedValue(0);

  useEffect(() => {
    bob.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 1600, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
  }, [bob]);

  const leafProps = useAnimatedProps(() => ({
    transform: [{ translateY: -bob.value * 5 }],
  }));

  return (
    <Svg width={size} height={size} viewBox="0 0 220 220" fill="none">
      <Defs>
        {/* ambient glow behind the whole scene */}
        <RadialGradient id="glow" cx="50%" cy="45%" r="55%">
          <Stop offset="0%" stopColor={tokens.color.primaryLight} stopOpacity="1" />
          <Stop offset="100%" stopColor={tokens.color.primaryLight} stopOpacity="0" />
        </RadialGradient>

        {/* the podium the devices sit on */}
        <LinearGradient id="podium" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#FFFFFF" />
          <Stop offset="100%" stopColor={tokens.color.surfaceAlt} />
        </LinearGradient>

        {/* dark device bodies (monitor bezel, tower, phone) */}
        <LinearGradient id="slate" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#3D4A44" />
          <Stop offset="100%" stopColor="#1B2621" />
        </LinearGradient>

        {/* glass screens */}
        <LinearGradient id="screen" x1="10%" y1="0%" x2="90%" y2="100%">
          <Stop offset="0%" stopColor="#2B3833" />
          <Stop offset="55%" stopColor="#161F1B" />
          <Stop offset="100%" stopColor="#22302A" />
        </LinearGradient>

        {/* brushed aluminium laptop base */}
        <LinearGradient id="alu" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#F3F5F2" />
          <Stop offset="100%" stopColor="#C9D2CC" />
        </LinearGradient>

        {/* the bin — lit from the upper left */}
        <LinearGradient id="binBody" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#4E9A6F" />
          <Stop offset="45%" stopColor={tokens.color.primary} />
          <Stop offset="100%" stopColor={tokens.color.primaryDark} />
        </LinearGradient>
        <LinearGradient id="binRim" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#5CA97C" />
          <Stop offset="100%" stopColor={tokens.color.primaryDark} />
        </LinearGradient>

        {/* foliage */}
        <LinearGradient id="leaf" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#6FBF8B" />
          <Stop offset="100%" stopColor="#2F7D4E" />
        </LinearGradient>
      </Defs>

      {/* ambient glow */}
      <Rect x="0" y="0" width="220" height="220" fill="url(#glow)" />

      {/* podium: back plate then top face, so the devices read as standing on it */}
      <Ellipse cx="110" cy="176" rx="92" ry="17" fill={tokens.color.primaryLight} opacity={0.55} />
      <Ellipse cx="110" cy="172" rx="88" ry="15" fill="url(#podium)" />

      {/* ---- back row ------------------------------------------------------ */}

      {/* monitor */}
      <Ellipse cx="103" cy="150" rx="34" ry="5" fill="#16241C" opacity={0.1} />
      <Rect x="66" y="60" width="74" height="56" rx="6" fill="url(#slate)" />
      <Rect x="71" y="65" width="64" height="42" rx="3" fill="url(#screen)" />
      {/* screen sheen */}
      <Path d="M71 100 L106 65 h18 L84 107 h-13z" fill="#FFFFFF" opacity={0.05} />
      <Rect x="96" y="116" width="14" height="12" fill="#2A352F" />
      <Rect x="84" y="127" width="38" height="6" rx="3" fill="url(#slate)" />

      {/* tower */}
      <Ellipse cx="164" cy="152" rx="18" ry="4" fill="#16241C" opacity={0.1} />
      <Rect x="146" y="76" width="36" height="74" rx="5" fill="url(#slate)" />
      <Rect x="152" y="84" width="24" height="3" rx="1.5" fill="#5A6862" opacity={0.7} />
      <Rect x="152" y="91" width="24" height="3" rx="1.5" fill="#5A6862" opacity={0.7} />
      <Rect x="152" y="105" width="10" height="3" rx="1.5" fill="#7FAF9E" />
      {/* left edge highlight */}
      <Rect x="146" y="76" width="3" height="74" rx="1.5" fill="#FFFFFF" opacity={0.12} />

      {/* laptop, lid open, screen facing us */}
      <Ellipse cx="46" cy="156" rx="30" ry="5" fill="#16241C" opacity={0.1} />
      <Rect x="20" y="92" width="52" height="54" rx="4" fill="url(#slate)" />
      <Rect x="25" y="97" width="42" height="42" rx="2" fill="url(#screen)" />
      <Path d="M25 135 L58 97 h9 L37 139 h-12z" fill="#FFFFFF" opacity={0.05} />
      {/* leaf glyph glowing on the laptop screen */}
      <Path
        d="M40 122 c-5 -12 6 -19 14 -14 c-6 3 -10 8 -12 15 c-3 -2 -4 -2 -2 -1z"
        fill="url(#leaf)"
        opacity={0.9}
      />
      <Path d="M14 146 h64 l6 10 h-76z" fill="url(#alu)" />
      <Path d="M14 146 h64 l1 2 h-66z" fill="#FFFFFF" opacity={0.6} />

      {/* ---- the bin ------------------------------------------------------- */}

      {/* leaves sprouting out of the bin, behind the rim */}
      <Path d="M96 96 c-14 -10 -12 -28 2 -32 c4 12 4 22 2 32z" fill="url(#leaf)" />
      <Path d="M110 92 c-6 -16 4 -30 16 -28 c-4 12 -10 20 -16 28z" fill="url(#leaf)" />
      <Path d="M120 98 c8 -12 22 -12 28 -2 c-11 1 -20 5 -28 10z" fill="url(#leaf)" opacity={0.92} />

      {/* body */}
      <Ellipse cx="110" cy="180" rx="40" ry="6" fill="#16241C" opacity={0.14} />
      <Path d="M72 110 H148 L138 174 Q137 181 129 181 H91 Q83 181 82 174 Z" fill="url(#binBody)" />
      {/* vertical sheen down the bin face */}
      <Path d="M86 112 h10 l-7 66 h-9z" fill="#FFFFFF" opacity={0.12} />
      {/* rim */}
      <Rect x="66" y="100" width="88" height="15" rx="7" fill="url(#binRim)" />
      <Rect x="70" y="103" width="80" height="4" rx="2" fill="#FFFFFF" opacity={0.18} />
      {/* recycling mark */}
      <Path
        d="M110 128 l8 14 h-6 l5 8 -15 -1 6 -9 h-6 z"
        fill="#FFFFFF"
        opacity={0.95}
      />

      {/* ---- front row ----------------------------------------------------- */}

      {/* phone */}
      <Ellipse cx="160" cy="172" rx="12" ry="3" fill="#16241C" opacity={0.12} />
      <Rect x="150" y="132" width="21" height="38" rx="5" fill="url(#slate)" />
      <Rect x="153" y="136" width="15" height="30" rx="3" fill="url(#screen)" />
      <Rect x="150" y="132" width="2.5" height="38" rx="1.2" fill="#FFFFFF" opacity={0.12} />

      {/* keyboard */}
      <Ellipse cx="76" cy="176" rx="30" ry="4" fill="#16241C" opacity={0.12} />
      <Path d="M50 160 h54 l6 12 h-66z" fill="url(#slate)" />
      <Path d="M53 162 h48 l4 7 h-56z" fill="#48544E" opacity={0.55} />

      {/* mouse */}
      <Ellipse cx="128" cy="176" rx="11" ry="3" fill="#16241C" opacity={0.12} />
      <Path d="M120 168 q0 -12 8 -12 q8 0 8 12 q0 7 -8 7 q-8 0 -8 -7z" fill="url(#slate)" />
      <Path d="M127 157 h2 v6 h-2z" fill="#6E7B75" opacity={0.8} />

      {/* battery */}
      <Ellipse cx="192" cy="168" rx="10" ry="3" fill="#16241C" opacity={0.12} />
      <Rect x="184" y="128" width="17" height="38" rx="4" fill="url(#slate)" />
      <Rect x="189" y="123" width="7" height="6" rx="2" fill="#5A6862" />
      <Path d="M194 138 l-6 11 h5 l-4 9 9 -13 h-5z" fill="#7FAF9E" />

      {/* drifting leaf, top right */}
      <AnimatedPath
        d="M162 34 c12 -10 26 -8 32 4 c-12 3 -21 10 -27 21 c-9 -7 -11 -18 -5 -25z"
        fill="url(#leaf)"
        animatedProps={leafProps}
      />
    </Svg>
  );
}
