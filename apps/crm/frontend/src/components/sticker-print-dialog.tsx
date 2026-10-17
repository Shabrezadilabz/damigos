"use client";

import { useEffect, useMemo, useState } from "react";
import { MaterialIcon } from "@/components/material-icon";
import { Button } from "@/components/ui/button";
import { StickerPrintTile } from "@/components/sticker-print-tile";
import {
  STICKER_DESIGN_OCCASIONS,
  STICKER_PRINT_DESIGNS,
  filterStickerDesigns,
  type StickerDesignOccasion,
  type StickerPrintDesign,
} from "@/lib/sticker-print-designs";
import { fetchStickerPrintSheet, type StickerPrintSheet } from "@/lib/api";

function StickerSheetPreview({
  sheet,
  design,
}: {
  sheet: StickerPrintSheet;
  design: StickerPrintDesign;
}) {
  return (
    <div className="sticker-print-grid grid grid-cols-2 gap-4 p-2 sm:grid-cols-3 md:grid-cols-4">
      {sheet.stickers.map((s) => (
        <StickerPrintTile
          key={s.scanUrl}
          design={design}
          restaurantName={sheet.restaurantName}
          label={s.label}
          scanUrl={s.scanUrl}
        />
      ))}
    </div>
  );
}

export function StickerPrintDialog({
  open,
  onClose,
  batchId,
  restaurantId,
  batchCode,
}: {
  open: boolean;
  onClose: () => void;
  batchId: string;
  restaurantId: string;
  batchCode: string;
}) {
  const [designId, setDesignId] = useState(1);
  const [occasion, setOccasion] = useState<StickerDesignOccasion | "all">("all");
  const [sheet, setSheet] = useState<StickerPrintSheet | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const filteredDesigns = useMemo(
    () => filterStickerDesigns(STICKER_PRINT_DESIGNS, occasion),
    [occasion],
  );

  const design = useMemo(
    () => STICKER_PRINT_DESIGNS.find((d) => d.id === designId) ?? STICKER_PRINT_DESIGNS[0]!,
    [designId],
  );

  useEffect(() => {
    if (filteredDesigns.some((d) => d.id === designId)) return;
    const first = filteredDesigns[0];
    if (first) setDesignId(first.id);
  }, [filteredDesigns, designId]);

  const previewSample = useMemo(
    () => ({
      restaurantName: sheet?.restaurantName ?? "Your Restaurant",
      label: "TBL-01",
      scanUrl: sheet?.stickers[0]?.scanUrl ?? "https://example.com/s/preview",
    }),
    [sheet],
  );

  useEffect(() => {
    if (!open || !batchId) return;
    setLoading(true);
    setError(null);
    void fetchStickerPrintSheet(batchId, restaurantId, 48)
      .then(setSheet)
      .catch((e) => setError(e instanceof Error ? e.message : "Load failed"))
      .finally(() => setLoading(false));
  }, [open, batchId, restaurantId]);

  if (!open) return null;

  function onPrint() {
    window.print();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-surface-container-lowest shadow-xl">
        <div className="flex items-center justify-between border-b border-outline-variant/40 px-4 py-3">
          <div>
            <h2 className="text-base font-semibold text-on-surface">Print table stickers</h2>
            <p className="text-xs text-on-surface-variant">
              Batch <span className="font-mono font-bold">{batchCode}</span> · tag layouts with your kitchen name, QR
              &amp; barcode
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-surface-container-high">
            <MaterialIcon name="close" className="text-[22px]" />
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4 print:hidden">
          <div>
            <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
              <div className="text-[10px] font-bold uppercase text-on-surface-variant">
                Design library — retail &amp; scan-me tags (
                {occasion === "all"
                  ? STICKER_PRINT_DESIGNS.length
                  : `${filteredDesigns.length} of ${STICKER_PRINT_DESIGNS.length}`}
                )
              </div>
              <div
                className="flex flex-wrap gap-1"
                role="tablist"
                aria-label="Sticker design occasion"
              >
                {STICKER_DESIGN_OCCASIONS.map((opt) => {
                  const active = occasion === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setOccasion(opt.id)}
                      className={`rounded-md px-2 py-1 text-[10px] font-semibold transition-colors ${
                        active
                          ? "bg-primary text-on-primary"
                          : "bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="grid max-h-44 grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-5 md:grid-cols-6">
              {filteredDesigns.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  title={`${d.name} · ${d.occasions.join(", ")}`}
                  onClick={() => setDesignId(d.id)}
                  className={`rounded-lg border-2 bg-surface-container-low p-1 transition-transform hover:scale-[1.02] ${
                    designId === d.id ? "border-primary ring-2 ring-primary/30" : "border-transparent"
                  }`}
                >
                  <StickerPrintTile
                    design={d}
                    restaurantName={previewSample.restaurantName}
                    label={previewSample.label}
                    scanUrl={previewSample.scanUrl}
                    compact
                  />
                  <span className="mt-0.5 block truncate text-center text-[8px] font-semibold text-on-surface-variant">
                    {d.name}
                  </span>
                </button>
              ))}
            </div>
            {filteredDesigns.length === 0 ? (
              <p className="mt-2 text-[11px] text-on-surface-variant">No designs for this filter.</p>
            ) : (
              <p className="mt-2 text-[11px] text-on-surface-variant">
                Selected: {design.name}
                {design.occasions.length > 0
                  ? ` · ${design.occasions.map((o) => STICKER_DESIGN_OCCASIONS.find((x) => x.id === o)?.label ?? o).join(", ")}`
                  : ""}
              </p>
            )}
          </div>

          {loading ? <p className="text-sm text-on-surface-variant">Loading QR codes…</p> : null}
          {error ? <p className="text-sm text-red-700">{error}</p> : null}
          {sheet ? <StickerSheetPreview sheet={sheet} design={design} /> : null}
        </div>

        <div className="flex justify-end gap-2 border-t border-outline-variant/40 px-4 py-3 print:hidden">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={onPrint} disabled={!sheet}>
            <MaterialIcon name="print" className="mr-1 text-[18px]" />
            Print sheet
          </Button>
        </div>

        <div className="hidden print:block">
          {sheet ? <StickerSheetPreview sheet={sheet} design={design} /> : null}
        </div>
      </div>
    </div>
  );
}
