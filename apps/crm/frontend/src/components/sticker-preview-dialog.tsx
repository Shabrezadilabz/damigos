"use client";

import { useEffect, useMemo, useState } from "react";
import { MaterialIcon } from "@/components/material-icon";
import { Button } from "@/components/ui/button";
import { StickerPrintTile } from "@/components/sticker-print-tile";
import { STICKER_PRINT_DESIGNS } from "@/lib/sticker-print-designs";
import { fetchStickerPrintSheet, requestStickerPrint } from "@/lib/api";

export type StickerPreviewPayload = {
  batchId: string;
  batchCode: string;
  quantity: number;
  designId: number;
  designName: string;
  restaurantName: string;
  samples: { label: string; scanUrl: string }[];
  notes?: string;
  printRequestedAt?: string | null;
};

export function StickerPreviewDialog({
  open,
  onClose,
  restaurantId,
  payload,
  onSent,
}: {
  open: boolean;
  onClose: () => void;
  restaurantId: string;
  payload: StickerPreviewPayload | null;
  onSent?: (printRequestedAt: string) => void;
}) {
  const [samples, setSamples] = useState<{ label: string; scanUrl: string }[]>([]);
  const [restaurantName, setRestaurantName] = useState("Your kitchen");
  const [loading, setLoading] = useState(false);
  const [requestBusy, setRequestBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [sentAt, setSentAt] = useState<string | null>(null);

  const design = useMemo(() => {
    const id = payload?.designId ?? 1;
    return STICKER_PRINT_DESIGNS.find((d) => d.id === id) ?? STICKER_PRINT_DESIGNS[0]!;
  }, [payload?.designId]);

  useEffect(() => {
    if (!open || !payload) return;
    setError(null);
    setMessage(null);
    setSentAt(payload.printRequestedAt ?? null);
    setRestaurantName(payload.restaurantName || "Your kitchen");

    if (payload.samples.length > 0) {
      setSamples(payload.samples);
      setLoading(false);
      return;
    }

    setLoading(true);
    void fetchStickerPrintSheet(payload.batchId, restaurantId, 3)
      .then((sheet) => {
        setRestaurantName(sheet.restaurantName);
        setSamples(sheet.stickers.map((s) => ({ label: s.label, scanUrl: s.scanUrl })));
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load samples"))
      .finally(() => setLoading(false));
  }, [open, payload, restaurantId]);

  if (!open || !payload) return null;

  const alreadySent = Boolean(sentAt);
  const hero = samples[0];

  async function onSend() {
    const batch = payload;
    if (!batch) return;
    setRequestBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await requestStickerPrint({
        restaurantId,
        batchId: batch.batchId,
        quantity: batch.quantity,
        designId: batch.designId,
        designName: batch.designName || design.name,
        sampleCount: Math.min(3, samples.length || 3),
        notes: batch.notes,
      });
      const at = res.printRequestedAt ?? new Date().toISOString();
      setSentAt(at);
      onSent?.(at);
      setMessage(
        res.emailed
          ? `Print request emailed to ${res.to} with ${res.sampleAttached} sample(s).`
          : `Request logged for ${res.to}. Configure RESEND_API_KEY for live email.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setRequestBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-4 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      data-testid="sticker-preview-dialog"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-surface-container-lowest shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-outline-variant/40 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-on-surface">Sticker preview</h2>
            <p className="mt-0.5 text-xs text-on-surface-variant">
              Batch <span className="font-mono font-bold">{payload.batchCode}</span>
              {" · "}
              {payload.quantity} stickers · {payload.designName || design.name}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {alreadySent ? (
              <span className="rounded-full bg-[#E8F5E9] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#24963F]">
                Sent to Damigos
              </span>
            ) : (
              <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-900">
                Preview only
              </span>
            )}
            <button
              type="button"
              className="rounded-lg p-2 hover:bg-surface-container-high"
              onClick={onClose}
              aria-label="Close"
            >
              <MaterialIcon name="close" className="text-[22px]" />
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          <div className="flex flex-col items-center gap-3 rounded-2xl bg-surface-container-low px-4 py-6">
            <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
              How it prints
            </p>
            {loading ? (
              <p className="text-sm text-on-surface-variant">Loading sticker…</p>
            ) : hero ? (
              <div className="w-full max-w-[160px] sm:max-w-[200px] sm:scale-110">
                <StickerPrintTile
                  design={design}
                  restaurantName={restaurantName}
                  label={hero.label}
                  scanUrl={hero.scanUrl}
                />
              </div>
            ) : (
              <p className="text-sm text-on-surface-variant">No sample QR yet.</p>
            )}
            {hero?.scanUrl ? (
              <a
                href={hero.scanUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-bold text-primary hover:underline"
              >
                Test scan on phone →
              </a>
            ) : null}
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-on-surface">
                Samples ({samples.length || 0} of 3)
              </h3>
              <p className="text-[11px] text-on-surface-variant">Testable · full sheet stays with Damigos</p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3" data-testid="sticker-sample-preview">
              {samples.map((s) => (
                <div
                  key={s.label}
                  className="flex flex-col items-center gap-2 rounded-xl bg-surface-container-low p-3"
                >
                  <StickerPrintTile
                    design={design}
                    restaurantName={restaurantName}
                    label={s.label}
                    scanUrl={s.scanUrl}
                  />
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] font-bold text-on-surface-variant">{s.label}</span>
                    <a
                      href={s.scanUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] font-bold text-primary hover:underline"
                    >
                      Test
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-950">
            Scan a sample to verify the WhatsApp flow. Send a print request and Damigos prints the full count and
            ships — CRM never downloads the full sheet.
          </div>

          {message ? <p className="text-sm text-[#24963F]">{message}</p> : null}
          {error ? <p className="text-sm text-red-700">{error}</p> : null}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-outline-variant/40 px-5 py-4">
          <p className="flex items-center gap-1.5 text-xs text-on-surface-variant">
            <MaterialIcon name="lock" className="text-[16px] text-tertiary" />
            No PDF download
          </p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button
              type="button"
              className="gap-2"
              disabled={requestBusy || loading || samples.length === 0}
              onClick={() => void onSend()}
              data-testid="sticker-send-print-request"
            >
              <MaterialIcon name="outgoing_mail" className="text-[18px]" />
              {requestBusy
                ? "Sending…"
                : alreadySent
                  ? "Send again to Damigos"
                  : "Send request to Damigos"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
