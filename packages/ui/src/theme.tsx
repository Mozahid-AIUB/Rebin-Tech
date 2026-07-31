import { createContext, useContext, useMemo, type ReactNode } from "react";
import { PORTAL_ACCENTS, PORTAL_ACCENTS_SUBTLE, type PortalKey } from "./tokens";

type PortalTheme = { portal: PortalKey; accent: string; accentSubtle: string };

export const PortalThemeContext = createContext<PortalTheme | null>(null);

export function PortalThemeProvider({ portal, children }: { portal: PortalKey; children: ReactNode }) {
  const value = useMemo<PortalTheme>(
    () => ({ portal, accent: PORTAL_ACCENTS[portal], accentSubtle: PORTAL_ACCENTS_SUBTLE[portal] }),
    [portal],
  );
  return <PortalThemeContext.Provider value={value}>{children}</PortalThemeContext.Provider>;
}

export function usePortalTheme(): PortalTheme {
  const ctx = useContext(PortalThemeContext);
  if (!ctx) throw new Error("usePortalTheme must be used within a PortalThemeProvider");
  return ctx;
}
