import type { PortalKey } from "@rebin/ui";

export type PortalCopy = {
  key: PortalKey;
  title: string;
  tagline: string;
  badge: string;
  description: string;
  benefits: readonly string[];
  signupRoute: string;
  inviteOnly: boolean;
};

export const PORTAL_CONTENT: Record<PortalKey, PortalCopy> = {
  org: {
    key: "org",
    title: "Organizations",
    tagline: "Zero-Cost Bulk Removal",
    badge: "10+ DEVICE MINIMUM",
    description:
      "For K-12 schools, universities, hospitals, municipal offices, and corporate headquarters that need compliant bulk disposal at no cost.",
    benefits: [
      "Free scheduled pickup from your loading dock",
      "Certificate of Recycling with full device manifest",
      "Serial-level tracking for every data-bearing device",
    ],
    signupRoute: "/signup/organization",
    inviteOnly: false,
  },
  business: {
    key: "business",
    title: "Businesses",
    tagline: "Get Paid for Scrap",
    badge: "AI CAMERA SELF-QUOTE",
    description:
      "For repair shops, IT refurbishers, and local recyclers looking to liquidate component scrap through AI camera quotes and local pickups.",
    benefits: [
      "Instant quotes from a photo — no manual sorting",
      "Prepaid shipping labels for small shipments",
      "Direct ACH payout on settlement",
    ],
    signupRoute: "/signup/business",
    inviteOnly: false,
  },
  agent: {
    key: "agent",
    title: "Field Agents",
    tagline: "Dispatch & Settlement",
    badge: "INVITE ONLY",
    description:
      "For drivers and on-site technicians managing bulk pickup queues, multi-item audits, and instant digital payouts.",
    benefits: [
      "GPS dispatch queue with optimized routing",
      "Continuous multi-scan audit with weight capture",
      "Dual-signature settlement and instant payout",
    ],
    signupRoute: "/signup/agent",
    inviteOnly: true,
  },
};

export const PORTAL_ORDER: readonly PortalKey[] = ["org", "business", "agent"] as const;
