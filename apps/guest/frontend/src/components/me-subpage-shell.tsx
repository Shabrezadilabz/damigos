"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { MaterialIcon } from "@/components/material-icon";

export function MeSubpageShell({
  title,
  children,
  backHref = "/me",
  backLabel = "Back to profile",
}: {
  title: string;
  children: ReactNode;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <main className="min-h-dvh bg-background pb-10">
      <div className="relative border-b border-border bg-surface-container-low px-4 pb-8 pt-safe text-foreground">
        <div className="flex items-center justify-between py-3">
          <Link
            href={backHref}
            className="pressable flex h-11 w-11 items-center justify-center rounded-md border border-border bg-surface-container"
            aria-label={backLabel}
          >
            <MaterialIcon name="arrow_back" className="text-[22px]" />
          </Link>
          <h1 className="font-display text-[18px] font-bold tracking-tight">{title}</h1>
          <span className="w-11" aria-hidden />
        </div>
      </div>
      <div className="-mt-4 rounded-t-xl border border-border bg-surface-container-lowest px-4 pt-5 shadow-sm">
        {children}
      </div>
    </main>
  );
}
