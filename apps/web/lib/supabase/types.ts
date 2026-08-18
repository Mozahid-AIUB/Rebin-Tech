/**
 * The generated schema, re-exported from the package that owns it.
 *
 * Imported from `types.gen` directly rather than from `@rebin/api`'s barrel:
 * that barrel re-exports `client.ts`, which imports AsyncStorage and reads
 * `EXPO_PUBLIC_*` -- pulling React Native into a Next.js bundle. The generated
 * types file has no imports at all, so it crosses the boundary safely.
 */
export type { Database, Json } from "@rebin/api/src/types.gen";

import type { Database } from "@rebin/api/src/types.gen";

export type RequestStatus = Database["public"]["Enums"]["request_status_enum"];
export type AccountStatus = Database["public"]["Enums"]["account_status_enum"];
export type PickupRequest = Database["public"]["Tables"]["pickup_requests"]["Row"];
export type Organization = Database["public"]["Tables"]["organizations"]["Row"];
export type PendingAccount = Database["public"]["Views"]["pending_accounts"]["Row"];

export type DeviceCategory = Database["public"]["Enums"]["device_category_enum"];
export type PriceGrade = Database["public"]["Enums"]["price_grade_enum"];
export type PriceUnit = Database["public"]["Enums"]["price_unit_enum"];
export type PriceCatalogVersion = Database["public"]["Tables"]["price_catalog_versions"]["Row"];
export type PriceItem = Database["public"]["Tables"]["price_items"]["Row"];
