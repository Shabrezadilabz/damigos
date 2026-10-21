"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createMenuItem,
  deleteMenuItem,
  fetchMenuImportJob,
  fetchMenuItems,
  formatInr,
  MENU_IMPORT_LOW_CONFIDENCE,
  type MenuImportJobRow,
  type MenuItemRow,
  publishMenu,
  purgeTestMenuItems,
  revertMenuDrafts,
  startMenuPdfImport,
  updateMenuItem,
} from "@/lib/api";
import { menuItemThumb } from "@/lib/menu-item-thumb";
import { MenuImportReview } from "@/components/menu-import-review";
import { MenuImportOverlay } from "@/components/menu-import-overlay";
import { MenuExtractionAudit, MenuItemDrawer } from "@/components/menu-item-drawer";
import { MenuAvailabilityToggle } from "@/components/menu-availability-toggle";
import { MaterialIcon } from "@/components/material-icon";
import { cn } from "@/lib/utils";

type Stage = "live" | "draft";

function isLiveMenuItem(item: MenuItemRow): boolean {
  return item.draft === false;
}

const PAGE_SIZE = 5;

function needsReview(item: MenuItemRow) {
  return item.importConfidence != null && item.importConfidence < MENU_IMPORT_LOW_CONFIDENCE;
}

function MenuItemThumbCell({ src, alt }: { src: string | null; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className="flex h-full w-full items-center justify-center text-on-surface-variant">
        <MaterialIcon name="restaurant" className="text-[20px]" />
      </div>
    );
  }
  return (
    <div className="group/thumb relative h-full w-full">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="h-full w-full object-cover" onError={() => setFailed(true)} />
      <div className="pointer-events-none absolute bottom-full left-0 z-30 mb-2 hidden w-40 overflow-hidden rounded-xl border border-border bg-background shadow-xl group-hover/thumb:block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" className="h-40 w-full object-cover" />
      </div>
    </div>
  );
}

type MenuFilter = "all" | "needs_review" | "veg" | "non_veg" | "unavailable";

function importJobIsActive(job: MenuImportJobRow | null) {
  return job != null && (job.status === "queued" || job.status === "processing");
}

function VegMark({ isVeg }: { isVeg: boolean }) {
  return (
    <div
      className={cn(
        "flex h-4 w-4 items-center justify-center rounded-sm p-0.5",
        isVeg ? "bg-emerald-50" : "bg-red-50",
      )}
    >
      {isVeg ? (
        <span className="h-2 w-2 rounded-full bg-emerald-600" />
      ) : (
        <span className="h-0 w-0 border-x-4 border-b-[6px] border-x-transparent border-b-primary" />
      )}
    </div>
  );
}


export function MenuManager({ restaurantId }: { restaurantId: string }) {
  const [stage, setStage] = useState<Stage>("draft");
  const [items, setItems] = useState<MenuItemRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<MenuFilter>("all");
  const [filterOpen, setFilterOpen] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [page, setPage] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [isVeg, setIsVeg] = useState(true);
  const addFormRef = useRef<HTMLFormElement>(null);
  const [importJob, setImportJob] = useState<MenuImportJobRow | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [reviewItems, setReviewItems] = useState<MenuItemRow[] | null>(null);
  const [importUploading, setImportUploading] = useState(false);
  const [overlayItem, setOverlayItem] = useState<MenuItemRow | null>(null);
  const [draftTotal, setDraftTotal] = useState(0);
  const importPollLock = useRef(false);
  const hydratedImportJobId = useRef<string | null>(null);

  const draftMode = stage === "draft";

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchMenuItems(restaurantId, draftMode ? true : false);
      setItems(rows);
      const drafts = await fetchMenuItems(restaurantId, true);
      setDraftTotal(drafts.length);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Load failed";
      setError(
        msg.includes("Failed to fetch") || msg === "Load failed"
          ? "Could not reach CRM API (is it running on port 4001?). Check apps/crm/frontend/.env.local → NEXT_PUBLIC_CRM_API_URL."
          : msg,
      );
    } finally {
      setLoading(false);
    }
  }, [restaurantId, draftMode]);

  useEffect(() => {
    void load();
  }, [load]);

  // Reset Menu UI when switching kitchens so drafts from another restaurant never linger.
  useEffect(() => {
    setSelectedId(null);
    setImportJob(null);
    setReviewItems(null);
    setOverlayItem(null);
    setSearch("");
    setFilter("all");
    setShowAddForm(false);
    hydratedImportJobId.current = null;
    importPollLock.current = false;
    void fetchMenuItems(restaurantId, true).then((drafts) => {
      setDraftTotal(drafts.length);
      setStage(drafts.length > 0 ? "draft" : "live");
    });
  }, [restaurantId]);


  useEffect(() => {
    if (draftMode && items.length > 0 && !items.some((i) => i.id === selectedId)) {
      setSelectedId(items[0]!.id);
    }
  }, [draftMode, items, selectedId]);

  useEffect(() => {
    setPage(0);
  }, [stage, search, filter]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = items;
    if (q) {
      list = list.filter((i) => {
        const prep =
          i.prepCategory === "READY_10M" || i.prepMinutes === 10 ? "10m" : "15m";
        const hay = `${i.name} ${i.description ?? ""} ${prep} ${i.isVeg ? "veg vegetarian" : "non-veg chicken"}`.toLowerCase();
        return hay.includes(q);
      });
    }
    if (filter === "needs_review") list = list.filter(needsReview);
    if (filter === "veg") list = list.filter((i) => i.isVeg);
    if (filter === "non_veg") list = list.filter((i) => !i.isVeg);
    if (filter === "unavailable") list = list.filter((i) => !i.available);
    return list;
  }, [items, search, filter, stage]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  const draftCount = draftMode ? items.length : draftTotal;
  const lowConfCount = (draftMode ? items : []).filter(needsReview).length;
  const selected = items.find((i) => i.id === selectedId) ?? pageItems[0] ?? null;

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    const rupees = parseFloat(price);
    if (!name.trim() || Number.isNaN(rupees) || rupees <= 0) {
      setError("Enter a name and a valid price (₹) to add an item.");
      return;
    }
    setError(null);
    try {
      const created = await createMenuItem({
        restaurantId,
        name: name.trim(),
        pricePaise: Math.round(rupees * 100),
        isVeg,
      });
      setName("");
      setPrice("");
      setShowAddForm(false);
      setStage("draft");
      const rows = await fetchMenuItems(restaurantId, true);
      setItems(rows);
      setDraftTotal(rows.length);
      setSelectedId(created.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    }
  }

  function openAddItem() {
    setShowAddForm(true);
    setStage("draft");
    setFilterOpen(false);
    window.setTimeout(() => {
      addFormRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      addFormRef.current?.querySelector<HTMLInputElement>("input")?.focus();
    }, 80);
  }

  async function onPublish() {
    if (draftTotal <= 0) return;
    const drafts = draftMode ? items : await fetchMenuItems(restaurantId, true);
    const missingPrep = drafts.filter((d) => {
      const cat = d.prepCategory;
      const mins = d.prepMinutes;
      const aligned =
        (cat === "READY_10M" && mins === 10) || (cat === "COOKED_15M" && mins === 15);
      return !aligned;
    });
    if (missingPrep.length > 0) {
      setError(
        `Set prep SLA (⚡ 10m or 🔥 15m) on ${missingPrep.length} draft item(s) before publish: ${missingPrep
          .slice(0, 5)
          .map((i) => i.name)
          .join(", ")}${missingPrep.length > 5 ? "…" : ""}`,
      );
      setStage("draft");
      if (missingPrep[0]) setSelectedId(missingPrep[0].id);
      return;
    }
    const ok = window.confirm(
      `Publish ${draftTotal} draft item(s) to Live? Guests will see them on WhatsApp menu after publish.`,
    );
    if (!ok) return;
    try {
      await publishMenu(restaurantId);
      setStage("live");
      setSelectedId(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Publish failed");
    }
  }

  async function onRevertDrafts() {
    if (draftTotal <= 0) return;
    const ok = window.confirm(
      `Revert changes and delete all ${draftTotal} draft item(s)? Live menu stays as-is. This cannot be undone.`,
    );
    if (!ok) return;
    try {
      await revertMenuDrafts(restaurantId);
      setSelectedId(null);
      setImportJob(null);
      setReviewItems(null);
      setSearch("");
      setFilter("all");
      hydratedImportJobId.current = null;
      // Stay on Live after revert so demo seed / old drafts don't look like “redirect to previous kitchen”.
      setStage("live");
      const live = await fetchMenuItems(restaurantId, false);
      const drafts = await fetchMenuItems(restaurantId, true);
      setItems(live);
      setDraftTotal(drafts.length);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Revert failed");
    }
  }

  async function onPurgeE2eItems() {
    const ok = window.confirm("Remove all E2E Publish test items from this restaurant?");
    if (!ok) return;
    const { deletedCount } = await purgeTestMenuItems(restaurantId);
    if (deletedCount > 0) await load();
  }

  const pollImportJob = useCallback(
    async (jobId: string) => {
      if (importPollLock.current) return;
      importPollLock.current = true;
      const pollMs = 1500;
      const maxWaitMs = 240_000;
      const started = Date.now();
      try {
        while (Date.now() - started < maxWaitMs) {
          const { job, reviewItems: rows } = await fetchMenuImportJob(jobId);
          setImportJob(job);
          if (job.status === "completed") {
            setReviewItems(null);
            setStage("draft");
            await load();
            if (rows.length > 0) setSelectedId(rows[0]!.id);
            return;
          }
          if (job.status === "failed") {
            setImportError(job.errorMessage ?? "Import failed");
            setImportJob(job);
            return;
          }
          await new Promise((r) => setTimeout(r, pollMs));
        }
        const { job } = await fetchMenuImportJob(jobId);
        setImportJob(job);
        if (job.status === "completed" || job.status === "failed") {
          if (job.status === "failed") setImportError(job.errorMessage ?? "Import failed");
          return;
        }
        setImportError(
          "Import timed out waiting for AI vision (usually finishes in 1–3 min). Restart CRM API and retry with a clear photo.",
        );
        setImportJob({ ...job, status: "failed", errorMessage: "Client poll timed out" });
      } catch (e) {
        setImportError(e instanceof Error ? e.message : "Import status failed");
        setImportJob(null);
        hydratedImportJobId.current = null;
      } finally {
        importPollLock.current = false;
      }
    },
    [load, restaurantId],
  );

  useEffect(() => {
    const jobId = items.find((i) => i.importJobId)?.importJobId;
    if (!jobId) {
      hydratedImportJobId.current = null;
      return;
    }
    if (hydratedImportJobId.current === jobId || importPollLock.current) return;
    hydratedImportJobId.current = jobId;

    void fetchMenuImportJob(jobId)
      .then(({ job }) => {
        if (job.status === "completed" || job.status === "failed") {
          setImportJob(job);
          return;
        }
        if (job.status === "queued" || job.status === "processing") {
          setImportJob(job);
          void pollImportJob(job.id);
        }
      })
      .catch(() => {
        hydratedImportJobId.current = null;
        setImportJob(null);
      });
  }, [items, pollImportJob]);

  async function compressMenuPhoto(file: File): Promise<{ base64: string; mimeType: "image/jpeg" }> {
    const objectUrl = URL.createObjectURL(file);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = () => reject(new Error("Could not decode menu image"));
        el.src = objectUrl;
      });
      const maxEdge = 1024;
      let w = img.naturalWidth;
      let h = img.naturalHeight;
      if (w > maxEdge || h > maxEdge) {
        const scale = maxEdge / Math.max(w, h);
        w = Math.round(w * scale);
        h = Math.round(h * scale);
      }
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas not available");
      ctx.drawImage(img, 0, 0, w, h);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.65);
      const base64 = dataUrl.split(",")[1] ?? "";
      if (!base64) throw new Error("Could not compress menu image");
      return { base64, mimeType: "image/jpeg" };
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }

  async function readMenuImportPayload(file: File) {
    const isImage =
      file.type.startsWith("image/") || /\.(jpe?g|png|webp)$/i.test(file.name);
    if (!isImage) {
      return { fileName: file.name } as const;
    }
    const { base64, mimeType } = await compressMenuPhoto(file);
    return { fileName: file.name, imageBase64: base64, mimeType };
  }

  async function onPdfSelected(file: File | undefined) {
    if (!file) return;
    setImportError(null);
    setImportJob(null);
    hydratedImportJobId.current = null;
    setImportUploading(true);
    try {
      const payload = await readMenuImportPayload(file);
      const job = await startMenuPdfImport(restaurantId, payload.fileName, payload);
      setImportJob(job);
      setImportUploading(false);
      await pollImportJob(job.id);
    } catch (e) {
      setImportError(e instanceof Error ? e.message : "Import failed");
    } finally {
      setImportUploading(false);
    }
  }

  async function toggleAvailable(item: MenuItemRow, available: boolean) {
    const updated = await updateMenuItem(item.id, { restaurantId, available });
    setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
  }

  const showImportOverlay = importUploading || importJobIsActive(importJob);

  return (
    <div className="flex flex-col gap-6">
      {showImportOverlay ? (
        <MenuImportOverlay job={importJob} uploading={importUploading} />
      ) : null}
      {reviewItems && importJob && (
        <MenuImportReview
          job={importJob}
          items={reviewItems}
          restaurantId={restaurantId}
          onClose={() => setReviewItems(null)}
          onSaved={() => void load()}
        />
      )}

      {overlayItem && (
        <MenuItemDrawer
          item={overlayItem}
          restaurantId={restaurantId}
          layout="overlay"
          onClose={() => setOverlayItem(null)}
          onSaved={(updated) => {
            setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
            setOverlayItem(null);
          }}
        />
      )}

      {/* Stage controller */}
      <div className="flex flex-col justify-between gap-4 rounded-xl bg-surface-container-lowest p-4 shadow-sm md:flex-row md:items-center">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5 rounded-lg bg-surface-container p-1">
            <button
              type="button"
              className={cn(
                "flex items-center gap-2 rounded-md px-4 py-1.5 text-sm font-semibold transition-all",
                stage === "live"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-on-surface-variant hover:text-foreground",
              )}
              onClick={() => {
                setStage("live");
                setSelectedId(null);
              }}
            >
              Live
              <span className="h-2 w-2 rounded-full bg-emerald-600" />
            </button>
            <button
              type="button"
              className={cn(
                "flex items-center gap-2 rounded-md px-4 py-1.5 text-sm font-semibold transition-all",
                stage === "draft"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-on-surface-variant hover:text-foreground",
              )}
              onClick={() => setStage("draft")}
            >
              Draft
              {draftCount > 0 ? (
                <span className="rounded-full bg-primary-foreground/20 px-1.5 py-0.5 text-[10px] font-bold leading-tight">
                  {draftCount}
                </span>
              ) : null}
            </button>
          </div>
          <div className="hidden items-center gap-2 rounded-lg bg-surface-container-low px-3 py-1 text-[10px] font-semibold text-on-surface-variant sm:flex">
            <MaterialIcon name="bolt" className="text-[16px] text-tertiary" />
            AI Auto-Ingestion Active
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="hidden text-right xl:block">
            <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Sync Status</p>
            <p className="text-xs font-semibold">WhatsApp Cloud Menu 2.1</p>
          </div>
          <button
            type="button"
            data-testid="menu-revert-drafts"
            disabled={draftTotal <= 0}
            className="flex items-center gap-2 rounded-xl bg-surface-container-high px-4 py-2.5 text-sm font-semibold hover:bg-surface-container-highest disabled:cursor-not-allowed disabled:opacity-40"
            onClick={() => void onRevertDrafts()}
          >
            <MaterialIcon name="history" className="text-[18px]" />
            Revert Changes
          </button>
          {stage === "draft" && draftTotal > 0 ? (
            <button
              type="button"
              data-testid="menu-publish"
              className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-secondary"
              onClick={() => void onPublish()}
            >
              <MaterialIcon name="rocket_launch" className="text-[18px]" />
              Publish {draftTotal} to Live
            </button>
          ) : null}
          {stage === "live" && items.some((i) => i.name.startsWith("E2E Publish")) ? (
            <button
              type="button"
              className="flex items-center gap-2 rounded-xl border border-outline-variant px-4 py-2.5 text-sm font-semibold text-on-surface-variant"
              onClick={() => void onPurgeE2eItems()}
            >
              Remove E2E test items
            </button>
          ) : null}
        </div>
      </div>

      {importError && <p className="text-sm text-red-700">{importError}</p>}
      {error && <p className="text-sm text-red-700">{error}</p>}

      <div className="grid grid-cols-12 items-start gap-5">
        <div
          className={cn(
            "col-span-12 flex flex-col gap-4 rounded-xl bg-surface-container-lowest p-5 shadow-sm",
            draftMode ? "lg:col-span-7" : "lg:col-span-12",
          )}
        >
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div className="relative min-w-[200px] flex-1">
              <MaterialIcon
                name="search"
                className="absolute left-3 top-2.5 text-[18px] text-on-surface-variant"
              />
              <input
                className="w-full rounded-lg bg-surface-container-low py-2 pl-9 pr-3 text-sm placeholder:text-on-surface-variant focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Search items, ingredients, tags..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                data-testid="menu-search"
              />
            </div>
            <div className="relative flex items-center gap-2">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-surface-container px-3 py-2 text-xs font-semibold hover:bg-surface-container-high">
                <input
                  type="file"
                  accept="application/pdf,.pdf,image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                  className="sr-only"
                  data-testid="menu-pdf-upload"
                  onChange={(e) => void onPdfSelected(e.target.files?.[0])}
                />
                <MaterialIcon name="upload_file" className="text-[16px] text-primary" />
                Upload menu (PDF or photo)
              </label>
              <button
                type="button"
                data-testid="menu-add-item"
                onClick={openAddItem}
                className="flex items-center gap-2 rounded-lg bg-surface-container-high px-3.5 py-2 text-xs font-semibold hover:bg-surface-container-highest"
              >
                <MaterialIcon name="add" className="text-[16px]" />
                Add Item
              </button>
              <button
                type="button"
                data-testid="menu-filter"
                aria-expanded={filterOpen}
                onClick={() => setFilterOpen((v) => !v)}
                className={cn(
                  "rounded-lg p-2 hover:text-foreground",
                  filter !== "all" || filterOpen
                    ? "bg-primary/10 text-primary"
                    : "bg-surface-container-low text-on-surface-variant",
                )}
              >
                <MaterialIcon name="tune" className="text-[18px]" />
              </button>
              {filterOpen ? (
                <div className="absolute right-0 top-11 z-20 w-48 overflow-hidden rounded-xl border border-border/60 bg-background shadow-xl">
                  {(
                    [
                      ["all", "All items"],
                      ["needs_review", "Needs review"],
                      ["veg", "Vegetarian"],
                      ["non_veg", "Non-veg"],
                      ["unavailable", "86'd / unavailable"],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      className={cn(
                        "flex w-full px-3 py-2 text-left text-xs font-semibold hover:bg-surface-container-low",
                        filter === id && "bg-primary/5 text-primary",
                      )}
                      onClick={() => {
                        setFilter(id);
                        setFilterOpen(false);
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          {draftMode && (
            <div className="grid grid-cols-3 gap-3 rounded-lg bg-surface-container-low p-3">
              <div>
                <span className="text-[10px] font-bold uppercase text-on-surface-variant">Draft Items</span>
                <p className="font-[family-name:var(--font-display)] text-base font-bold">{draftCount}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-on-surface-variant">Needs Attention</span>
                <p className="font-[family-name:var(--font-display)] text-base font-bold text-tertiary">
                  {lowConfCount} Low Conf.
                </p>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-on-surface-variant">Avg Margins</span>
                <p className="font-[family-name:var(--font-display)] text-base font-bold text-emerald-700">68.4%</p>
              </div>
            </div>
          )}

          {loading && <p className="text-sm text-on-surface-variant">Loading…</p>}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
              <thead>
                <tr className="bg-surface-container-low text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                  <th className="rounded-l-lg px-3 py-2.5">Item Details</th>
                  <th className="px-2 py-2.5">Type</th>
                  <th className="px-2 py-2.5">Category</th>
                  <th className="px-3 py-2.5">Price</th>
                  <th className="px-2 py-2.5 text-center">Status</th>
                  <th className="rounded-r-lg px-3 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container">
                {pageItems.map((item) => {
                  const low = needsReview(item);
                  const selectedRow = selected?.id === item.id;
                  const thumb = menuItemThumb(item);
                  return (
                    <tr
                      key={item.id}
                      className={cn(
                        "group cursor-pointer transition-colors",
                        selectedRow && draftMode && "bg-primary/5 hover:bg-primary/10",
                        !selectedRow && low && "bg-amber-500/5 hover:bg-amber-500/10",
                        !selectedRow && !low && "hover:bg-surface-container-low",
                      )}
                      onClick={() => {
                        setSelectedId(item.id);
                        if (!draftMode) setOverlayItem(item);
                      }}
                    >
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-3">
                          <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-surface-container">
                            <MenuItemThumbCell src={thumb} alt="" />
                            {low ? (
                              <span className="absolute inset-0 flex items-center justify-center bg-black/35">
                                <MaterialIcon name="priority_high" className="text-[18px] text-white" />
                              </span>
                            ) : null}
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="truncate text-sm font-bold">{item.name}</span>
                              <span className="rounded bg-surface-container-high px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-on-surface-variant">
                                {item.prepCategory === "READY_10M" || item.prepMinutes === 10
                                  ? "10m"
                                  : "15m"}
                              </span>
                              {item.importJobId && !low && (
                                <span className="rounded bg-tertiary/10 px-1.5 py-0.5 text-[10px] font-semibold text-tertiary">
                                  AI Edited
                                </span>
                              )}
                              {low && (
                                <span className="rounded bg-tertiary-fixed px-1.5 py-0.5 text-[10px] font-semibold text-on-tertiary-fixed">
                                  Low Conf.
                                </span>
                              )}
                              {low && (
                                <span className="rounded-full bg-amber-200 px-2 py-0.5 text-[10px] font-semibold text-amber-950">
                                  Needs review
                                </span>
                              )}
                            </div>
                            <span
                              className={cn(
                                "block truncate text-xs",
                                low ? "text-tertiary" : "text-on-surface-variant",
                              )}
                            >
                              {item.description ??
                                (low ? "Price extraction unverified (OCR ambiguity)" : "—")}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-2 py-3">
                        <VegMark isVeg={item.isVeg} />
                      </td>
                      <td className="px-2 py-3">
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                            low ? "bg-tertiary/10 text-tertiary" : "bg-surface-container text-foreground",
                          )}
                        >
                          {low ? "Review" : isLiveMenuItem(item) ? "Live" : "Draft"}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span className={cn("font-semibold tabular-nums", low && "text-tertiary")}>
                          {formatInr(item.pricePaise)}
                          {low ? "?" : ""}
                        </span>
                      </td>
                      <td className="px-2 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex flex-col items-center gap-0.5">
                          <MenuAvailabilityToggle
                            checked={item.available}
                            onChange={(v) => void toggleAvailable(item, v)}
                          />
                          {!item.available ? (
                            <span className="text-[10px] font-semibold text-amber-800">86&apos;d</span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          {low ? (
                            <button
                              type="button"
                              className="flex h-7 w-7 items-center justify-center rounded-lg bg-tertiary-fixed text-on-tertiary-fixed"
                              onClick={() => setSelectedId(item.id)}
                            >
                              <MaterialIcon name="priority_high" className="text-[16px]" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              className={cn(
                                "flex h-7 w-7 items-center justify-center rounded-lg bg-surface-container transition-all",
                                selectedRow ? "text-primary hover:bg-primary hover:text-primary-foreground" : "text-on-surface-variant hover:text-primary",
                              )}
                              onClick={() => {
                                setSelectedId(item.id);
                                if (!draftMode) setOverlayItem(item);
                              }}
                            >
                              <MaterialIcon name="edit" className="text-[16px]" />
                            </button>
                          )}
                          <button
                            type="button"
                            title={draftMode ? "Delete draft" : "Delete live item"}
                            className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface-container-low text-on-surface-variant hover:bg-red-50 hover:text-red-700"
                            onClick={() => {
                              const label = draftMode ? "draft" : "live";
                              if (
                                !window.confirm(
                                  `Delete ${label} item "${item.name}"? This cannot be undone.`,
                                )
                              ) {
                                return;
                              }
                              void deleteMenuItem(restaurantId, item.id)
                                .then(() => {
                                  if (selectedId === item.id) setSelectedId(null);
                                  return load();
                                })
                                .catch((err) =>
                                  setError(err instanceof Error ? err.message : "Delete failed"),
                                );
                            }}
                          >
                            <MaterialIcon name="delete" className="text-[16px]" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!loading && pageItems.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-on-surface-variant">
                      No {stage} items.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-on-surface-variant">
              Showing {pageItems.length} of {filtered.length} {draftMode ? "draft" : "live"} records
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={page <= 0}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-container-low text-on-surface-variant hover:bg-surface-container disabled:opacity-40"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                <MaterialIcon name="chevron_left" className="text-[18px]" />
              </button>
              <span className="px-2 text-xs font-semibold">
                {page + 1} / {pageCount}
              </span>
              <button
                type="button"
                disabled={page >= pageCount - 1}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-container-low text-on-surface-variant hover:bg-surface-container disabled:opacity-40"
                onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              >
                <MaterialIcon name="chevron_right" className="text-[18px]" />
              </button>
            </div>
          </div>

          {(draftMode || showAddForm) && (
            <form
              ref={addFormRef}
              onSubmit={(e) => void onAdd(e)}
              className="grid gap-3 rounded-xl border border-surface-container bg-surface-container-low/50 p-4 md:grid-cols-2"
            >
              <div className="flex items-center justify-between md:col-span-2">
                <h2 className="text-sm font-semibold">Add draft item</h2>
                {showAddForm ? (
                  <button
                    type="button"
                    className="text-xs font-semibold text-on-surface-variant hover:text-foreground"
                    onClick={() => setShowAddForm(false)}
                  >
                    Hide
                  </button>
                ) : null}
              </div>
              <input
                className="rounded-lg bg-surface-container-lowest px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Item name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                data-testid="menu-add-name"
              />
              <input
                className="rounded-lg bg-surface-container-lowest px-3 py-2 text-sm tabular-nums focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Price (₹)"
                inputMode="decimal"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                data-testid="menu-add-price"
              />
              <label className="flex items-center gap-2 text-sm md:col-span-2">
                <input type="checkbox" checked={isVeg} onChange={(e) => setIsVeg(e.target.checked)} />
                Vegetarian
              </label>
              <button
                type="submit"
                data-testid="menu-add-submit"
                className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground md:justify-self-start"
              >
                Add to draft
              </button>
            </form>
          )}
        </div>

        {draftMode && (
          <div className="col-span-12 flex flex-col gap-4 lg:col-span-5">
            <MenuExtractionAudit job={importJob} items={items} onVerify={(row) => setSelectedId(row.id)} />
            {selected ? (
              <MenuItemDrawer
                key={selected.id}
                item={selected}
                restaurantId={restaurantId}
                layout="embedded"
                onClose={() => setSelectedId(null)}
                onSaved={(updated) => {
                  setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
                }}
              />
            ) : (
              <div className="rounded-xl bg-surface-container-lowest p-8 text-center text-sm text-on-surface-variant shadow-lg">
                Select a draft row to inspect.
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
