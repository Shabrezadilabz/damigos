"use client";

import { useEffect, useRef, useState } from "react";
import { MaterialIcon } from "@/components/material-icon";
import { type MenuImportJobRow, type MenuItemRow, updateMenuItem } from "@/lib/api";
import { compressImageFileToDataUrl } from "@/lib/compress-image-file";
import { menuItemThumb } from "@/lib/menu-item-thumb";
import { cn } from "@/lib/utils";

type Props = {
  item: MenuItemRow;
  restaurantId: string;
  onClose: () => void;
  onSaved: (item: MenuItemRow) => void;
  layout?: "overlay" | "embedded";
};

function aggregatorEstimate(pricePaise: number, reference: number | null) {
  if (reference != null && reference > 0) return reference;
  return Math.round(pricePaise * 1.22);
}

export function MenuItemDrawer({ item, restaurantId, onClose, onSaved, layout = "overlay" }: Props) {
  const [name, setName] = useState(item.name);
  const [description, setDescription] = useState(item.description ?? "");
  const [price, setPrice] = useState(String(item.pricePaise / 100));
  const [referencePrice, setReferencePrice] = useState(
    item.referencePricePaise != null ? String(item.referencePricePaise / 100) : "",
  );
  const [isVeg, setIsVeg] = useState(item.isVeg);
  const [available, setAvailable] = useState(item.available);
  const [prepCategory, setPrepCategory] = useState<"READY_10M" | "COOKED_15M">(
    item.prepCategory === "READY_10M" ? "READY_10M" : "COOKED_15M",
  );
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setName(item.name);
    setDescription(item.description ?? "");
    setPrice(String(item.pricePaise / 100));
    setReferencePrice(item.referencePricePaise != null ? String(item.referencePricePaise / 100) : "");
    setIsVeg(item.isVeg);
    setAvailable(item.available);
    setPrepCategory(item.prepCategory === "READY_10M" ? "READY_10M" : "COOKED_15M");
    setPreviewUrl(null);
    setError(null);
  }, [item]);

  function resetFormFromItem() {
    setName(item.name);
    setDescription(item.description ?? "");
    setPrice(String(item.pricePaise / 100));
    setReferencePrice(item.referencePricePaise != null ? String(item.referencePricePaise / 100) : "");
    setIsVeg(item.isVeg);
    setAvailable(item.available);
    setPrepCategory(item.prepCategory === "READY_10M" ? "READY_10M" : "COOKED_15M");
    setError(null);
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    const rupees = parseFloat(price);
    if (!name.trim() || Number.isNaN(rupees) || rupees <= 0) return;
    setSaving(true);
    setError(null);
    try {
      const refRaw = referencePrice.trim();
      const refRupees = refRaw === "" ? null : parseFloat(refRaw);
      if (refRupees !== null && (Number.isNaN(refRupees) || refRupees <= 0)) return;

      const updated = await updateMenuItem(item.id, {
        restaurantId,
        name: name.trim(),
        description: description.trim() || null,
        pricePaise: Math.round(rupees * 100),
        referencePricePaise: refRupees === null ? null : Math.round(refRupees * 100),
        isVeg,
        available,
        prepCategory,
        prepMinutes: prepCategory === "READY_10M" ? 10 : 15,
      });
      onSaved(updated);
      if (layout === "overlay") onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function onQuick86() {
    setSaving(true);
    setError(null);
    try {
      const updated = await updateMenuItem(item.id, {
        restaurantId,
        available: false,
      });
      setAvailable(false);
      onSaved(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "86 failed");
    } finally {
      setSaving(false);
    }
  }

  async function onQuickRestore() {
    setSaving(true);
    setError(null);
    try {
      const updated = await updateMenuItem(item.id, {
        restaurantId,
        available: true,
      });
      setAvailable(true);
      onSaved(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Restore failed");
    } finally {
      setSaving(false);
    }
  }

  async function onHighResSelected(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Choose a JPG, PNG, or WebP image");
      return;
    }
    setUploadingImage(true);
    setError(null);
    try {
      const dataUrl = await compressImageFileToDataUrl(file);
      setPreviewUrl(dataUrl);
      const updated = await updateMenuItem(item.id, {
        restaurantId,
        imageUrl: dataUrl,
      });
      onSaved(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Image upload failed");
    } finally {
      setUploadingImage(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  }

  const rupeesNum = parseFloat(price);
  const estPaise = aggregatorEstimate(
    Number.isNaN(rupeesNum) ? item.pricePaise : Math.round(rupeesNum * 100),
    referencePrice.trim() ? Math.round(parseFloat(referencePrice) * 100) : item.referencePricePaise,
  );

  const body = (
    <form onSubmit={(e) => void onSave(e)} className="flex flex-col gap-4">
      <div className="flex items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-primary" />
          <h2 id="menu-item-drawer-title" className="font-[family-name:var(--font-display)] text-sm font-bold">
            Item Inspector
          </h2>
          <span className="rounded bg-surface-container px-2 py-0.5 text-[10px] font-semibold text-on-surface-variant">
            Live Drawer
          </span>
        </div>
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-container-low text-on-surface-variant hover:text-foreground"
          onClick={onClose}
          aria-label="Close inspector"
        >
          <MaterialIcon name="close" className="text-[18px]" />
        </button>
      </div>

      <div>
        <label className="mb-1 block text-[10px] font-bold uppercase text-on-surface-variant">Item Title</label>
        <input
          className="w-full rounded-lg bg-surface-container-low px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          value={name}
          onChange={(e) => setName(e.target.value)}
          data-testid="menu-item-name"
        />
      </div>

      <div>
        <label className="mb-1 block text-[10px] font-bold uppercase text-on-surface-variant">Kitchen Description</label>
        <textarea
          className="w-full resize-none rounded-lg bg-surface-container-low px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase text-on-surface-variant">Menu Price</label>
          <div className="relative">
            <span className="absolute left-3 top-2 text-sm text-on-surface-variant">₹</span>
            <input
              className="w-full rounded-lg bg-surface-container-low py-2 pl-7 pr-3 text-sm font-bold tabular-nums focus:outline-none focus:ring-1 focus:ring-primary"
              inputMode="decimal"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              data-testid="menu-item-price"
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase text-on-surface-variant">
            Prep SLA
          </label>
          <select
            className="w-full rounded-lg bg-surface-container-low px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            value={prepCategory}
            onChange={(e) =>
              setPrepCategory(e.target.value === "READY_10M" ? "READY_10M" : "COOKED_15M")
            }
            data-testid="menu-item-prep-category"
          >
            <option value="COOKED_15M">Cooked · 15 min</option>
            <option value="READY_10M">Ready · 10 min</option>
          </select>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-lg bg-surface-container-low p-3">
        <div className="flex items-center gap-2">
          <MaterialIcon name="price_change" className="text-[18px] text-primary" />
          <div>
            <p className="text-[10px] font-semibold">Estimated Aggregator Price</p>
            <p className="text-xs text-on-surface-variant">Optimal margin markup (+22%)</p>
          </div>
        </div>
        <div className="rounded-md bg-surface-container px-3 py-1 text-sm font-bold text-primary tabular-nums">
          {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(estPaise / 100)}
        </div>
      </div>

      <div>
        <label className="mb-1 block text-[10px] font-bold uppercase text-on-surface-variant">Reference price (optional)</label>
        <input
          className="w-full rounded-lg bg-surface-container-low px-3 py-2 text-sm tabular-nums focus:outline-none focus:ring-1 focus:ring-primary"
          inputMode="decimal"
          placeholder="Override aggregator chip"
          value={referencePrice}
          onChange={(e) => setReferencePrice(e.target.value)}
          data-testid="menu-item-reference-price"
        />
      </div>

      <div>
        <label className="mb-1 block text-[10px] font-bold uppercase text-on-surface-variant">Item Media</label>
        <div className="flex items-center gap-3">
          {(() => {
            const thumbSrc =
              previewUrl ?? menuItemThumb({ ...item, name, description, isVeg, imageUrl: item.imageUrl });
            return (
              <div className="group relative h-16 w-16 shrink-0">
                <div className="h-16 w-16 overflow-hidden rounded-xl bg-surface-container-low">
                  {thumbSrc ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={thumbSrc} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-on-surface-variant">
                      <MaterialIcon name="restaurant" className="text-[24px]" />
                    </div>
                  )}
                </div>
                {thumbSrc ? (
                  <div className="pointer-events-none absolute bottom-full left-0 z-20 mb-2 hidden w-44 overflow-hidden rounded-xl border border-border bg-background shadow-xl group-hover:block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={thumbSrc} alt="" className="h-44 w-full object-cover" />
                  </div>
                ) : null}
              </div>
            );
          })()}
          <div className="flex-1">
            <input
              ref={imageInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
              className="sr-only"
              onChange={(e) => void onHighResSelected(e.target.files?.[0])}
            />
            <button
              type="button"
              disabled={uploadingImage || saving}
              onClick={() => imageInputRef.current?.click()}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-surface-container-high py-2 px-3 text-xs font-semibold hover:bg-surface-container-highest disabled:opacity-60"
            >
              <MaterialIcon name="add_photo_alternate" className="text-[18px]" />
              {uploadingImage ? "Uploading…" : "Upload High-Res Shot"}
            </button>
            <span className="mt-1 block text-center text-[10px] text-on-surface-variant">
              Auto-compressed for WhatsApp Webview
            </span>
          </div>
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={isVeg} onChange={(e) => setIsVeg(e.target.checked)} />
        Vegetarian
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={available}
          onChange={(e) => setAvailable(e.target.checked)}
          data-testid="menu-item-available"
        />
        Available on guest menu
      </label>

      {!item.draft && available ? (
        <button
          type="button"
          className="w-full rounded-xl border border-amber-500 py-2.5 text-sm font-semibold text-amber-950 hover:bg-amber-50"
          disabled={saving}
          onClick={() => void onQuick86()}
        >
          86 — hide from menu today
        </button>
      ) : null}
      {!item.draft && !available ? (
        <button
          type="button"
          className="w-full rounded-xl border border-primary py-2.5 text-sm font-semibold text-primary hover:bg-primary/5"
          disabled={saving}
          onClick={() => void onQuickRestore()}
        >
          Restore to guest menu
        </button>
      ) : null}

      {error && <p className="text-sm text-red-700">{error}</p>}

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground shadow-sm hover:bg-secondary"
        >
          <MaterialIcon name="save" className="text-[18px]" />
          {saving ? "Saving…" : "Save Changes"}
        </button>
        <button
          type="button"
          className="rounded-xl bg-surface-container-high px-4 py-3 text-sm font-semibold hover:bg-surface-container-highest"
          onClick={() => {
            resetFormFromItem();
            onClose();
          }}
        >
          Discard
        </button>
        <button type="submit" className="sr-only">
          Save
        </button>
      </div>
    </form>
  );

  if (layout === "embedded") {
    return (
      <div
        role="dialog"
        aria-label="Edit item"
        aria-labelledby="menu-item-drawer-title"
        className="relative w-full rounded-xl bg-surface-container-lowest p-5 shadow-lg"
      >
        {body}
      </div>
    );
  }

  return (
    <div role="dialog" aria-label="Edit item" className="fixed inset-0 z-50 flex justify-end bg-black/40">
      <div className="flex h-full w-full max-w-md flex-col border-l border-border bg-background shadow-xl">
        <div className="flex-1 overflow-y-auto p-4">{body}</div>
      </div>
    </div>
  );
}

export function MenuExtractionAudit({
  job,
  items,
  onVerify,
}: {
  job: MenuImportJobRow | null;
  items: MenuItemRow[];
  onVerify?: (item: MenuItemRow) => void;
}) {
  const filename = job?.sourceFilename ?? "Winter_Menu_Final.pdf";
  const reviewRows = items.filter((i) => i.draft).slice(0, 5);

  return (
    <div className="flex w-full flex-col gap-3 rounded-xl bg-surface-container-lowest p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MaterialIcon name="document_scanner" className="text-[18px] text-tertiary" />
          <span className="font-[family-name:var(--font-display)] text-sm font-bold">Extraction Audit</span>
        </div>
        <span className="rounded-full bg-tertiary/10 px-2 py-0.5 text-[10px] font-semibold text-tertiary">{filename}</span>
      </div>

      <div className="grid min-h-[220px] grid-cols-1 gap-2 overflow-hidden rounded-lg bg-surface-container-low p-2 sm:min-h-[300px] sm:grid-cols-12">
        <div className="relative col-span-1 flex max-h-40 flex-col gap-2 overflow-hidden rounded-md bg-surface-container-lowest/80 p-2 opacity-75 shadow-sm sm:col-span-5 sm:max-h-none">
          <div className="flex items-center justify-between pb-1 text-[10px] text-on-surface-variant">
            <span>Page 3 / 8</span>
            <MaterialIcon name="zoom_in" className="text-[14px]" />
          </div>
          <div className="pointer-events-none flex scale-95 flex-col gap-2 select-none origin-top">
            <div className="h-3 w-3/4 rounded bg-on-surface/20" />
            <div className="mb-2 h-2 w-1/2 rounded bg-on-surface/10" />
            <div className="relative rounded bg-primary/10 p-1.5">
              <div className="h-2.5 w-4/5 rounded bg-on-surface/30" />
              <div className="mt-1 h-2 w-full rounded bg-on-surface/15" />
              <span className="absolute right-1 top-1 text-[9px] font-bold text-primary">₹649</span>
            </div>
            <div className="relative rounded bg-amber-500/20 p-1.5">
              <div className="h-2.5 w-3/5 rounded bg-tertiary/40" />
              <div className="mt-1 h-2 w-full rounded bg-tertiary/20" />
              <span className="absolute right-1 top-1 text-[9px] font-bold text-tertiary">₹???</span>
            </div>
            <div className="rounded p-1.5">
              <div className="h-2.5 w-2/3 rounded bg-on-surface/20" />
              <div className="mt-1 h-2 w-4/5 rounded bg-on-surface/10" />
            </div>
          </div>
          <div className="mt-auto flex items-center justify-center pt-2">
            <span className="flex items-center gap-1 text-[10px] text-on-surface-variant">
              <MaterialIcon name="search" className="text-[12px]" />
              OCR Confidence: {job?.status === "completed" ? "94.2%" : "—"}
            </span>
          </div>
        </div>

        <div className="col-span-1 flex max-h-[340px] flex-col gap-2 overflow-y-auto pr-1 sm:col-span-7">
          {reviewRows.length === 0 ? (
            <p className="p-2 text-xs text-on-surface-variant">Import a PDF to see extracted rows here.</p>
          ) : (
            reviewRows.map((row) => {
              const low = row.importConfidence != null && row.importConfidence < 70;
              return (
                <div
                  key={row.id}
                  className={cn(
                    "flex flex-col gap-1 rounded-lg p-2.5 shadow-sm",
                    low ? "bg-amber-50/80" : "bg-surface-container-lowest",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-xs font-bold">{row.name}</span>
                    {low ? (
                      <div className="flex items-center gap-1">
                        <span className="rounded bg-tertiary-fixed px-1 text-[9px] font-semibold text-on-tertiary-fixed">
                          Amber Alert
                        </span>
                        <span className="text-xs font-bold text-tertiary tabular-nums">
                          {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(
                            row.pricePaise / 100,
                          )}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs font-bold tabular-nums">
                        {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(
                          row.pricePaise / 100,
                        )}
                      </span>
                    )}
                  </div>
                  <p className={cn("line-clamp-1 text-xs", low ? "text-tertiary" : "text-on-surface-variant")}>
                    {row.description ?? (low ? "Description line smudged in source scan" : "—")}
                  </p>
                  <div className="flex items-center justify-between pt-1">
                    {low ? (
                      <>
                        <span className="flex items-center gap-0.5 text-[10px] font-semibold text-tertiary">
                          <MaterialIcon name="warning" className="text-[12px]" />
                          Low Confidence ({row.importConfidence}%)
                        </span>
                        <div className="flex items-center gap-2">
                          <button type="button" className="text-[11px] font-semibold text-on-surface-variant">
                            Ignore
                          </button>
                          <button
                            type="button"
                            className="text-[11px] font-bold text-tertiary hover:underline"
                            onClick={() => onVerify?.(row)}
                          >
                            Verify
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <span className="flex items-center gap-0.5 text-[10px] font-semibold text-emerald-600">
                          <MaterialIcon name="check_circle" className="text-[12px]" />
                          {row.importConfidence ?? 99}% Conf.
                        </span>
                        <button type="button" className="text-[11px] font-semibold text-primary hover:underline">
                          Accept
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
