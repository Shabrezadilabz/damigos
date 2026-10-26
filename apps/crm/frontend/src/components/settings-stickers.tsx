"use client";

import { useEffect, useMemo, useState } from "react";
import { MaterialIcon } from "@/components/material-icon";
import { Button } from "@/components/ui/button";
import { StickerPrintTile } from "@/components/sticker-print-tile";
import {
  StickerPreviewDialog,
  type StickerPreviewPayload,
} from "@/components/sticker-preview-dialog";
import {
  activateStickerBatch,
  fetchActiveStickerBatches,
  fetchStickerBatches,
  generateStickerBatch,
  type StickerBatchStatusFilter,
  type StickerBatchSummary,
} from "@/lib/api";
import {
  STICKER_DESIGN_OCCASIONS,
  STICKER_PRINT_DESIGNS,
  filterStickerDesigns,
  type StickerDesignOccasion,
} from "@/lib/sticker-print-designs";
import { useCrmRestaurant } from "@/components/use-crm-restaurant";

function daysRemaining(validTo: string): number {
  const ms = new Date(validTo).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}

function useStickerBatches(mode: "active" | "all", statusFilter: StickerBatchStatusFilter) {
  const { restaurantId } = useCrmRestaurant();
  const [batches, setBatches] = useState<StickerBatchSummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  const reload = async () => {
    if (!restaurantId) return;
    const rows =
      mode === "active"
        ? await fetchActiveStickerBatches(restaurantId)
        : await fetchStickerBatches(restaurantId, statusFilter);
    setBatches(rows);
    setError(null);
  };

  useEffect(() => {
    if (!restaurantId) return;
    void reload().catch((e) => setError(e instanceof Error ? e.message : "Load failed"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId, mode, statusFilter]);

  return { restaurantId, batches, error, reload, setError, setBatches };
}

/** Left column — active batch peek + optional activate code from D'aMigo's shipment */
export function SettingsStickersOwnerPeek() {
  const { restaurantId, batches, error, reload, setError } = useStickerBatches("active", "active");
  const [batchCode, setBatchCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const primary = batches[0];

  async function onActivate(e: React.FormEvent) {
    e.preventDefault();
    if (!restaurantId) return;
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const res = await activateStickerBatch(batchCode.trim(), restaurantId);
      setMessage(res.alreadyActive ? "Batch already active." : "Batch activated — scans enabled.");
      setBatchCode("");
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Activate failed");
    } finally {
      setBusy(false);
    }
  }

  if (!restaurantId) {
    return (
      <p className="text-sm text-red-700">
        No restaurant on your account. Log in as owner (seed 9876543210).
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-outline-variant/60 bg-surface-container-lowest p-4 shadow-sm">
      <div className="flex items-center gap-1.5">
        <MaterialIcon name="qr_code_2" className="text-[18px] text-primary" />
        <span className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">
          Live stickers
        </span>
      </div>

      <div className="flex flex-col gap-2.5 rounded-xl bg-surface-container-low p-3.5">
        <div className="text-[10px] font-bold uppercase text-on-surface-variant">Current sequence</div>
        <div className="font-[family-name:var(--font-display)] text-base font-semibold text-on-surface">
          {primary ? `Batch ${primary.batchCode}` : "No active batch yet"}
        </div>
        {primary ? (
          <p className="flex items-center gap-2 text-[11px] text-on-surface-variant">
            <MaterialIcon name="schedule" className="text-[14px] text-[#24963F]" />
            {primary.quantity} units · {daysRemaining(primary.validTo)} days left
            {primary.printRequestedAt ? " · print requested" : ""}
          </p>
        ) : (
          <p className="text-[11px] text-on-surface-variant">
            Generate samples on the right, then send a print request to D'aMigo's.
          </p>
        )}
      </div>

      <form
        onSubmit={(e) => void onActivate(e)}
        className="flex flex-col gap-2.5 rounded-xl bg-surface-container-lowest p-3.5 shadow-sm"
      >
        <span className="text-sm font-semibold text-on-surface">Got stickers from D'aMigo's?</span>
        <p className="text-[11px] leading-relaxed text-on-surface-variant">
          If we shipped a pre-printed pack, enter the batch code on the carton to activate.
        </p>
        <div className="flex gap-2 pt-1">
          <input
            className="h-9 w-full rounded-lg bg-surface-container-low px-3 font-mono text-xs text-on-surface shadow-sm outline-none placeholder:text-on-surface-variant focus:bg-surface-container-lowest"
            placeholder="DAM-XXXX or B-XXXXXXXX"
            value={batchCode}
            onChange={(e) => setBatchCode(e.target.value)}
            data-testid="sticker-activate-input"
          />
          <Button type="submit" className="h-9 shrink-0 px-3" disabled={busy || !batchCode.trim()}>
            Activate
          </Button>
        </div>
      </form>

      {message ? <p className="text-sm text-[#24963F]">{message}</p> : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </div>
  );
}

/** Main Stickers workspace — generate opens preview dialog (samples + send) */
export function SettingsStickersOwnerWorkspace() {
  const { restaurantId, batches, error, reload, setError, setBatches } = useStickerBatches("all", "all");
  const [qty, setQty] = useState(100);
  const [validDays, setValidDays] = useState(12);
  const [notes, setNotes] = useState("");
  const [occasion, setOccasion] = useState<StickerDesignOccasion | "all">("everyday");
  const [designId, setDesignId] = useState(1);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [preview, setPreview] = useState<StickerPreviewPayload | null>(null);

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

  async function onGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!restaurantId) return;
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const res = await generateStickerBatch({
        restaurantId,
        quantity: qty,
        validDays,
        designId: design.id,
        designName: design.name,
        notes: notes.trim() || undefined,
      });
      const payload: StickerPreviewPayload = {
        batchId: res.batchId,
        batchCode: res.batchCode,
        quantity: res.quantity,
        designId: design.id,
        designName: design.name,
        restaurantName: res.restaurantName,
        samples: res.samples.map((s) => ({ label: s.label, scanUrl: s.scanUrl })),
        notes: notes.trim() || undefined,
        printRequestedAt: null,
      };
      setPreview(payload);
      setPreviewOpen(true);
      setMessage(`Generated ${res.quantity} codes (${res.batchCode}). Preview opened.`);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generate failed");
    } finally {
      setBusy(false);
    }
  }

  function openRecent(b: StickerBatchSummary) {
    const dId = b.designId ?? designId;
    const dName =
      b.designName ??
      STICKER_PRINT_DESIGNS.find((d) => d.id === dId)?.name ??
      design.name;
    setPreview({
      batchId: b.id,
      batchCode: b.batchCode,
      quantity: b.quantity,
      designId: dId,
      designName: dName,
      restaurantName: "Your kitchen",
      samples: [],
      printRequestedAt: b.printRequestedAt ?? null,
    });
    setPreviewOpen(true);
  }

  if (!restaurantId) return null;

  const previewScan = "https://damigos.in/s/preview";

  return (
    <div className="flex flex-col gap-5">
      <form
        onSubmit={(e) => void onGenerate(e)}
        className="flex flex-col gap-5 rounded-xl border border-outline-variant/60 bg-surface-container-lowest p-6 shadow-sm"
        data-testid="sticker-owner-generate"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-on-surface">Generate table QR stickers</h2>
            <p className="mt-0.5 text-xs text-on-surface-variant">
              Create codes, open a full sticker preview with samples, then request D'aMigo's to print and ship.
            </p>
          </div>
          <MaterialIcon name="qr_code_2" className="text-[28px] text-primary" />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
          <label className="col-span-12 flex flex-col gap-1.5 md:col-span-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
              How many stickers?
            </span>
            <input
              type="number"
              min={1}
              max={2000}
              className="h-11 w-full rounded-xl bg-surface-container-low px-3.5 text-sm font-semibold outline-none"
              value={qty}
              onChange={(e) => setQty(Number(e.target.value))}
              data-testid="sticker-mint-qty"
            />
          </label>
          <label className="col-span-12 flex flex-col gap-1.5 md:col-span-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
              Validity (days)
            </span>
            <input
              type="number"
              min={10}
              max={15}
              className="h-11 w-full rounded-xl bg-surface-container-low px-3.5 text-sm font-semibold outline-none"
              value={validDays}
              onChange={(e) => setValidDays(Number(e.target.value))}
            />
          </label>
          <label className="col-span-12 flex flex-col gap-1.5 md:col-span-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
              Notes for D'aMigo's (optional)
            </span>
            <input
              className="h-11 w-full rounded-xl bg-surface-container-low px-3.5 text-sm outline-none"
              placeholder="Tables · patio · courier preference…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>
        </div>

        <div>
          <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
              Sticker design
            </span>
            <div className="flex flex-wrap gap-1" role="tablist">
              {STICKER_DESIGN_OCCASIONS.map((opt) => {
                const active = occasion === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setOccasion(opt.id)}
                    className={`rounded-md px-2 py-1 text-[10px] font-semibold ${
                      active
                        ? "bg-primary text-on-primary"
                        : "bg-surface-container-high text-on-surface-variant"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="grid max-h-52 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
            {filteredDesigns.map((d) => (
              <button
                key={d.id}
                type="button"
                title={d.name}
                onClick={() => setDesignId(d.id)}
                className={`rounded-lg border-2 bg-surface-container-low p-1 ${
                  designId === d.id ? "border-primary ring-2 ring-primary/30" : "border-transparent"
                }`}
              >
                <StickerPrintTile
                  design={d}
                  restaurantName="Your kitchen"
                  label="TBL-01"
                  scanUrl={previewScan}
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

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-xs text-on-surface-variant">
            <MaterialIcon name="lock" className="text-[16px] text-tertiary" />
            No PDF / print download — request physical print from D'aMigo's
          </p>
          <Button type="submit" className="h-11 gap-2 px-6 font-bold" disabled={busy} data-testid="sticker-generate-btn">
            <MaterialIcon name="bolt" className="text-[18px]" />
            {busy ? "Generating…" : "Generate & preview"}
          </Button>
        </div>
      </form>

      {message ? <p className="text-sm text-[#24963F]">{message}</p> : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <div className="flex flex-col gap-3 rounded-xl border border-outline-variant/60 bg-surface-container-lowest p-5 shadow-sm">
        <h3 className="text-base font-semibold text-on-surface">Recent batches</h3>
        <ul className="divide-y divide-outline-variant/30 text-sm">
          {batches.slice(0, 8).map((b) => {
            const sent = Boolean(b.printRequestedAt);
            return (
              <li key={b.id}>
                <button
                  type="button"
                  onClick={() => openRecent(b)}
                  className="flex w-full flex-wrap items-center justify-between gap-2 py-2.5 text-left hover:bg-surface-container-low/80"
                >
                  <div>
                    <span className="font-mono font-bold">{b.batchCode}</span>
                    <span className="ml-2 text-xs text-on-surface-variant">
                      {b.quantity} · {b.designName || "design"} · {b.activatedAt ? "ACTIVE" : "MINTED"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {sent ? (
                      <span className="rounded-full bg-[#E8F5E9] px-2 py-0.5 text-[10px] font-bold uppercase text-[#24963F]">
                        Sent
                      </span>
                    ) : (
                      <span className="rounded-full bg-surface-container-high px-2 py-0.5 text-[10px] font-bold uppercase text-on-surface-variant">
                        Not sent
                      </span>
                    )}
                    <span className="text-[11px] text-on-surface-variant">
                      {daysRemaining(b.validTo)}d left · preview
                    </span>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
        {!batches.length ? (
          <p className="text-sm text-on-surface-variant">No batches yet — generate above.</p>
        ) : null}
      </div>

      <StickerPreviewDialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        restaurantId={restaurantId}
        payload={preview}
        onSent={(at) => {
          if (!preview) return;
          setPreview({ ...preview, printRequestedAt: at });
          setBatches((rows) =>
            rows.map((r) => (r.id === preview.batchId ? { ...r, printRequestedAt: at } : r)),
          );
          void reload();
        }}
      />
    </div>
  );
}

/** @deprecated Admin mint UI removed — use SettingsStickersOwnerWorkspace */
export function SettingsStickersAdminPane() {
  return <SettingsStickersOwnerWorkspace />;
}

/** @deprecated */
export function SettingsStickers() {
  return (
    <div className="space-y-6">
      <SettingsStickersOwnerPeek />
      <SettingsStickersOwnerWorkspace />
    </div>
  );
}
