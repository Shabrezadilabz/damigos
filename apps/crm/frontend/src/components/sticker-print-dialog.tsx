"use client";

import { useEffect, useMemo, useState } from "react";
import { MaterialIcon } from "@/components/material-icon";
import { Button } from "@/components/ui/button";
import { StickerPrintTile } from "@/components/sticker-print-tile";
import { STICKER_PRINT_DESIGNS, type StickerPrintDesign } from "@/lib/sticker-print-designs";
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
  const [sheet, setSheet] = useState<StickerPrintSheet | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const design = useMemo(
    () => STICKER_PRINT_DESIGNS.find((d) => d.id === designId) ?? STICKER_PRINT_DESIGNS[0]!,
    [designId],
  );

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
            <div className="mb-2 text-[10px] font-bold uppercase text-on-surface-variant">
              Design library — retail &amp; scan-me tags ({STICKER_PRINT_DESIGNS.length})
            </div>
            <div className="grid max-h-44 grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-5 md:grid-cols-6">
              {STICKER_PRINT_DESIGNS.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  title={d.name}
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
            <p className="mt-2 text-[11px] text-on-surface-variant">Selected: {design.name}</p>
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
