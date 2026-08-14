"use client";

import { useEffect } from "react";

/**
 * Gives the sticky bar a shadow once there is content beneath it.
 *
 * A bar sitting at the very top of a page casts a shadow from nothing, which is
 * the small wrongness that makes a header look pasted on. It also tightens by a
 * few pixels, so scrolling gives back a little of the screen.
 *
 * A class toggle rather than inline styles, so the transition stays in the
 * stylesheet with every other duration on the page. `passive: true` because
 * this listener never calls preventDefault, and saying so lets the browser
 * scroll without waiting to find out.
 */
export function NavShadow() {
  useEffect(() => {
    const nav = document.querySelector(".nav");
    if (!nav) return;

    // Read in a rAF rather than on the event itself: a scroll handler that
    // reads layout on every tick is the classic way to make a page stutter.
    let queued = false;
    const onScroll = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        nav.classList.toggle("nav-scrolled", window.scrollY > 8);
        queued = false;
      });
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return null;
}
