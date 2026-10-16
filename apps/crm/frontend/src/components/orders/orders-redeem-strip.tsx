"use client";

import Link from "next/link";
import { MaterialIcon } from "@/components/material-icon";

/** Bottom peek strip — links to full counter terminal (Stitch crm_5 redeem strip). */
export function OrdersRedeemStrip() {
  return (
    <div
      id="counter-redeem-strip"
      className="flex flex-col gap-3 rounded-2xl border border-dashed border-outline-variant/40 bg-surface-container-low/80 p-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-fixed text-on-primary-fixed">
          <MaterialIcon name="loyalty" className="text-[22px]" />
        </div>
        <div>
          <p className="text-sm font-semibold text-on-surface">Counter loyalty validation</p>
          <p className="text-xs text-on-surface-variant">
            Burn spin/scratch rewards or wallet credits at the register — full terminal view.
          </p>
        </div>
      </div>
      <Link
        href="/orders/redeem"
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary shadow-sm hover:bg-secondary"
      >
        <MaterialIcon name="open_in_new" className="text-[18px]" />
        Open redeem terminal
      </Link>
    </div>
  );
}
