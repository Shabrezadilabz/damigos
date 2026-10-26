"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/** iOS / CRED tactile bottom sheet with grabber pill */
export function Sheet({
  open,
  onClose,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog">
      <button
        type="button"
        className="absolute inset-0 bg-[#0F1115]/45 backdrop-blur-[4px]"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        className={cn(
          "sheet-spring relative z-10 w-full max-w-lg rounded-t-[28px] border border-[#E2E5EE] bg-white p-6 text-[#0F1115] shadow-[0_-12px_40px_rgba(15,23,42,0.16)] sm:rounded-[26px]",
          className,
        )}
      >
        <div className="mx-auto mb-4 h-1.5 w-11 rounded-full bg-[#E2E5EE] sm:hidden" />
        {children}
      </div>
    </div>
  );
}
