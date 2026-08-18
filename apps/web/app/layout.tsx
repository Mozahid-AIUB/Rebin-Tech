import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, IBM_Plex_Sans_Condensed } from "next/font/google";
import { BRAND } from "@rebin/shared";
import "./globals.css";

// The same three faces the app loads, in the same three roles: condensed for
// display, regular for sentences, mono for the data layer. See
// docs/design-direction.md §2 -- the mono is not a mood, it is the lettering
// already printed on every board this company collects.
const display = IBM_Plex_Sans_Condensed({
  weight: ["600", "700"],
  subsets: ["latin"],
  variable: "--font-display",
});
const body = IBM_Plex_Sans({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  variable: "--font-body",
});
const mono = IBM_Plex_Mono({
  weight: ["500", "600"],
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Rebin Tech — free, compliant e-waste recycling",
  description:
    "We collect retired IT equipment across the US, recover what is in it, and hand you a certificate listing every device.",
};

/**
 * The palette, emitted as CSS custom properties from the same object the app
 * reads.
 *
 * Written out here rather than hard-coded in globals.css so there is exactly
 * one place a colour is defined. A stylesheet with its own hex values is how a
 * brand ends up with two greens a few percent apart.
 */
function brandVariables(): string {
  const c = BRAND.color;
  const t = BRAND.type;
  const rem = (px: number) => `${px / 16}rem`;
  return `:root{
    --board:${c.board};--board-deep:${c.boardDeep};--silk:${c.silk};
    --surface:${c.surface};--surface-alt:${c.surfaceAlt};--surface-warm:${c.surfaceWarm};
    --success:${c.success};
    --ink:${c.ink};--ink-2:${c.inkSecondary};--muted:${c.muted};
    --border:${c.border};--divider:${c.divider};
    --copper:${c.copper};--gold:${c.gold};--danger:${c.danger};
    --radius-card:${BRAND.radius.card}px;--radius-button:${BRAND.radius.button}px;
    --size-display:${rem(t.display.size)};--lh-display:${t.display.lineHeight / t.display.size};
    --size-h1:${rem(t.h1.size)};--size-h2:${rem(t.h2.size)};--size-h3:${rem(t.h3.size)};
    --size-body:${rem(t.body.size)};--size-body-sm:${rem(t.bodySm.size)};
    --size-label:${rem(t.label.size)};
  }`;
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    /* `suppressHydrationWarning` covers the `js` class the inline script below
       adds to this element before React hydrates. The mismatch is the point of
       that script -- it has to run before first paint, so the server can never
       have emitted the class -- and without this React logs a hydration error
       on every load for a difference we are causing deliberately. It suppresses
       only this element's own attributes, not anything inside it. */
    <html
      lang="en"
      className={`${display.variable} ${body.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <style dangerouslySetInnerHTML={{ __html: brandVariables() }} />
        {/* Marks the document as scripted before anything paints, so the
            entrance animations can be guarded on it. Without this the page
            hides its own content and depends on JavaScript to give it back --
            and a page that renders blank when a chunk fails to load is not a
            trade-off worth making for a fade. */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
