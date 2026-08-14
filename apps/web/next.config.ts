import type { NextConfig } from "next";

const config: NextConfig = {
  // The workspace packages ship raw TypeScript (`"main": "src/index.ts"`, no
  // build step), so Next has to compile them itself rather than expecting
  // published JavaScript.
  transpilePackages: ["@rebin/shared"],
  typedRoutes: true,
};

export default config;
