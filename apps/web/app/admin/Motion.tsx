"use client";

import { motion, useReducedMotion, type Variants } from "motion/react";

/**
 * The console's motion vocabulary.
 *
 * One spring, used everywhere. The characteristic feel of a well-made
 * interface is not that it animates -- it is that everything animates the
 * same way, so the surface behaves like one physical material rather than a
 * collection of separately tuned effects.
 *
 * These numbers are a critically-damped-ish spring: it arrives quickly,
 * overshoots by a hair, and settles without ringing. A duration-and-easing
 * tween cannot do that, which is why this is worth a dependency.
 */
const SPRING = { type: "spring" as const, stiffness: 420, damping: 34, mass: 0.9 };

/** Rows and tiles enter in sequence, close enough together to read as one move. */
export const listVariants: Variants = {
  hidden: {},
  shown: {
    transition: { staggerChildren: 0.035, delayChildren: 0.02 },
  },
};

export const itemVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  shown: { opacity: 1, y: 0, transition: SPRING },
};

/**
 * A group whose children arrive in sequence.
 *
 * `useReducedMotion` is checked here rather than in CSS because the transform
 * is applied by JavaScript: a `prefers-reduced-motion` media query cannot
 * reach it. When the preference is set the children are simply rendered in
 * their final state.
 */
export function Stagger({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const still = useReducedMotion();

  return (
    <motion.div
      className={className}
      variants={listVariants}
      initial={still ? false : "hidden"}
      animate="shown"
    >
      {children}
    </motion.div>
  );
}

/** One member of a Stagger. */
export function StaggerItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div className={className} variants={itemVariants}>
      {children}
    </motion.div>
  );
}

/**
 * A page's content, arriving as one.
 *
 * Deliberately not a stagger: a whole screen that cascades on every
 * navigation is the thing that makes an interface feel slow to someone using
 * it forty times a day. The screen arrives at once; only lists stagger, and
 * only on first paint.
 */
export function PageIn({ children }: { children: React.ReactNode }) {
  const still = useReducedMotion();

  return (
    <motion.div
      initial={still ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...SPRING, stiffness: 380 }}
    >
      {children}
    </motion.div>
  );
}

/**
 * A number that counts to its value.
 *
 * Only used on the overview tiles, and only when the value is non-zero: a
 * zero that animates is drawing attention to the absence of work.
 */
export function Tally({ value }: { value: number }) {
  const still = useReducedMotion();

  if (still || value === 0) return <>{value}</>;

  return (
    <motion.span
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...SPRING, delay: 0.06 }}
    >
      {value}
    </motion.span>
  );
}
