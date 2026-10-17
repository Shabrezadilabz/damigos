"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { MaterialIcon } from "@/components/material-icon";
import { MenuAvailabilityToggle } from "@/components/menu-availability-toggle";
import { fetchMenuItems, updateMenuItem, type MenuItemRow } from "@/lib/api";
import { cn } from "@/lib/utils";

function formatInr(paise: number) {
  return `₹${(paise / 100).toFixed(paise % 100 === 0 ? 0 : 2)}`;
}

/** Kitchen-facing list to 86 / restore live menu items without leaving the board. */
export function KitchenMenuStockPanel({ restaurantId }: { restaurantId: string }) {
  const [items, setItems] = useState<MenuItemRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "on" | "off">("all");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchMenuItems(restaurantId, false);
      setItems(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load menu");
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((i) => {
      if (filter === "on" && !i.available) return false;
      if (filter === "off" && i.available) return false;
      if (!q) return true;
      return i.name.toLowerCase().includes(q) || (i.description?.toLowerCase().includes(q) ?? false);
    });
  }, [items, search, filter]);

  const offCount = items.filter((i) => !i.available).length;

  async function toggle(item: MenuItemRow, available: boolean) {
    setBusyId(item.id);
    setError(null);
    try {
      const updated = await updateMenuItem(item.id, { restaurantId, available });
      setItems((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div
      className="rounded-xl bg-surface-container-lowest p-4 shadow-[0_2px_8px_-2px_rgba(28,28,28,0.04)]"
      data-testid="kitchen-menu-stock-panel"
    >
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-on-surface">Menu stock / 86</h2>
          <p className="text-xs text-on-surface-variant">
            Turn items off for guests — they stay here so you can turn them back on.
            {offCount > 0 ? ` · ${offCount} 86'd` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="flex items-center gap-1.5 rounded-lg bg-surface-container-low px-3 py-1.5 text-xs font-semibold text-on-surface-variant hover:bg-surface-container-high"
        >
          <MaterialIcon name="sync" className="text-[16px]" />
          Refresh
        </button>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search items…"
          className="min-w-[180px] flex-1 rounded-lg border border-outline-variant/40 bg-surface-container-low px-3 py-2 text-sm"
        />
        <div className="flex rounded-lg bg-surface-container-low p-0.5">
          {(
            [
              ["all", "All"],
              ["on", "On"],
              ["off", "86'd"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setFilter(id)}
              className={cn(
                "rounded-md px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide",
                filter === id
                  ? "bg-surface-container-lowest text-primary shadow-sm"
                  : "text-on-surface-variant",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? <p className="text-sm text-on-surface-variant">Loading menu…</p> : null}
      {error ? <p className="mb-2 text-sm text-red-700">{error}</p> : null}

      {!loading && filtered.length === 0 ? (
        <p className="text-sm text-on-surface-variant">No items match.</p>
      ) : null}

      <ul className="divide-y divide-outline-variant/30">
        {filtered.map((item) => (
          <li
            key={item.id}
            className={cn(
              "flex items-center justify-between gap-3 py-2.5",
              !item.available && "bg-amber-50/60",
            )}
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-on-surface">{item.name}</p>
              <p className="text-[11px] text-on-surface-variant">
                {formatInr(item.pricePaise)}
                {!item.available ? (
                  <span className="ml-2 font-semibold text-amber-800">86&apos;d — off guest menu</span>
                ) : (
                  <span className="ml-2 text-on-surface-variant/80">On guest menu</span>
                )}
              </p>
            </div>
            <MenuAvailabilityToggle
              checked={item.available}
              disabled={busyId === item.id}
              onChange={(v) => void toggle(item, v)}
              aria-label={`Toggle ${item.name}`}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
