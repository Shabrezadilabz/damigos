"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MaterialIcon } from "@/components/material-icon";
import {
  readKitchenSoundOn,
  stopKitchenRing,
  writeKitchenSoundOn,
} from "@/lib/kitchen-alert-audio";
import { cn } from "@/lib/utils";

export type OrdersViewMode = "list" | "kitchen" | "stock";

export function OrdersActionRail({
  mode,
  connectionLabel,
  onRefresh,
  soundOn: soundOnProp,
  onSoundChange,
}: {
  mode: OrdersViewMode;
  connectionLabel?: string;
  onRefresh?: () => void;
  soundOn?: boolean;
  onSoundChange?: (on: boolean) => void;
}) {
  const [countdown, setCountdown] = useState(30);
  const [soundOnLocal, setSoundOnLocal] = useState(true);
  const soundOn = soundOnProp ?? soundOnLocal;

  useEffect(() => {
    setSoundOnLocal(readKitchenSoundOn());
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      setCountdown((s) => (s <= 1 ? 30 : s - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  function toggleSound() {
    const next = !soundOn;
    writeKitchenSoundOn(next);
    setSoundOnLocal(next);
    onSoundChange?.(next);
    if (!next) stopKitchenRing();
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      void document.documentElement.requestFullscreen().catch(() => undefined);
    } else {
      void document.exitFullscreen?.().catch(() => undefined);
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-surface-container-lowest p-3 shadow-[0_2px_8px_-2px_rgba(28,28,28,0.04)]">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 rounded-lg bg-surface-container-low p-1">
          <Link
            href="/orders"
            className={cn(
              "flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all",
              mode === "list"
                ? "bg-surface-container-lowest text-primary shadow-sm"
                : "text-on-surface-variant hover:text-on-surface",
            )}
          >
            <MaterialIcon name="format_list_bulleted" className="text-[18px]" />
            List view
          </Link>
          <Link
            href="/orders/kitchen"
            className={cn(
              "flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all",
              mode === "kitchen"
                ? "bg-surface-container-lowest text-primary shadow-sm"
                : "text-on-surface-variant hover:text-on-surface",
            )}
          >
            <MaterialIcon name="restaurant" className="text-[18px]" />
            Kitchen mode
            {mode === "kitchen" ? (
              <span className="h-2 w-2 animate-pulse rounded-full bg-primary" aria-hidden />
            ) : null}
          </Link>
          <Link
            href="/orders/stock"
            className={cn(
              "flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all",
              mode === "stock"
                ? "bg-surface-container-lowest text-primary shadow-sm"
                : "text-on-surface-variant hover:text-on-surface",
            )}
            data-testid="orders-menu-stock-tab"
          >
            <MaterialIcon name="toggle_on" className="text-[18px]" />
            Menu 86
          </Link>
        </div>
        {mode === "kitchen" && connectionLabel ? (
          <>
            <div className="hidden h-6 w-px bg-surface-container-high sm:block" />
            <p
              className="hidden max-w-md text-xs text-on-surface-variant md:block"
              data-testid="kitchen-connection-status"
            >
              {connectionLabel}
            </p>
          </>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {mode === "kitchen" ? (
          <>
            <button
              type="button"
              className="flex items-center gap-2 rounded-lg bg-surface-container-low px-3 py-2 text-on-surface transition-colors hover:bg-surface-container-high"
              onClick={toggleSound}
              data-testid="kitchen-sound-toggle"
              title="5s ring on new order · different 5s ring + dialog on SLA breach"
            >
              <MaterialIcon name={soundOn ? "volume_up" : "volume_off"} className="text-[19px] text-primary" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                Sound {soundOn ? "ON" : "OFF"}
              </span>
            </button>
            <div className="flex items-center gap-2 rounded-lg bg-surface-container-low px-3 py-2 text-on-surface-variant">
              <MaterialIcon name="autorenew" className="animate-spin text-[18px] text-secondary [animation-duration:12s]" />
              <span className="text-xs font-semibold">
                Plan B — refresh <span className="font-bold text-primary">{countdown}s</span>
              </span>
            </div>
            <button
              type="button"
              className="hidden items-center gap-2 rounded-lg bg-surface-container-low px-3 py-2 text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface lg:flex"
              onClick={() => toggleFullscreen()}
            >
              <MaterialIcon name="fullscreen" className="text-[18px]" />
              <span className="text-xs font-semibold">Full-screen</span>
            </button>
            <a
              href="#orders-history-section"
              className="flex items-center gap-1.5 rounded-lg bg-surface-container px-3 py-2 text-xs font-semibold text-secondary transition-colors hover:bg-surface-container-high"
            >
              <MaterialIcon name="history" className="text-[18px]" />
              History
            </a>
          </>
        ) : null}
        {onRefresh ? (
          <button
            type="button"
            className="flex items-center gap-2 rounded-lg bg-surface-container-low px-3 py-2 text-xs font-semibold text-on-surface-variant hover:bg-surface-container-high"
            onClick={() => onRefresh()}
          >
            <MaterialIcon name="sync" className="text-[18px]" />
            Refresh
          </button>
        ) : null}
        <Link
          href="/orders/redeem"
          className="flex items-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-on-primary shadow-sm transition-colors hover:bg-secondary"
          data-testid="orders-redeem-counter"
        >
          <MaterialIcon name="redeem" className="text-[18px]" />
          Redeem Counter
        </Link>
      </div>
    </div>
  );
}
