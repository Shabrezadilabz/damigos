"use client";

import Link from "next/link";
import { MaterialIcon } from "@/components/material-icon";

type Props = {
  title: string;
  subtitle?: string;
  creditsLabel?: string;
  profileHref?: string;
  showClose?: boolean;
};

/** WhatsApp in-app webview chrome — Stitch g* + DEC-016 */
export function WaChrome({
  title,
  subtitle = "Packaging Delivery · Direct D2C",
  creditsLabel,
  profileHref = "/me",
  showClose = true,
}: Props) {
  return (
    <header className="glass-header fixed inset-x-0 top-0 z-50 border-b border-border/40 pt-safe shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
      <div className="mx-auto flex max-w-lg flex-col">
        <div className="flex h-11 items-center justify-between px-4">
          <div className="flex items-center gap-1.5 text-on-surface-variant">
            <MaterialIcon name="lock" className="text-[15px] text-tertiary" />
            <span className="text-xs font-semibold tracking-tight">d-amigos.in</span>
            <span className="mx-0.5 h-1 w-1 rounded-full bg-border" />
            <MaterialIcon name="verified" className="text-[15px] text-tertiary-container" />
            <span className="text-[10px] font-bold uppercase tracking-wider">WhatsApp</span>
          </div>
          <div className="flex items-center">
            <button
              type="button"
              aria-label="Refresh"
              className="pressable flex h-11 w-11 items-center justify-center text-on-surface-variant"
              onClick={() => window.location.reload()}
            >
              <MaterialIcon name="refresh" className="text-[18px]" />
            </button>
            {showClose ? (
              <button
                type="button"
                aria-label="Close"
                className="pressable flex h-11 w-11 items-center justify-center text-on-surface-variant"
                onClick={() => window.history.back()}
              >
                <MaterialIcon name="close" className="text-[20px]" />
              </button>
            ) : null}
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 px-4 pb-2.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary">
              <MaterialIcon name="restaurant" className="text-[20px] text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <p className="font-display truncate text-[15px] font-semibold leading-5">{title}</p>
              <p className="truncate text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                {subtitle}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {creditsLabel ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-tertiary-fixed px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-tertiary-container">
                <MaterialIcon name="stars" className="text-[14px] text-tertiary" />
                {creditsLabel}
              </span>
            ) : null}
            <Link
              href={profileHref}
              className="pressable flex h-8 w-8 items-center justify-center rounded-full bg-primary"
            >
              <MaterialIcon name="person" className="text-[18px] text-primary-foreground" />
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
