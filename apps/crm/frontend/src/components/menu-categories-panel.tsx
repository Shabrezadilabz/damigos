"use client";

import { useState } from "react";
import {
  assignMenuItemsToCategory,
  createMenuCategory,
  deleteMenuCategory,
  reorderMenuCategories,
  updateMenuCategory,
  type MenuCategoryRow,
} from "@/lib/api";
import { MaterialIcon } from "@/components/material-icon";

type Props = {
  restaurantId: string;
  categories: MenuCategoryRow[];
  /** Items currently ticked in the menu table (bulk assign) */
  checkedIds: string[];
  onChanged: (categories: MenuCategoryRow[]) => void;
  /** Called after items were (re)assigned so the table reloads */
  onItemsAssigned: () => void;
};

/** S2.2 — create / rename / reorder / hide categories and bulk-assign selected items. */
export function MenuCategoriesPanel({
  restaurantId,
  categories,
  checkedIds,
  onChanged,
  onItemsAssigned,
}: Props) {
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [assignTo, setAssignTo] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Category update failed");
    } finally {
      setBusy(false);
    }
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    await run(async () => {
      const created = await createMenuCategory(restaurantId, name);
      onChanged([...categories, created]);
      setNewName("");
    });
  }

  async function onRename(id: string) {
    const name = editName.trim();
    if (!name) return;
    await run(async () => {
      onChanged(await updateMenuCategory(id, { restaurantId, name }));
      setEditingId(null);
    });
  }

  async function onToggleHidden(c: MenuCategoryRow) {
    await run(async () => {
      onChanged(await updateMenuCategory(c.id, { restaurantId, hidden: !c.hidden }));
    });
  }

  async function onMove(index: number, delta: -1 | 1) {
    const target = index + delta;
    if (target < 0 || target >= categories.length) return;
    const ids = categories.map((c) => c.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    await run(async () => {
      onChanged(await reorderMenuCategories(restaurantId, ids));
    });
  }

  async function onDelete(c: MenuCategoryRow) {
    const msg =
      c.itemCount > 0
        ? `Delete "${c.name}"? Its ${c.itemCount} item(s) stay on the menu as uncategorised.`
        : `Delete "${c.name}"?`;
    if (typeof window !== "undefined" && !window.confirm(msg)) return;
    await run(async () => {
      await deleteMenuCategory(restaurantId, c.id);
      onChanged(categories.filter((x) => x.id !== c.id));
      if (c.itemCount > 0) onItemsAssigned();
    });
  }

  async function onAssign() {
    if (!checkedIds.length) return;
    await run(async () => {
      await assignMenuItemsToCategory(restaurantId, checkedIds, assignTo || null);
      onItemsAssigned();
    });
  }

  return (
    <div className="rounded-xl bg-surface-container-lowest p-4 shadow-sm" data-testid="menu-categories-panel">
      <button
        type="button"
        className="flex w-full items-center justify-between text-left"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span className="flex items-center gap-2 text-sm font-bold">
          <MaterialIcon name="category" className="text-[18px] text-primary" />
          Categories
          <span className="rounded-full bg-surface-container px-2 py-0.5 text-[10px] font-semibold text-on-surface-variant">
            {categories.length}
          </span>
        </span>
        <MaterialIcon name={open ? "expand_less" : "expand_more"} className="text-[20px] text-on-surface-variant" />
      </button>

      {open ? (
        <div className="mt-3 flex flex-col gap-3">
          <form onSubmit={(e) => void onCreate(e)} className="flex gap-2">
            <input
              className="min-w-0 flex-1 rounded-lg bg-surface-container-low px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="New category (e.g. Starters, Mains)"
              value={newName}
              maxLength={128}
              onChange={(e) => setNewName(e.target.value)}
              data-testid="menu-category-new-name"
            />
            <button
              type="submit"
              disabled={busy || !newName.trim()}
              className="rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50"
              data-testid="menu-category-add"
            >
              Add
            </button>
          </form>

          {categories.length === 0 ? (
            <p className="text-xs text-on-surface-variant">
              No categories yet — guests see one flat menu until you add some.
            </p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {categories.map((c, i) => (
                <li
                  key={c.id}
                  className="flex items-center gap-2 rounded-lg bg-surface-container-low px-3 py-2"
                  data-testid="menu-category-row"
                >
                  {editingId === c.id ? (
                    <input
                      autoFocus
                      className="min-w-0 flex-1 rounded bg-background px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                      value={editName}
                      maxLength={128}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void onRename(c.id);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                    />
                  ) : (
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                      {c.name}
                      {c.hidden ? (
                        <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-900">
                          Hidden
                        </span>
                      ) : null}
                    </span>
                  )}
                  <span className="text-[11px] tabular-nums text-on-surface-variant">{c.itemCount} items</span>

                  {editingId === c.id ? (
                    <>
                      <button
                        type="button"
                        disabled={busy}
                        className="text-[11px] font-bold text-primary"
                        onClick={() => void onRename(c.id)}
                      >
                        Save
                      </button>
                      <button type="button" className="text-[11px] text-on-surface-variant" onClick={() => setEditingId(null)}>
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        aria-label={`Move ${c.name} up`}
                        disabled={busy || i === 0}
                        className="text-on-surface-variant disabled:opacity-30"
                        onClick={() => void onMove(i, -1)}
                      >
                        <MaterialIcon name="arrow_upward" className="text-[16px]" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Move ${c.name} down`}
                        disabled={busy || i === categories.length - 1}
                        className="text-on-surface-variant disabled:opacity-30"
                        onClick={() => void onMove(i, 1)}
                      >
                        <MaterialIcon name="arrow_downward" className="text-[16px]" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Rename ${c.name}`}
                        disabled={busy}
                        className="text-on-surface-variant"
                        onClick={() => {
                          setEditingId(c.id);
                          setEditName(c.name);
                        }}
                      >
                        <MaterialIcon name="edit" className="text-[16px]" />
                      </button>
                      <button
                        type="button"
                        aria-label={c.hidden ? `Show ${c.name}` : `Hide ${c.name}`}
                        disabled={busy}
                        className="text-on-surface-variant"
                        onClick={() => void onToggleHidden(c)}
                      >
                        <MaterialIcon name={c.hidden ? "visibility_off" : "visibility"} className="text-[16px]" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Delete ${c.name}`}
                        disabled={busy}
                        className="text-red-700"
                        onClick={() => void onDelete(c)}
                      >
                        <MaterialIcon name="delete" className="text-[16px]" />
                      </button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
            <span className="text-xs text-on-surface-variant">
              {checkedIds.length > 0
                ? `Assign ${checkedIds.length} selected item(s) to`
                : "Tick draft items to bulk-assign (or pick a category in the item editor)"}
            </span>
            <select
              className="rounded-lg bg-surface-container-low px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              value={assignTo}
              disabled={checkedIds.length === 0}
              onChange={(e) => setAssignTo(e.target.value)}
              data-testid="menu-category-assign-select"
            >
              <option value="">Uncategorised</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={busy || checkedIds.length === 0}
              className="rounded-lg bg-surface-container-high px-3 py-1.5 text-xs font-semibold hover:bg-surface-container-highest disabled:opacity-50"
              onClick={() => void onAssign()}
              data-testid="menu-category-assign"
            >
              Assign
            </button>
          </div>

          {error ? <p className="text-xs text-red-700">{error}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
