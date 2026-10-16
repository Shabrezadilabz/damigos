"use client";

import { useEffect, useMemo, useState } from "react";
import { MaterialIcon } from "@/components/material-icon";
import { Button } from "@/components/ui/button";
import {
  activateStickerBatch,
  fetchActiveStickerBatches,
  fetchStickerBatches,
  fetchStickerPrintSheet,
  mintStickerBatch,
  type StickerBatchStatusFilter,
  type StickerBatchSummary,
} from "@/lib/api";
import { StickerPrintDialog } from "@/components/sticker-print-dialog";
import { useCrmRestaurant } from "@/components/use-crm-restaurant";

function daysRemaining(validTo: string): number {
  const ms = new Date(validTo).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}

function QrTile({ label, scanUrl }: { label: string; scanUrl?: string }) {
  const qr = scanUrl
    ? `https://quickchart.io/qr?size=80&margin=1&text=${encodeURIComponent(scanUrl)}`
    : null;
  return (
    <div className="flex flex-col items-center gap-1 rounded-lg bg-surface-container-lowest p-1.5 shadow-sm transition-transform hover:scale-105">
      <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded bg-white p-0.5">
        {qr ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qr} alt="" className="h-full w-full object-contain" />
        ) : (
          <MaterialIcon name="qr_code" className="text-[24px] text-on-surface" />
        )}
      </div>
      <span className="font-mono text-[9px] font-bold text-on-surface-variant">{label}</span>
    </div>
  );
}

function useStickerBatches(mode: "active" | "admin", statusFilter: StickerBatchStatusFilter) {
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
  }, [restaurantId, mode, statusFilter]);

  return { restaurantId, batches, error, reload, setError };
}

/** Stitch middle column — owner stickers peek */
export function SettingsStickersOwnerPeek() {
  const { restaurantId, batches, error, reload, setError } = useStickerBatches("active", "active");
  const [batchCode, setBatchCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [previewQr, setPreviewQr] = useState<{ label: string; scanUrl: string }[]>([]);

  const primary = batches[0];

  useEffect(() => {
    if (!restaurantId || !primary?.id) {
      setPreviewQr([]);
      return;
    }
    void fetchStickerPrintSheet(primary.id, restaurantId, 6)
      .then((sheet) =>
        setPreviewQr(sheet.stickers.map((s) => ({ label: s.label, scanUrl: s.scanUrl }))),
      )
      .catch(() => setPreviewQr([]));
  }, [restaurantId, primary?.id]);

  const qrTiles = useMemo(() => {
    if (previewQr.length) return previewQr;
    const n = Math.min(6, primary?.quantity ?? 6);
    return Array.from({ length: n }, (_, i) => ({
      label: `TBL-${String(i + 1).padStart(2, "0")}`,
      scanUrl: undefined as string | undefined,
    }));
  }, [previewQr, primary?.quantity]);

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
      <div className="flex items-center justify-between pb-1">
        <div className="flex items-center gap-1.5">
          <MaterialIcon name="visibility" className="text-[18px] text-primary" />
          <span className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">
            Owner view: Stickers
          </span>
        </div>
        <span className="h-2 w-2 rounded-full bg-[#24963F]" title="Synced" />
      </div>

      <div className="flex flex-col gap-2.5 rounded-xl bg-surface-container-low p-3.5">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase text-on-surface-variant">Current sequence</div>
            <div className="font-[family-name:var(--font-display)] text-base font-semibold text-on-surface">
              {primary ? `Batch ${primary.batchCode}` : "No active batch"}
            </div>
          </div>
          <span className="rounded-full bg-tertiary-fixed px-2 py-0.5 text-[10px] font-semibold text-on-tertiary-fixed">
            10–15 day validity
          </span>
        </div>
        {primary ? (
          <p className="flex items-center gap-2 text-[11px] text-on-surface-variant">
            <MaterialIcon name="schedule" className="text-[14px] text-[#24963F]" />
            Rolling expiration · {daysRemaining(primary.validTo)} days left
          </p>
        ) : (
          <p className="text-[11px] text-on-surface-variant">Activate a batch code from ops to enable scans.</p>
        )}
        <div className="pt-2">
          <div className="mb-1.5 text-[10px] font-bold uppercase text-on-surface-variant">
            Dynamic smart QR tokens ({Math.min(6, primary?.quantity ?? 0)} of {primary?.quantity ?? "—"})
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {qrTiles.map((t) => (
              <QrTile key={t.label} label={t.label} scanUrl={t.scanUrl} />
            ))}
          </div>
        </div>
      </div>

      <form
        onSubmit={(e) => void onActivate(e)}
        className="flex flex-col gap-2.5 rounded-xl bg-surface-container-lowest p-3.5 shadow-sm"
      >
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-on-primary">
            1
          </span>
          <span className="text-sm font-semibold text-on-surface">Activate new bundle</span>
        </div>
        <p className="text-[11px] leading-relaxed text-on-surface-variant">
          Owner step: enter the batch code ops gave you after minting (not the admin ops key).
        </p>
        <div className="flex gap-2 pt-1">
          <input
            className="h-9 w-full rounded-lg bg-surface-container-low px-3 font-mono text-xs text-on-surface shadow-sm outline-none placeholder:text-on-surface-variant focus:bg-surface-container-lowest"
            placeholder="DEV-BATCH-001 or DAM-XXXX-XXXX"
            value={batchCode}
            onChange={(e) => setBatchCode(e.target.value)}
            data-testid="sticker-activate-input"
          />
          <Button type="submit" className="h-9 shrink-0 px-3" disabled={busy || !batchCode.trim()}>
            Verify
          </Button>
        </div>
        <p className="flex items-center gap-1 text-[10px] text-on-surface-variant">
          <MaterialIcon name="info" className="text-[13px] text-tertiary" />
          Activates WhatsApp webview dine-in payload
        </p>
      </form>

      {message ? <p className="text-sm text-[#24963F]">{message}</p> : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </div>
  );
}

/** Stitch admin pane — mint + register table */
export function SettingsStickersAdminPane() {
  const [statusFilter, setStatusFilter] = useState<StickerBatchStatusFilter>("all");
  const { restaurantId, batches, error, reload, setError } = useStickerBatches("admin", statusFilter);
  const [mintQty, setMintQty] = useState(250);
  const [validDays, setValidDays] = useState(12);
  const [notes, setNotes] = useState("");
  const [opsKey, setOpsKey] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [printBatch, setPrintBatch] = useState<{ id: string; batchCode: string } | null>(null);

  async function onMint(e: React.FormEvent) {
    e.preventDefault();
    if (!restaurantId) return;
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const res = await mintStickerBatch({
        restaurantId,
        quantity: mintQty,
        validDays,
        notes: notes.trim() || undefined,
        opsKey: opsKey.trim(),
      });
      setMessage(`Minted ${res.batchCode} — share this code with the owner to activate.`);
      setPrintBatch({ id: res.batchId, batchCode: res.batchCode });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Mint failed");
    } finally {
      setBusy(false);
    }
  }

  if (!restaurantId) return null;

  const totalUnits = batches.reduce((s, b) => s + b.quantity, 0);

  return (
    <div className="flex flex-col gap-5">
      <form
        onSubmit={(e) => void onMint(e)}
        className="flex flex-col gap-5 rounded-xl border border-outline-variant/60 bg-surface-container-lowest p-6 shadow-sm"
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-on-surface">Admin — mint stickers &amp; encrypted URLs</h2>
              <span className="rounded bg-primary-fixed px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-on-primary-fixed">
                SuperOps
              </span>
            </div>
            <p className="mt-0.5 text-xs text-on-surface-variant">
              Generate non-replayable WhatsApp routing tokens for this kitchen.
            </p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-container-low text-primary">
            <MaterialIcon name="token" className="text-[24px]" />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
          <label className="col-span-12 flex flex-col gap-1.5 md:col-span-6">
            <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
              Target restaurant outlet
            </span>
            <div className="relative">
              <input
                readOnly
                className="h-11 w-full rounded-xl bg-surface-container-low px-3.5 text-sm font-semibold text-on-surface outline-none"
                value="Current kitchen (session scope)"
              />
            </div>
          </label>
          <label className="col-span-12 flex flex-col gap-1.5 md:col-span-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
              Quantity (units)
            </span>
            <div className="relative">
              <input
                type="number"
                min={1}
                max={5000}
                className="h-11 w-full rounded-xl bg-surface-container-low px-3.5 text-sm font-semibold outline-none focus:bg-surface-container-lowest"
                value={mintQty}
                onChange={(e) => setMintQty(Number(e.target.value))}
                data-testid="sticker-mint-qty"
              />
              <span className="absolute right-3.5 top-3 font-mono text-[11px] font-bold uppercase text-on-surface-variant">
                QRs
              </span>
            </div>
          </label>
          <label className="col-span-12 flex flex-col gap-1.5 md:col-span-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
              Validity window
            </span>
            <div className="relative">
              <input
                type="number"
                min={10}
                max={15}
                className="h-11 w-full rounded-xl bg-surface-container-low px-3.5 text-sm font-semibold outline-none focus:bg-surface-container-lowest"
                value={validDays}
                onChange={(e) => setValidDays(Number(e.target.value))}
              />
              <span className="absolute right-3.5 top-3 font-mono text-[11px] font-bold uppercase text-on-surface-variant">
                Days
              </span>
            </div>
          </label>
          <label className="col-span-12 flex flex-col gap-1.5 md:col-span-6">
            <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
              Ops mint key (platform admin only)
            </span>
            <input
              type="password"
              autoComplete="off"
              className="h-11 w-full rounded-xl bg-surface-container-low px-3.5 font-mono text-sm outline-none placeholder:text-on-surface-variant focus:bg-surface-container-lowest"
              placeholder="DEV-STICKER-OPS-KEY"
              value={opsKey}
              onChange={(e) => setOpsKey(e.target.value)}
              data-testid="sticker-ops-key"
            />
          </label>
          <label className="col-span-12 flex flex-col gap-1.5 md:col-span-6">
            <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
              Mint metadata &amp; logistics notes
            </span>
            <input
              className="h-11 w-full rounded-xl bg-surface-container-low px-3.5 text-sm outline-none placeholder:text-on-surface-variant focus:bg-surface-container-lowest"
              placeholder="Express run for weekend patio extensions…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <p className="flex items-center gap-2 text-xs text-on-surface-variant">
            <MaterialIcon name="lock_clock" className="text-[16px] text-tertiary" />
            Cryptographically sealed payload generation
          </p>
          <Button
            type="submit"
            className="h-11 gap-2 px-6 font-bold"
            disabled={busy || !opsKey.trim()}
            data-testid="sticker-mint-btn"
          >
            <MaterialIcon name="bolt" className="text-[18px]" />
            Generate batch &amp; QR sheet
          </Button>
        </div>
      </form>

      {restaurantId && printBatch ? (
        <StickerPrintDialog
          open
          batchId={printBatch.id}
          batchCode={printBatch.batchCode}
          restaurantId={restaurantId}
          onClose={() => setPrintBatch(null)}
        />
      ) : null}

      {message ? <p className="text-sm text-[#24963F]">{message}</p> : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <div className="flex flex-col gap-4 rounded-xl border border-outline-variant/60 bg-surface-container-lowest p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-on-surface">Recent mint registers</h3>
            <span className="rounded-full bg-surface-container-high px-2 py-0.5 font-mono text-[10px] font-semibold">
              Total {totalUnits} units
            </span>
          </div>
          <label className="flex items-center gap-2 text-xs text-on-surface-variant">
            Validity filter
            <select
              className="rounded-lg bg-surface-container-low px-2 py-1.5 text-xs font-semibold text-on-surface"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StickerBatchStatusFilter)}
            >
              <option value="all">All batches</option>
              <option value="minted">Minted (not activated)</option>
              <option value="active">Active</option>
              <option value="expired">Expired / revoked</option>
            </select>
          </label>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead>
              <tr className="bg-surface-container-low text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                <th className="rounded-l-lg px-3 py-2.5">Batch ID</th>
                <th className="px-3 py-2.5">Outlet</th>
                <th className="px-3 py-2.5">Qty</th>
                <th className="px-3 py-2.5">Expires</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="rounded-r-lg px-3 py-2.5">Print</th>
              </tr>
            </thead>
            <tbody className="text-on-surface">
              {batches.map((b) => (
                <tr key={b.id} className="hover:bg-surface-container-low/60">
                  <td className="flex items-center gap-1.5 px-3 py-3 font-mono font-bold">
                    <span className="h-2 w-2 rounded-full bg-[#24963F]" />
                    {b.batchCode}
                  </td>
                  <td className="px-3 py-3">
                    <div className="text-xs font-semibold">This kitchen</div>
                    <div className="font-mono text-[11px] text-on-surface-variant">{b.id.slice(0, 8)}</div>
                  </td>
                  <td className="px-3 py-3 font-mono font-semibold">{b.quantity}</td>
                  <td className="px-3 py-3">
                    <div className="font-medium">{daysRemaining(b.validTo)} days remaining</div>
                    <div className="text-[11px] text-on-surface-variant">
                      {new Date(b.validTo).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <span className="inline-flex rounded-full bg-[#24963F]/10 px-2 py-0.5 text-[10px] font-bold text-[#24963F]">
                      {b.revokedAt ? "REVOKED" : b.activatedAt ? "ACTIVE" : "MINTED"}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-lg bg-primary-container px-2 py-1 text-[10px] font-bold text-on-primary-container"
                      onClick={() => setPrintBatch({ id: b.id, batchCode: b.batchCode })}
                    >
                      <MaterialIcon name="print" className="text-[14px]" />
                      Banners
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!batches.length ? (
          <p className="text-sm text-on-surface-variant">No batches yet — mint one above or activate a dev batch code.</p>
        ) : null}
      </div>
    </div>
  );
}

/** @deprecated Use SettingsStickersOwnerPeek — kept for imports */
export function SettingsStickers() {
  return (
    <div className="space-y-6">
      <SettingsStickersOwnerPeek />
      <SettingsStickersAdminPane />
    </div>
  );
}
