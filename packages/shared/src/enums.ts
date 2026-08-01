export const ROLES = [
  "platform_owner", "platform_ops", "platform_finance", "platform_support",
  "org_owner", "org_admin", "org_requester",
  "biz_owner", "biz_staff",
  "field_agent", "field_lead",
] as const;
export type Role = (typeof ROLES)[number];

export const SCOPE_TYPES = ["platform", "organization", "business", "self"] as const;
export type ScopeType = (typeof SCOPE_TYPES)[number];

export const ACCOUNT_STATUSES = ["pending_verification", "active", "suspended", "rejected", "archived"] as const;
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

export const REQUEST_STATUSES = ["pending", "under_review", "scheduled", "dispatched", "in_transit", "completed", "cancelled"] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export const ORG_TYPES = ["k12_school", "university", "hospital", "municipal_office", "corporate_hq", "other"] as const;
export type OrgType = (typeof ORG_TYPES)[number];

export const BUSINESS_TYPES = ["repair_shop", "electronics_retailer", "scrap_dealer", "it_reseller", "refurbisher", "other"] as const;
export type BusinessType = (typeof BUSINESS_TYPES)[number];

/** How an agent covers pickups. Drives routing, so it's a fixed set, not free text. */
export const AGENT_VEHICLES = ["car", "van", "box_truck", "none"] as const;
export type AgentVehicle = (typeof AGENT_VEHICLES)[number];

export const DEVICE_CATEGORIES = ["computers_laptops", "monitors_displays", "server_gear", "copiers_printers", "batteries_ups"] as const;
export type DeviceCategory = (typeof DEVICE_CATEGORIES)[number];

export const SIZE_TIER_VALUES = ["tier_10_30", "tier_30_100", "tier_100_300", "tier_300_plus"] as const;
export type SizeTier = (typeof SIZE_TIER_VALUES)[number];

export type SizeTierMeta = {
  value: SizeTier;
  label: string;
  subtitle: string;
  min: number;
  max: number | null;
  defaultCount: number;
};

export const SIZE_TIERS: readonly SizeTierMeta[] = [
  { value: "tier_10_30",   label: "10 – 30 Devices",      subtitle: "Small Office / Single Classroom",   min: 10,  max: 30,   defaultCount: 25 },
  { value: "tier_30_100",  label: "30 – 100 Devices",     subtitle: "Department / Floor Clearance",      min: 30,  max: 100,  defaultCount: 60 },
  { value: "tier_100_300", label: "100 – 300 Devices",    subtitle: "Building / Multi-Department Overhaul", min: 100, max: 300, defaultCount: 200 },
  { value: "tier_300_plus",label: "300+ / Full Pallets",  subtitle: "Enterprise / Campus Bulk Clearance", min: 300, max: null, defaultCount: 400 },
] as const;

export const MIN_PICKUP_UNITS = 10;
