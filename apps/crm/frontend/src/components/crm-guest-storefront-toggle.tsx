"use client";

import { useCallback, useEffect, useState } from "react";
import { MaterialIcon } from "@/components/material-icon";
import { cn } from "@/lib/utils";
import {
  fetchRestaurantOperations,
  patchRestaurantOperations,
  type RestaurantOperations,
} from "@/lib/api";

type Props = {
  restaurantId: string | null;
  compact?: boolean;
};

export function CrmGuestStorefrontToggle({ restaurantId, compact }: Props) {
  const [ops, setOps] = useState<RestaurantOperations | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!restaurantId) return;
    try {
      const data = await fetchRestaurantOperations(restaurantId);
      setOps(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load storefront status");
    }
  }, [restaurantId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onToggle(next: boolean) {
    if (!restaurantId || busy) return;
    if (next && ops && ops.liveMenuCount === 0) {
      setError("Publish at least one menu item to Live before opening guest orders.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const updated = await patchRestaurantOperations(restaurantId, next);
      setOps(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  if (!restaurantId) return null;

  const open = ops?.orderingEnabled ?? true;
  const guestVisible = ops?.guestVisible ?? false;

  if (compact) {
    return (
      <div className="flex items-center gap-2" data-testid="guest-storefront-toggle">
        <span className="hidden text-[10px] font-bold uppercase tracking-wider text-on-surface-variant lg:inline">
          Guest menu
        </span>
        <button
          type="button"
          disabled={busy || !ops}
          title={open ? "Open — guests can order" : "Off — hidden from hub & ordering"}
          onClick={() => void onToggle(!open)}
          className={cn(
            "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold transition-colors",
            open ? "bg-[#24963F]/15 text-[#24963F]" : "bg-surface-container-high text-on-surface-variant",
          )}
        >
          <span className={cn("h-2 w-2 rounded-full", open ? "bg-[#24963F]" : "bg-outline-variant")} />
          {open ? "Open" : "Off"}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2" data-testid="guest-storefront-toggle">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{ops?.name ?? "Restaurant"}</p>
          <p className="truncate text-xs text-on-surface-variant">{ops?.city ?? "—"}</p>
        </div>
        <button
          type="button"
          disabled={busy || !ops}
          role="switch"
          aria-checked={open}
          aria-label={open ? "Guest ordering open" : "Guest ordering off"}
          onClick={() => void onToggle(!open)}
          className={cn(
            "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors",
            open ? "bg-[#24963F]" : "bg-outline-variant/80",
            busy && "opacity-60",
          )}
        >
          <span
            className={cn(
              "inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform",
              open ? "translate-x-6" : "translate-x-1",
            )}
          />
        </button>
      </div>
      <div
        className={cn(
          "flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold w-fit",
          open ? "bg-[#24963F]/10 text-[#24963F]" : "bg-surface-container-high text-on-surface-variant",
        )}
      >
        <MaterialIcon name={open ? "storefront" : "visibility_off"} className="text-[14px]" />
        {open
          ? guestVisible
            ? "Live on guest app"
            : "Open — publish menu to go live"
          : "Off — hidden from guest hub"}
      </div>
      {error ? <p className="text-[10px] leading-snug text-red-700">{error}</p> : null}
    </div>
  );
}
