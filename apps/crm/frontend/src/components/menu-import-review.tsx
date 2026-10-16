"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  formatInr,
  MENU_IMPORT_LOW_CONFIDENCE,
  type MenuImportJobRow,
  type MenuItemRow,
  updateMenuItem,
} from "@/lib/api";

type Props = {
  job: MenuImportJobRow;
  items: MenuItemRow[];
  restaurantId: string;
  onClose: () => void;
  onSaved: () => void;
};

function isLowConfidence(score: number | null | undefined) {
  return score != null && score < MENU_IMPORT_LOW_CONFIDENCE;
}

export function MenuImportReview({ job, items, restaurantId, onClose, onSaved }: Props) {
  const [rows, setRows] = useState(items);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function markReviewed(item: MenuItemRow) {
    setSavingId(item.id);
    setError(null);
    try {
      const updated = await updateMenuItem(item.id, {
        restaurantId,
        importConfidence: 100,
      });
      setRows((prev) => prev.map((r) => (r.id === item.id ? updated : r)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSavingId(null);
    }
  }

  const lowCount = rows.filter((r) => isLowConfidence(r.importConfidence)).length;

  return (
    <div
      role="dialog"
      aria-labelledby="menu-import-review-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
    >
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-xl">
        <header className="border-b border-border px-4 py-3">
          <h2 id="menu-import-review-title" className="font-semibold">
            Review PDF import
          </h2>
          <p className="text-xs text-foreground/60">
            {job.sourceFilename} · {rows.length} draft row(s)
            {lowCount > 0 ? ` · ${lowCount} need review` : ""}
          </p>
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-2">
          <div
            className="hidden border-r border-border bg-muted/40 p-4 md:block"
            aria-hidden
          >
            <p className="text-xs font-bold uppercase tracking-wide text-foreground/50">Source PDF</p>
            <div className="mt-3 space-y-2 opacity-40">
              <div className="h-3 w-3/4 rounded bg-foreground/20" />
              <div className="h-3 w-full rounded bg-foreground/15" />
              <div className="h-3 w-5/6 rounded bg-foreground/15" />
              <div className="mt-6 h-24 rounded border border-dashed border-foreground/20" />
            </div>
          </div>

          <div className="overflow-y-auto p-4">
            <ul className="space-y-2" data-testid="menu-import-review-rows">
              {rows.map((item) => {
                const low = isLowConfidence(item.importConfidence);
                return (
                  <li
                    key={item.id}
                    className={`rounded-lg border p-3 text-sm ${
                      low ? "border-amber-400 bg-amber-50" : "border-border bg-muted/20"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-xs text-foreground/60">{formatInr(item.pricePaise)} · {item.isVeg ? "Veg" : "Non-veg"}</p>
                        {item.importConfidence != null && (
                          <p className="text-xs text-foreground/50">AI confidence {item.importConfidence}%</p>
                        )}
                      </div>
                      {low && (
                        <span className="rounded-full bg-amber-200 px-2 py-0.5 text-xs font-semibold text-amber-950">
                          Needs review
                        </span>
                      )}
                    </div>
                    {low && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="mt-2"
                        disabled={savingId === item.id}
                        onClick={() => void markReviewed(item)}
                      >
                        {savingId === item.id ? "Saving…" : "Mark reviewed"}
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
            {error && <p className="mt-2 text-xs text-red-700">{error}</p>}
          </div>
        </div>

        <footer className="flex justify-end gap-2 border-t border-border px-4 py-3">
          <Button type="button" variant="outline" onClick={onClose}>
            Done
          </Button>
          <Button
            type="button"
            onClick={() => {
              onSaved();
              onClose();
            }}
          >
            Save &amp; close
          </Button>
        </footer>
      </div>
    </div>
  );
}
