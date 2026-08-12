import { useEffect, useState, type ReactNode } from "react";
import { Pressable, View, type PressableProps, type ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { tokens } from "./tokens";

/**
 * Motion earns its place by confirming a touch, orienting you to what changed,
 * or revealing structure. Anything else is decoration, and decoration is what
 * makes an app feel cheap rather than expensive
 * (docs/design-direction.md §5).
 *
 * Every helper here respects `useReducedMotion`: transforms go instant, only
 * opacity survives. None of them block input -- a spring mid-flight accepts a
 * new touch.
 */

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * A press that answers the finger before the network does.
 *
 * The single highest-value animation in the app: every tap gets a reply in
 * under a frame, whatever the request behind it is doing.
 */
export function PressableScale({
  children,
  style,
  disabled,
  ...rest
}: PressableProps & { children: ReactNode; style?: ViewStyle }) {
  const pressed = useSharedValue(0);
  const reduced = useReducedMotion();

  const animated = useAnimatedStyle(() => ({
    transform: [{ scale: reduced ? 1 : 1 - pressed.value * 0.03 }],
    opacity: 1 - pressed.value * (reduced ? 0.15 : 0.06),
  }));

  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      onPressIn={(e) => {
        pressed.value = withSpring(1, tokens.motion.pressSpring);
        rest.onPressIn?.(e);
      }}
      onPressOut={(e) => {
        pressed.value = withSpring(0, tokens.motion.pressSpring);
        rest.onPressOut?.(e);
      }}
      style={[style, animated]}
    >
      {children}
    </AnimatedPressable>
  );
}

/**
 * Rises and fades in, offset by its position in a row or list.
 *
 * Orientation, not ornament: a staggered row draws the eye across it once, in
 * reading order, which is exactly what a stat row or a fresh list needs.
 */
export function Enter({
  index = 0,
  children,
  style,
}: {
  index?: number;
  children: ReactNode;
  style?: ViewStyle;
}) {
  const progress = useSharedValue(0);
  const reduced = useReducedMotion();

  useEffect(() => {
    progress.value = withDelay(
      index * tokens.motion.stagger,
      withTiming(1, { duration: tokens.motion.settle }),
    );
  }, [index, progress]);

  const animated = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: reduced ? 0 : (1 - progress.value) * 10 }],
  }));

  return <Animated.View style={[style, animated]}>{children}</Animated.View>;
}

/**
 * Lands from slightly oversize, once, on a spring.
 *
 * Reserved for the stamp on a finished job -- the emotional peak of the
 * product, and the one flourish that is earned.
 */
export function Land({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const progress = useSharedValue(0);
  const reduced = useReducedMotion();

  useEffect(() => {
    progress.value = reduced
      ? withTiming(1, { duration: tokens.motion.instant })
      : withSpring(1, { damping: 12, stiffness: 220, mass: 0.8 });
  }, [progress, reduced]);

  const animated = useAnimatedStyle(() => ({
    opacity: Math.min(1, progress.value * 1.4),
    // Overshoots past 1 and settles back, the way something stamped does.
    transform: [{ scale: reduced ? 1 : 0.85 + progress.value * 0.15 }],
  }));

  return <Animated.View style={[style, animated]}>{children}</Animated.View>;
}

/**
 * Counts a number up from zero.
 *
 * A figure that climbs registers; one that is simply present does not. Used
 * on stat tiles and quote totals, where the number is the message.
 *
 * Returns a plain number rather than driving a shared value into text: React
 * Native cannot animate text content on the UI thread, and a 500ms JS interval
 * at 30fps is imperceptibly different here while staying far simpler.
 */
export function useCountUp(target: number, enabled = true): number {
  const reduced = useReducedMotion();
  const animate = enabled && !reduced && target !== 0;
  const [value, setValue] = useState(animate ? 0 : target);

  useEffect(() => {
    if (!animate) {
      setValue(target);
      return;
    }

    const started = Date.now();
    const id = setInterval(() => {
      const elapsed = Date.now() - started;
      if (elapsed >= tokens.motion.count) {
        setValue(target);
        clearInterval(id);
        return;
      }
      // Ease-out: quick at first, easing into the real figure, so the last
      // digits settle rather than snapping.
      const t = elapsed / tokens.motion.count;
      setValue(Math.round(target * (1 - Math.pow(1 - t, 3))));
    }, 33);

    return () => clearInterval(id);
  }, [target, animate]);

  return value;
}

/** A hairline that draws itself left to right. Used under a section heading. */
export function DrawIn({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const progress = useSharedValue(0);
  const reduced = useReducedMotion();

  useEffect(() => {
    progress.value = withTiming(1, { duration: tokens.motion.settle });
  }, [progress]);

  const animated = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scaleX: reduced ? 1 : progress.value }],
  }));

  return (
    <Animated.View style={[{ transformOrigin: "left" }, style, animated]}>
      <View>{children}</View>
    </Animated.View>
  );
}
