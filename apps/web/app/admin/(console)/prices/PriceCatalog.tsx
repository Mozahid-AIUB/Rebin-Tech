"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createPriceDraft,
  publishPriceCatalog,
  setPriceItem,
} from "../../actions";
import { When } from "../../ui";
import {
  CATEGORY_LABEL,
  DEVICE_CATEGORIES,
  formatCents,
  GRADE_LABEL,
  parseDollarsToCents,
  PRICE_GRADES,
  PRICE_UNITS,
  UNIT_LABEL,
} from "@/lib/pricing";
import type {
  DeviceCategory,
  PriceGrade,
  PriceUnit,
} from "@/lib/supabase/types";

type VersionRow = {
  id: string;
  version: number;
  status: string;
  note: string | null;
  published_at: string | null;
};

type ItemRow = {
  id: string;
  component_key: string;
  display_name: string;
  category: DeviceCategory;
  grade: PriceGrade;
  unit: PriceUnit;
  unit_price_cents: number;
};

/** A version's status, as the same dot every other screen uses for state. */
function VersionStatus({ status }: { status: string }) {
  const tone = status === "active" ? "done" : status === "draft" ? "waiting" : "stopped";
  const label = status === "active" ? "Active" : status === "draft" ? "Draft" : "Retired";
  return (
    <span className="status" data-tone={tone}>
      {label}
    </span>
  );
}

export function PriceCatalog({
  versions,
  selectedId,
  items,
}: {
  versions: VersionRow[];
  selectedId: string | null;
  items: ItemRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [draftNote, setDraftNote] = useState("");
  const [showNewDraft, setShowNewDraft] = useState(false);
  const [addingTo, setAddingTo] = useState(false);

  const selected = versions.find((v) => v.id === selectedId) ?? null;
  const isDraft = selected?.status === "draft";

  const grouped = useMemo(() => {
    const byCategory = new Map<DeviceCategory, ItemRow[]>();
    for (const item of items) {
      const list = byCategory.get(item.category) ?? [];
      list.push(item);
      byCategory.set(item.category, list);
    }
    return DEVICE_CATEGORIES.filter((c) => byCategory.has(c)).map((c) => ({
      category: c,
      rows: byCategory.get(c)!,
    }));
  }, [items]);

  function selectVersion(id: string) {
    router.push(`/admin/prices?version=${id}`);
  }

  function startDraft() {
    setError(null);
    startTransition(async () => {
      const result = await createPriceDraft(draftNote.trim() || null);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setShowNewDraft(false);
      setDraftNote("");
      router.push(`/admin/prices?version=${result.versionId}`);
      router.refresh();
    });
  }

  function saveItem(input: {
    componentKey: string;
    displayName: string;
    category: DeviceCategory;
    grade: PriceGrade;
    unit: PriceUnit;
    unitPriceCents: number;
  }) {
    if (!selected) return;
    setError(null);
    startTransition(async () => {
      const result = await setPriceItem({ versionId: selected.id, ...input });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setAddingTo(false);
      router.refresh();
    });
  }

  function publish() {
    if (!selected) return;
    setError(null);
    startTransition(async () => {
      const result = await publishPriceCatalog(selected.id);
      if (!result.ok) {
        setError(result.message);
        setConfirming(false);
        return;
      }
      setConfirming(false);
      router.refresh();
    });
  }

  return (
    <div className="prices-layout">
      <aside className="prices-versions">
        <div className="panel-title" style={{ margin: 0, border: "none", padding: 0 }}>
          Versions
        </div>
        <ul className="version-list">
          {versions.map((v) => (
            <li key={v.id}>
              <button
                type="button"
                className="version-item"
                data-selected={v.id === selectedId}
                onClick={() => selectVersion(v.id)}
              >
                <span className="version-num">v{v.version}</span>
                <VersionStatus status={v.status} />
                <span className="version-date">
                  {v.published_at ? <When value={v.published_at} /> : <span className="cell-dim">Unpublished</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>

        {!showNewDraft ? (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            style={{ width: "100%" }}
            disabled={pending}
            onClick={() => setShowNewDraft(true)}
          >
            Start a draft from this
          </button>
        ) : (
          <div className="draft-start">
            <label htmlFor="draft-note">Note (optional)</label>
            <input
              id="draft-note"
              type="text"
              value={draftNote}
              onChange={(e) => setDraftNote(e.target.value)}
              placeholder="Why this draft exists"
              disabled={pending}
            />
            <div className="btn-row">
              <button type="button" className="btn btn-primary btn-sm" disabled={pending} onClick={startDraft}>
                Create draft
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={pending}
                onClick={() => {
                  setShowNewDraft(false);
                  setDraftNote("");
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </aside>

      <section className="prices-items">
        {error && <p className="notice">{error}</p>}

        {selected ? (
          <>
            <div className="admin-head" style={{ marginBottom: "0.875rem" }}>
              <h2 className="admin-h1" style={{ fontSize: "1.125rem" }}>
                v{selected.version} items
              </h2>
              <span className="admin-count">{items.length} priced</span>
              {isDraft && (
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  style={{ marginLeft: "auto" }}
                  disabled={pending || items.length === 0}
                  title={items.length === 0 ? "Add at least one item before publishing." : undefined}
                  onClick={() => setConfirming(true)}
                >
                  Publish
                </button>
              )}
            </div>

            {selected.note && <p className="admin-sub" style={{ margin: "-0.5rem 0 1.25rem" }}>{selected.note}</p>}

            {/* The RPC refuses an empty catalog outright (a quote priced at
                nothing reads as a working $0 offer, not a misconfiguration),
                so this is caught before the click rather than after -- the
                title attribute alone is easy to miss on a disabled button. */}
            {isDraft && items.length === 0 && (
              <p className="notice">
                This draft has no items yet. Add at least one before it can be published.
              </p>
            )}

            {grouped.length === 0 && !addingTo ? (
              <p className="cell-dim" style={{ padding: "1rem 0" }}>
                Nothing priced in this version yet.
              </p>
            ) : (
              grouped.map(({ category, rows }) => (
                <div key={category} className="table-wrap" style={{ marginBottom: "1rem" }}>
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th colSpan={isDraft ? 6 : 5}>{CATEGORY_LABEL[category]}</th>
                      </tr>
                      <tr>
                        <th>Component</th>
                        <th>Grade</th>
                        <th>Unit</th>
                        <th>Price</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((item) =>
                        isDraft ? (
                          <EditableRow key={item.id} item={item} onSave={saveItem} pending={pending} />
                        ) : (
                          <tr key={item.id}>
                            <td className="cell-name">{item.display_name}</td>
                            <td>{GRADE_LABEL[item.grade]}</td>
                            <td>{UNIT_LABEL[item.unit]}</td>
                            <td className="cell-mono">{formatCents(item.unit_price_cents)}</td>
                            <td />
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                </div>
              ))
            )}

            {isDraft &&
              (addingTo ? (
                <NewItemForm onSave={saveItem} onCancel={() => setAddingTo(false)} pending={pending} />
              ) : (
                <button type="button" className="btn btn-ghost btn-sm" disabled={pending} onClick={() => setAddingTo(true)}>
                  Add item
                </button>
              ))}
          </>
        ) : (
          <p className="cell-dim">Select a version.</p>
        )}
      </section>

      {confirming && selected && (
        <PublishConfirm
          version={selected.version}
          itemCount={items.length}
          replaces={versions.find((v) => v.status === "active")?.version ?? null}
          pending={pending}
          onConfirm={publish}
          onCancel={() => setConfirming(false)}
        />
      )}
    </div>
  );
}

/** One item's row, editable in place: name, grade, unit, price. */
function EditableRow({
  item,
  onSave,
  pending,
}: {
  item: ItemRow;
  onSave: (input: {
    componentKey: string;
    displayName: string;
    category: DeviceCategory;
    grade: PriceGrade;
    unit: PriceUnit;
    unitPriceCents: number;
  }) => void;
  pending: boolean;
}) {
  const [displayName, setDisplayName] = useState(item.display_name);
  const [unit, setUnit] = useState<PriceUnit>(item.unit);
  const [price, setPrice] = useState((item.unit_price_cents / 100).toFixed(2));
  const [priceError, setPriceError] = useState(false);
  const [dirty, setDirty] = useState(false);

  function commit() {
    const cents = parseDollarsToCents(price);
    if (cents === null || cents < 0) {
      setPriceError(true);
      return;
    }
    setPriceError(false);
    onSave({
      componentKey: item.component_key,
      displayName: displayName.trim() || item.display_name,
      category: item.category,
      // Not the edited state -- there isn't one. `set_price_item` upserts on
      // (catalog_version_id, component_key, grade), so grade is the third
      // part of this row's identity, same as componentKey and category
      // above it: changing it would not reclassify the row, it would fork a
      // second one and leave this one behind as stale, unnoticed pricing.
      // Reclassifying a component's grade is adding a new item, which
      // `NewItemForm` already does with a real, editable grade selector.
      grade: item.grade,
      unit,
      unitPriceCents: cents,
    });
    setDirty(false);
  }

  return (
    <tr>
      <td>
        <input
          className="cell-input"
          value={displayName}
          disabled={pending}
          onChange={(e) => {
            setDisplayName(e.target.value);
            setDirty(true);
          }}
        />
      </td>
      {/* Grade is part of this row's identity in the database, not an
          editable field -- see the comment in commit() above. Shown as
          plain text, at the same weight a read-only version's row uses, so
          an operator can still tell what it is without it inviting a click. */}
      <td>{GRADE_LABEL[item.grade]}</td>
      <td>
        <select
          className="cell-input"
          value={unit}
          disabled={pending}
          onChange={(e) => {
            setUnit(e.target.value as PriceUnit);
            setDirty(true);
          }}
        >
          {PRICE_UNITS.map((u) => (
            <option key={u} value={u}>
              {UNIT_LABEL[u]}
            </option>
          ))}
        </select>
      </td>
      <td>
        <input
          className="cell-input cell-input-price"
          value={price}
          disabled={pending}
          aria-invalid={priceError}
          onChange={(e) => {
            setPrice(e.target.value);
            setPriceError(false);
            setDirty(true);
          }}
          placeholder="0.00"
        />
        {priceError && <span className="price-error">Enter a price of 0 or more, like 12.50</span>}
      </td>
      <td className="cell-actions">
        <button type="button" className="btn btn-ghost btn-sm" disabled={pending || !dirty} onClick={commit}>
          Save
        </button>
      </td>
    </tr>
  );
}

/** A blank row for a brand-new component key, in the shape `EditableRow` writes back. */
function NewItemForm({
  onSave,
  onCancel,
  pending,
}: {
  onSave: (input: {
    componentKey: string;
    displayName: string;
    category: DeviceCategory;
    grade: PriceGrade;
    unit: PriceUnit;
    unitPriceCents: number;
  }) => void;
  onCancel: () => void;
  pending: boolean;
}) {
  const [componentKey, setComponentKey] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [category, setCategory] = useState<DeviceCategory>("computers_laptops");
  const [grade, setGrade] = useState<PriceGrade>("working");
  const [unit, setUnit] = useState<PriceUnit>("each");
  const [price, setPrice] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);

  function submit() {
    const key = componentKey.trim();
    const name = displayName.trim();
    if (!key || !name) {
      setFieldError("A component key and a display name are both required.");
      return;
    }
    const cents = parseDollarsToCents(price);
    if (cents === null || cents < 0) {
      setFieldError("Enter a price of 0 or more, like 12.50.");
      return;
    }
    setFieldError(null);
    onSave({ componentKey: key, displayName: name, category, grade, unit, unitPriceCents: cents });
  }

  return (
    <div className="panel new-item">
      <h3 className="panel-title">New item</h3>
      {fieldError && <p className="notice">{fieldError}</p>}
      <div className="new-item-grid">
        <div className="field">
          <label htmlFor="ni-key">Component key</label>
          <input
            id="ni-key"
            value={componentKey}
            disabled={pending}
            onChange={(e) => setComponentKey(e.target.value)}
            placeholder="e.g. laptop"
          />
        </div>
        <div className="field">
          <label htmlFor="ni-name">Display name</label>
          <input
            id="ni-name"
            value={displayName}
            disabled={pending}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="e.g. Laptop"
          />
        </div>
        <div className="field">
          <label htmlFor="ni-category">Category</label>
          <select
            id="ni-category"
            value={category}
            disabled={pending}
            onChange={(e) => setCategory(e.target.value as DeviceCategory)}
          >
            {DEVICE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABEL[c]}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="ni-grade">Grade</label>
          <select id="ni-grade" value={grade} disabled={pending} onChange={(e) => setGrade(e.target.value as PriceGrade)}>
            {PRICE_GRADES.map((g) => (
              <option key={g} value={g}>
                {GRADE_LABEL[g]}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="ni-unit">Unit</label>
          <select id="ni-unit" value={unit} disabled={pending} onChange={(e) => setUnit(e.target.value as PriceUnit)}>
            {PRICE_UNITS.map((u) => (
              <option key={u} value={u}>
                {UNIT_LABEL[u]}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="ni-price">Price</label>
          <input
            id="ni-price"
            value={price}
            disabled={pending}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="0.00"
          />
        </div>
      </div>
      <div className="btn-row">
        <button type="button" className="btn btn-primary btn-sm" disabled={pending} onClick={submit}>
          Add item
        </button>
        <button type="button" className="btn btn-ghost btn-sm" disabled={pending} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

/**
 * The one modal in this console.
 *
 * Publishing reprices every future quote and cannot be undone except by
 * publishing another version, so this names exactly what is about to happen:
 * which version, how many items, and what it replaces.
 */
function PublishConfirm({
  version,
  itemCount,
  replaces,
  pending,
  onConfirm,
  onCancel,
}: {
  version: number;
  itemCount: number;
  replaces: number | null;
  pending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="modal-backdrop" role="presentation" onClick={() => !pending && onCancel()}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="publish-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="publish-title" className="panel-title" style={{ border: "none", padding: 0 }}>
          Publish v{version}?
        </h2>
        <p>
          This makes v{version} ({itemCount} item{itemCount === 1 ? "" : "s"}) the live catalog
          {replaces !== null ? `, retiring v${replaces}` : ""}. Every quote from this moment prices
          against it. This cannot be undone -- only replaced by publishing another version.
        </p>
        <div className="btn-row" style={{ justifyContent: "flex-end" }}>
          <button type="button" className="btn btn-ghost btn-sm" disabled={pending} onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary btn-sm" disabled={pending} onClick={onConfirm}>
            Publish v{version}
          </button>
        </div>
      </div>
    </div>
  );
}
