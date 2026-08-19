import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

// `next dev` and `next build` both default to `.next`. Running the build while
// a dev server is up rewrites that directory underneath it, and the dev server
// then serves HTML whose stylesheet it no longer has -- the page renders with
// no CSS and no error, which reads as "the site is broken" rather than "two
// processes fought over a folder". Verifying the web app with
// `pnpm --filter web build` is routine here, so this collision was routine too.
//
// Giving dev its own directory removes the collision. Builds keep writing
// `.next`, so `next start`, Vercel, and every deploy path are untouched.
export default function config(phase: string): NextConfig {
  return {
    // The workspace packages ship raw TypeScript (`"main": "src/index.ts"`, no
    // build step), so Next has to compile them itself rather than expecting
    // published JavaScript.
    transpilePackages: ["@rebin/shared"],
    typedRoutes: true,

    /**
     * Headers the browser enforces on our behalf.
     *
     * The console's real gate is the staff check in its layout and the role
     * check inside every RPC. These cover the attacks that route around a
     * login rather than through it -- chiefly clickjacking, where another
     * site frames the console and an operator's click lands on a control
     * they cannot see.
     */
    async headers() {
      return [
        {
          source: "/:path*",
          headers: [
            // Nothing here is ever meant to be framed, by anyone.
            { key: "X-Frame-Options", value: "DENY" },
            { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
            // Stops a browser second-guessing a Content-Type, which is how a
            // served file becomes an executed script.
            { key: "X-Content-Type-Options", value: "nosniff" },
            // A console URL can carry a request id or a business name in its
            // path; neither belongs in the Referer header of an outbound link.
            { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
            // This product asks for none of these. Saying so denies them to
            // anything embedded that might.
            {
              key: "Permissions-Policy",
              value: "camera=(), microphone=(), geolocation=(), payment=()",
            },
          ],
        },
        {
          // Belt and braces on the console itself: a page an operator is
          // signed into should not be cached by an intermediary, and should
          // never be offered to a search engine even if robots.txt is missed.
          source: "/admin/:path*",
          headers: [
            { key: "X-Robots-Tag", value: "noindex, nofollow" },
            { key: "Cache-Control", value: "no-store, max-age=0" },
          ],
        },
      ];
    },
    distDir: phase === PHASE_DEVELOPMENT_SERVER ? ".next-dev" : ".next",
  };
}
