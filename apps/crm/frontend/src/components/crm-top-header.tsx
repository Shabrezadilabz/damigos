"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MaterialIcon } from "@/components/material-icon";
import { useCrmShell } from "@/components/crm-shell";
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
  const { navOpen, toggleNav } = useCrmShell();
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
      <header className="fixed left-0 right-0 top-0 z-40 flex h-14 items-center justify-between gap-2 border-b border-zinc-200/70 bg-[#FAFAFA]/80 px-3 backdrop-blur sm:h-16 sm:px-5 md:px-6 lg:left-64 lg:px-8">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <button
            type="button"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high lg:hidden"
            onClick={toggleNav}
            aria-label={navOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={navOpen}
            aria-controls="crm-sidebar"
            data-testid="crm-nav-toggle"
          >
            <MaterialIcon name={navOpen ? "close" : "menu"} className="text-[22px]" />
          </button>
          <div className="hidden min-w-0 items-center gap-2 rounded-lg bg-surface-container-low px-3 py-1.5 sm:flex">
            <MaterialIcon name="lock" className="shrink-0 text-[16px] text-primary" />
            <span className="truncate text-xs font-semibold text-on-surface-variant">
              d-amigos.in/portal
            </span>
          </div>
          <div className="hidden min-w-0 md:block">
            <CrmGuestStorefrontToggle restaurantId={restaurantId} compact />
          </div>
        </div>
        <div className="relative flex shrink-0 items-center gap-1.5 sm:gap-2 md:gap-4">
          <button
            type="button"
            onClick={openSearch}
            className="hidden items-center gap-2 rounded-lg bg-surface-container-low px-3 py-1.5 text-xs font-semibold text-on-surface-variant transition hover:bg-surface-container-high hover:text-foreground md:flex"
          >
            <MaterialIcon name="search" className="text-[18px]" />
            <span className="hidden lg:inline">Search guest, table or order…</span>
            <span className="lg:hidden">Search</span>
            <span className="hidden rounded bg-surface-container-high px-1.5 py-0.5 text-[10px] xl:inline">
              ⌘K
            </span>
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
            <MaterialIcon name="sync" className={`text-[20px] ${syncing ? "animate-spin" : ""}`} />
          </button>
          <div className="hidden sm:block">
            <CrmLogoutButton variant="header" />
          </div>
        </div>
      </header>
      <CrmCommandPalette open={searchOpen} onClose={() => setSearchOpen(false)} restaurantId={restaurantId} />
    </>
  );
}
