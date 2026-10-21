"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MaterialIcon } from "@/components/material-icon";
import { CrmCommandPalette } from "@/components/crm-command-palette";
import { CrmGuestStorefrontToggle } from "@/components/crm-guest-storefront-toggle";
import { CrmLogoutButton } from "@/components/crm-logout-button";
import { CrmNotificationsPanel } from "@/components/crm-notifications-panel";
import { useCrmRestaurant } from "@/components/use-crm-restaurant";
import { emitCrmRefresh } from "@/lib/crm-refresh-bus";

/** Stitch crm_2 — top bar (search, actions) */
export function CrmTopHeader() {
  const router = useRouter();
  const { restaurantId } = useCrmRestaurant();
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const openSearch = useCallback(() => {
    setNotifOpen(false);
    setSearchOpen(true);
  }, []);

  const sync = useCallback(() => {
    setSyncing(true);
    emitCrmRefresh();
    router.refresh();
    window.setTimeout(() => setSyncing(false), 600);
  }, [router]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === "k") {
        e.preventDefault();
        openSearch();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openSearch]);

  return (
    <>
      <header className="fixed left-64 right-0 top-0 z-40 flex h-16 items-center justify-between border-b border-border/60 bg-background/80 px-8 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg bg-surface-container-low px-3 py-1.5">
            <MaterialIcon name="lock" className="text-[16px] text-primary" />
            <span className="text-xs font-semibold text-on-surface-variant">d-amigos.in/portal</span>
          </div>
          <CrmGuestStorefrontToggle restaurantId={restaurantId} compact />
        </div>
        <div className="relative flex items-center gap-4">
          <button
            type="button"
            onClick={openSearch}
            className="hidden items-center gap-2 rounded-lg bg-surface-container-low px-3 py-1.5 text-xs font-semibold text-on-surface-variant transition hover:bg-surface-container-high hover:text-foreground md:flex"
          >
            <MaterialIcon name="search" className="text-[18px]" />
            <span>Search guest, table or order…</span>
            <span className="rounded bg-surface-container-high px-1.5 py-0.5 text-[10px]">⌘K</span>
          </button>
          <button
            type="button"
            aria-label="Search"
            onClick={openSearch}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high md:hidden"
          >
            <MaterialIcon name="search" className="text-[20px]" />
          </button>
          <div className="relative">
            <button
              type="button"
              aria-label="Notifications"
              aria-expanded={notifOpen}
              onClick={() => {
                setSearchOpen(false);
                setNotifOpen((v) => !v);
              }}
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high"
            >
              <MaterialIcon name="notifications" className="text-[20px]" />
            </button>
            <CrmNotificationsPanel
              open={notifOpen}
              onClose={() => setNotifOpen(false)}
              restaurantId={restaurantId}
            />
          </div>
          <button
            type="button"
            aria-label="Refresh"
            onClick={sync}
            disabled={syncing}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high disabled:opacity-60"
          >
            <MaterialIcon
              name="sync"
              className={`text-[20px] ${syncing ? "animate-spin" : ""}`}
            />
          </button>
          <CrmLogoutButton variant="header" />
        </div>
      </header>
      <CrmCommandPalette open={searchOpen} onClose={() => setSearchOpen(false)} restaurantId={restaurantId} />
    </>
  );
}
