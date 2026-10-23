"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { MaterialIcon } from "@/components/material-icon";

export function MeSubpageShell({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-dvh bg-surface-container-low pb-10">
      <div className="relative bg-gradient-to-b from-primary to-[#92001c] px-4 pb-10 pt-safe">
        <div className="flex items-center justify-between py-3">
          <Link
            href="/me"
            className="pressable flex h-11 w-11 items-center justify-center text-white"
            aria-label="Back to profile"
          >
            <MaterialIcon name="arrow_back" className="text-[22px]" />
          </Link>
          <h1 className="font-display text-[18px] font-bold text-white">{title}</h1>
          <span className="w-11" aria-hidden />
        </div>
      </div>
      <div className="-mt-6 rounded-t-[1.75rem] bg-[#fafafa] px-4 pt-6">{children}</div>
    </main>
  );
}
