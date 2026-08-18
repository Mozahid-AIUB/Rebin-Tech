import { createClient } from "@/lib/supabase/server";
import { Empty } from "../../ui";
import { PageIn } from "../../Motion";
import { PriceCatalog } from "./PriceCatalog";

export const dynamic = "force-dynamic";

/**
 * The only screen in this console with real write authority.
 *
 * Reads two tables directly -- `price_catalog_versions` and, for whichever
 * version is selected, `price_items` -- the same way every other screen here
 * reads. All the writing happens through `PriceCatalog`, which calls the RPCs
 * in `actions.ts` one at a time; nothing on this page inserts or updates a
 * row itself.
 */
export default async function PricesPage({
  searchParams,
}: {
  searchParams: Promise<{ version?: string }>;
}) {
  const { version: versionParam } = await searchParams;
  const supabase = await createClient();

  const { data: versions, error: versionsError } = await supabase
    .from("price_catalog_versions")
    .select("id, version, status, note, published_at")
    .order("version", { ascending: false });

  const rows = versions ?? [];

  // The version in the URL if it is real, else the active one, else the
  // newest -- so a bookmark survives a publish and a fresh visit lands
  // somewhere useful even before anything has ever been published.
  const selected =
    rows.find((v) => v.id === versionParam) ??
    rows.find((v) => v.status === "active") ??
    rows[0] ??
    null;

  const { data: items, error: itemsError } = selected
    ? await supabase
        .from("price_items")
        .select("id, component_key, display_name, category, grade, unit, unit_price_cents")
        .eq("catalog_version_id", selected.id)
        .order("category", { ascending: true })
        .order("display_name", { ascending: true })
        .order("grade", { ascending: true })
    : { data: [], error: null };

  const error = versionsError ?? itemsError;

  return (
    <PageIn>
      <div className="admin-head">
        <h1 className="admin-h1">Prices</h1>
        <span className="admin-count">
          {rows.length} version{rows.length === 1 ? "" : "s"}
        </span>
      </div>

      <p className="admin-sub">
        What Rebin pays for each component, by grade. A rate change is a new
        draft: fill it in, then publish -- publishing reprices every quote
        from that moment on and cannot be undone except by publishing again.
      </p>

      {error && <p className="notice">Could not load the catalog: {error.message}</p>}

      {rows.length === 0 && !error ? (
        <Empty
          title="No catalog yet"
          hint="Nothing has been priced. This should not happen outside a fresh database."
        />
      ) : (
        <PriceCatalog versions={rows} selectedId={selected?.id ?? null} items={items ?? []} />
      )}
    </PageIn>
  );
}
