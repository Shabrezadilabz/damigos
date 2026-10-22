"use client";

import { useEffect, useState } from "react";
import { MaterialIcon } from "@/components/material-icon";

/** Soft banner — does not block kitchen order tracking. */
export function KotPrintToast({
  message,
  onDone,
  ms = 3200,
}: {
  message: string | null;
  onDone: () => void;
  ms?: number;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!message) {
      setVisible(false);
      return;
    }
    setVisible(true);
    const t = window.setTimeout(() => {
      setVisible(false);
      onDone();
    }, ms);
    return () => window.clearTimeout(t);
  }, [message, ms, onDone]);

  if (!message || !visible) return null;

  return (
    <div
      className="fixed bottom-4 left-1/2 z-[80] w-[min(100vw-1.5rem,24rem)] -translate-x-1/2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 shadow-lg"
      role="status"
      data-testid="kot-print-toast"
    >
      <div className="flex items-start gap-2">
        <MaterialIcon name="print_disabled" className="mt-0.5 shrink-0 text-[20px] text-amber-800" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-amber-950">{message}</p>
          <p className="mt-0.5 text-[11px] text-amber-900/80">
            Order continues on the board — connect a printer in Settings → KOT print.
          </p>
        </div>
        <button
          type="button"
          className="rounded-lg p-1 text-amber-900 hover:bg-amber-100"
          onClick={() => {
            setVisible(false);
            onDone();
          }}
          aria-label="Dismiss"
        >
          <MaterialIcon name="close" className="text-[18px]" />
        </button>
      </div>
    </div>
  );
}
