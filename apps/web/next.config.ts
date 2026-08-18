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
    distDir: phase === PHASE_DEVELOPMENT_SERVER ? ".next-dev" : ".next",
  };
}
