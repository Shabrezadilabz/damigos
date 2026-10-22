"use client";

import { useCallback, useEffect, useState } from "react";
import { MaterialIcon } from "@/components/material-icon";
import { Button } from "@/components/ui/button";
import {
  connectKotPrinter,
  disconnectKotPrinter,
  isKotPrinterReady,
  printKotTest,
  readKotPrinterPrefs,
  setKotAutoPrint,
  setKotPaperMm,
  type KotPrinterPrefs,
} from "@/lib/kot-printer";

export function SettingsKotPanel() {
  const [prefs, setPrefs] = useState<KotPrinterPrefs | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const p = readKotPrinterPrefs();
    setPrefs(p);
    setReady(p ? await isKotPrinterReady() : false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function onConnect() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const p = await connectKotPrinter();
      setPrefs(p);
      setReady(true);
      setMessage(`Connected: ${p.productName}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Connect failed");
      setReady(false);
    } finally {
      setBusy(false);
    }
  }

  async function onDisconnect() {
    setBusy(true);
    setError(null);
    try {
      await disconnectKotPrinter();
      setPrefs(null);
      setReady(false);
      setMessage("Printer disconnected");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Disconnect failed");
    } finally {
      setBusy(false);
    }
  }

  async function onTest() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await printKotTest();
      setMessage("Test KOT sent to printer");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Test print failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="col-span-12 space-y-4 rounded-xl border border-outline-variant/60 bg-surface-container-lowest p-4 shadow-sm sm:p-6 lg:col-span-10">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-fixed/50 text-primary">
          <MaterialIcon name="print" className="text-[22px]" />
        </div>
        <div className="min-w-0">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold text-on-surface">
            KOT printer
          </h2>
          <p className="mt-1 text-sm text-on-surface-variant">
            Bring your own ESC/POS printer (Epson, TVS, Rongta, clones). Connect once in Chrome/Edge —
            Accept on the kitchen board auto-prints when connected.
          </p>
        </div>
      </div>

      <div className="rounded-xl bg-surface-container-low p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Status</p>
            <p className="mt-1 text-sm font-semibold text-on-surface">
              {ready && prefs
                ? `Connected · ${prefs.productName}`
                : prefs
                  ? `Saved · ${prefs.productName} (reconnect USB)`
                  : "No printer connected"}
            </p>
          </div>
          <span
            className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${
              ready ? "bg-[#E8F5E9] text-[#24963F]" : "bg-amber-50 text-amber-900"
            }`}
          >
            {ready ? "Ready" : "Offline"}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" className="gap-2" disabled={busy} onClick={() => void onConnect()}>
          <MaterialIcon name="usb" className="text-[18px]" />
          {busy ? "…" : prefs ? "Change printer" : "Connect USB printer"}
        </Button>
        <Button type="button" variant="outline" className="gap-2" disabled={busy || !prefs} onClick={() => void onTest()}>
          <MaterialIcon name="receipt_long" className="text-[18px]" />
          Test print
        </Button>
        {prefs ? (
          <Button type="button" variant="outline" disabled={busy} onClick={() => void onDisconnect()}>
            Disconnect
          </Button>
        ) : null}
      </div>

      {prefs ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex items-center justify-between gap-3 rounded-xl border border-outline-variant/50 px-3 py-2.5 text-sm">
            <span>Auto-print on Accept</span>
            <input
              type="checkbox"
              checked={prefs.autoPrintOnAccept}
              onChange={(e) => {
                setKotAutoPrint(e.target.checked);
                setPrefs(readKotPrinterPrefs());
              }}
            />
          </label>
          <label className="flex items-center justify-between gap-3 rounded-xl border border-outline-variant/50 px-3 py-2.5 text-sm">
            <span>Paper width</span>
            <select
              className="rounded-lg bg-surface-container-low px-2 py-1 text-sm outline-none"
              value={prefs.paperMm}
              onChange={(e) => {
                setKotPaperMm(Number(e.target.value) as 58 | 80);
                setPrefs(readKotPrinterPrefs());
              }}
            >
              <option value={80}>80mm</option>
              <option value={58}>58mm</option>
            </select>
          </label>
        </div>
      ) : null}

      <ul className="list-disc space-y-1 pl-5 text-[11px] text-on-surface-variant">
        <li>Works with ESC/POS 58/80mm: Epson TM-T82, TVS RP-3160, Rongta, generic clones.</li>
        <li>Chrome or Edge on desktop · HTTPS · plug USB into this computer.</li>
        <li>If Accept fires with no printer, a short notice shows — order tracking is not blocked.</li>
      </ul>

      {message ? <p className="text-sm text-[#24963F]">{message}</p> : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </div>
  );
}
