"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Brings a block up as it reaches the viewport, once.
 *
 * The restraint is the point. Everything that moves on this page moves in the
 * same direction, over the same duration, and never again after it has
 * arrived. Cards that fly in from alternating sides, parallax, counters ticking
 * up on every scroll past -- those read as a template with the effects turned
 * on, which is the opposite of what the client asked for. A page feels
 * expensive when the motion is barely noticed and entirely consistent.
 *
 * `IntersectionObserver` rather than a scroll handler: the browser does the
 * work off the main thread, so nothing here can make scrolling stutter. The
 * observer disconnects after firing, because an element that re-animates every
 * time it passes the fold is a page that will not settle.
 *
 * Reduced motion is respected by checking the query rather than only in CSS --
 * the element must be *visible* immediately in that case, not animated to
 * visible over 1ms, and CSS alone cannot undo an initial opacity of 0.
 */
export function Reveal({
  children,
  delay = 0,
  as: Tag = "div",
  className,
  id,
}: {
  children: React.ReactNode;
  /** Milliseconds, for staggering siblings. Keep under ~200. */
  delay?: number;
  as?: "div" | "section" | "article" | "li";
  className?: string;
  /** Carried through because these blocks are also the nav's scroll targets. */
  id?: string;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [shown, setShown] = useState(false);

  /**
   * A hard stop, in case the observer never runs.
   *
   * The failure this exists for actually happened: a broken dev chunk meant no
   * client JavaScript executed at all, `reveal-in` was never applied, and every
   * section below the hero stayed at opacity 0 -- a blank page with a working
   * server behind it. The `.js` guard in CSS covers the case where scripts
   * never start; this covers the case where they start and then break, which
   * the guard cannot see.
   *
   * A second is long enough that it never fires before a healthy observer and
   * short enough that nobody is left staring at nothing.
   */
  useEffect(() => {
    const failsafe = setTimeout(() => setShown(true), 1000);
    return () => clearTimeout(failsafe);
  }, []);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setShown(true);
        observer.disconnect();
      },
      // Fires a little before the block is fully on screen, so the movement
      // has finished by the time the reader's eye arrives at it.
      { rootMargin: "0px 0px -12% 0px", threshold: 0.05 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      id={id}
      ref={ref as never}
      className={[className, "reveal", shown ? "reveal-in" : ""].filter(Boolean).join(" ")}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </Tag>
  );
}
