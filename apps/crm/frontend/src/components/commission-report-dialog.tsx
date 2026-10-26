"use client";

import { useState } from "react";
import { MaterialIcon } from "@/components/material-icon";
import { downloadTextPdf } from "@/lib/download-text-pdf";
import { formatInr } from "@/lib/api";

export type CommissionReportOverview = {
  hubLabel: string;
  savingsPaise: number;
  aggregatorRatePct: number;
  periodLabel: string;
  directGmvPaise: number;
  avoidedCommissionPaise: number;
};

type Props = {
  open: boolean;
  onClose: () => void;
  report: CommissionReportOverview;
};

export function CommissionReportDialog({ open, onClose, report }: Props) {
  const [exporting, setExporting] = useState(false);

  if (!open) return null;

  function onExportPdf() {
    setExporting(true);
    try {
      const stamp = new Date().toISOString().slice(0, 10);
      downloadTextPdf(`damigos-commission-report-${stamp}.pdf`, "D'aMigo Commission Report", [
        `Hub: ${report.hubLabel}`,
        `Period: ${report.periodLabel}`,
        "",
        `Net savings vs ${report.aggregatorRatePct}% aggregator: ${formatInr(report.savingsPaise)}`,
        `Estimated direct GMV: ${formatInr(report.directGmvPaise)}`,
        `Avoided commission (at ${report.aggregatorRatePct}%): ${formatInr(report.avoidedCommissionPaise)}`,
        "",
        "Engine: 0% commission direct WhatsApp ordering",
        "Note: Pure bottom-line margin expansion vs 3rd-party food apps.",
        "",
        `Generated: ${new Date().toLocaleString("en-IN")}`,
      ]);
    } finally {
      window.setTimeout(() => setExporting(false), 400);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="commission-report-title"
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 px-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-border/60 bg-background shadow-2xl">
        <header className="flex items-start justify-between gap-3 border-b border-border/60 px-5 py-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#b8860b]">
              0% Commission Direct Engine
            </p>
            <h2 id="commission-report-title" className="font-[family-name:var(--font-display)] text-lg font-bold">
              Overview
            </h2>
            <p className="text-xs text-on-surface-variant">{report.hubLabel} · {report.periodLabel}</p>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="rounded-lg p-1 text-on-surface-variant hover:bg-surface-container-low hover:text-foreground"
          >
            <MaterialIcon name="close" className="text-[20px]" />
          </button>
        </header>

        <div className="space-y-4 px-5 py-4">
          <div className="rounded-xl bg-inverse-surface p-4 text-inverse-on-surface">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#ffdea3]">Net savings</p>
            <p className="mt-1 font-[family-name:var(--font-display)] text-3xl font-extrabold">
              {formatInr(report.savingsPaise)}
            </p>
            <p className="mt-1 text-xs text-white/75">
              vs {report.aggregatorRatePct}% 3rd-party food aggregator commissions
            </p>
          </div>

          <dl className="grid gap-2 text-sm">
            <div className="flex justify-between gap-3 rounded-lg bg-surface-container-low px-3 py-2">
              <dt className="text-on-surface-variant">Direct GMV (est.)</dt>
              <dd className="font-semibold tabular-nums">{formatInr(report.directGmvPaise)}</dd>
            </div>
            <div className="flex justify-between gap-3 rounded-lg bg-surface-container-low px-3 py-2">
              <dt className="text-on-surface-variant">Avoided commission</dt>
              <dd className="font-semibold tabular-nums">{formatInr(report.avoidedCommissionPaise)}</dd>
            </div>
            <div className="flex justify-between gap-3 rounded-lg bg-surface-container-low px-3 py-2">
              <dt className="text-on-surface-variant">D'aMigo's take rate</dt>
              <dd className="font-semibold text-[#24963F]">0%</dd>
            </div>
          </dl>

          <p className="flex items-center gap-2 text-xs text-on-surface-variant">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Pure bottom-line margin expansion
          </p>
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-border/60 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold text-on-surface-variant hover:bg-surface-container-low"
          >
            Close
          </button>
          <button
            type="button"
            disabled={exporting}
            onClick={onExportPdf}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-bold text-primary-foreground hover:opacity-90 disabled:opacity-60"
          >
            <MaterialIcon name="download" className="text-[16px]" />
            {exporting ? "Exporting…" : "Export PDF"}
          </button>
        </footer>
      </div>
    </div>
  );
}
