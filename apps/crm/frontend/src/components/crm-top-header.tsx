"use client";

import { MaterialIcon } from "@/components/material-icon";
import { CrmGuestStorefrontToggle } from "@/components/crm-guest-storefront-toggle";
import { CrmLogoutButton } from "@/components/crm-logout-button";
import { useCrmRestaurant } from "@/components/use-crm-restaurant";

/** Stitch crm_2 — top bar (search, actions) */
export function CrmTopHeader() {
  const { restaurantId } = useCrmRestaurant();

  return (
    <header className="fixed left-64 right-0 top-0 z-40 flex h-16 items-center justify-between border-b border-border/60 bg-background/80 px-8 backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 rounded-lg bg-surface-container-low px-3 py-1.5">
          <MaterialIcon name="lock" className="text-[16px] text-primary" />
          <span className="text-xs font-semibold text-on-surface-variant">d-amigos.in/portal</span>
        </div>
        <CrmGuestStorefrontToggle restaurantId={restaurantId} compact />
      </div>
      <div className="flex items-center gap-4">
        <button
          type="button"
          className="hidden items-center gap-2 rounded-lg bg-surface-container-low px-3 py-1.5 text-xs font-semibold text-on-surface-variant transition hover:bg-surface-container-high hover:text-foreground md:flex"
        >
          <MaterialIcon name="search" className="text-[18px]" />
          <span>Search guest, table or order…</span>
          <span className="rounded bg-surface-container-high px-1.5 py-0.5 text-[10px]">⌘K</span>
        </button>
        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high"
        >
          <MaterialIcon name="notifications" className="text-[20px]" />
        </button>
        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high"
        >
          <MaterialIcon name="sync" className="text-[20px]" />
        </button>
        <CrmLogoutButton variant="header" />
      </div>
    </header>
  );
}
