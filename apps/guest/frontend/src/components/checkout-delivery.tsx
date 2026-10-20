"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { MaterialIcon } from "@/components/material-icon";
import { fetchDeliveryConfig, formatInr, requestDeliveryQuote } from "@/lib/api";

type Props = {
  restaurantId: string;
  onQuoted: () => void;
  /** When delivery quotes are on, false until a serviceable quote succeeds */
  onPayAllowedChange?: (allowed: boolean) => void;
};

const DEFAULT_PIN = "560034";

/** G-04.02 / G-04.03 + Ownly location sheet pattern (DEC-016) */
export function CheckoutDelivery({ restaurantId, onQuoted, onPayAllowedChange }: Props) {
  const [mode, setMode] = useState<"off" | "mock" | "sandbox" | "live">("off");
  const [pincode, setPincode] = useState(DEFAULT_PIN);
  const [quote, setQuote] = useState<{
    deliveryFeePaise: number;
    shiprocketRatePaise: number;
    platformMarkupPaise: number;
    grossDeliveryFeePaise: number;
    firstOrderFree: boolean;
    subsidyLabel: string | null;
    etaMinutes: number;
    foodFriendly?: boolean;
    foodDeliveryLabel?: string | null;
    courierName?: string | null;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [locSheet, setLocSheet] = useState(false);

  const runQuote = useCallback(async () => {
    if (mode === "off" || pincode.length !== 6) return;
    setLoading(true);
    setError(null);
    try {
      const q = await requestDeliveryQuote(restaurantId, pincode);
      setQuote({
        deliveryFeePaise: q.deliveryFeePaise,
        shiprocketRatePaise: q.shiprocketRatePaise,
        platformMarkupPaise: q.platformMarkupPaise,
        grossDeliveryFeePaise: q.grossDeliveryFeePaise ?? q.deliveryFeePaise,
        firstOrderFree: Boolean(q.firstOrderFree),
        subsidyLabel: q.subsidyLabel ?? null,
        etaMinutes: q.etaMinutes,
        foodFriendly: q.foodFriendly,
        foodDeliveryLabel: q.foodDeliveryLabel ?? null,
        courierName: q.courierName ?? null,
      });
      onPayAllowedChange?.(true);
      onQuoted();
      setLocSheet(false);
    } catch (e) {
      setQuote(null);
      onPayAllowedChange?.(false);
      setError(e instanceof Error ? e.message : "Quote failed");
    } finally {
      setLoading(false);
    }
  }, [mode, onQuoted, onPayAllowedChange, pincode, restaurantId]);

  useEffect(() => {
    void fetchDeliveryConfig()
      .then((c) => {
        setMode(c.mode);
        if (c.mode === "off") onPayAllowedChange?.(true);
        else setLocSheet(true);
      })
      .catch(() => {
        setMode("off");
        onPayAllowedChange?.(true);
      });
  }, [onPayAllowedChange]);

  useEffect(() => {
    if (mode === "off" || pincode.length !== 6) return;
    onPayAllowedChange?.(false);
    const t = window.setTimeout(() => void runQuote(), 250);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, pincode, restaurantId]);

  if (mode === "off") return null;

  return (
    <>
      <div className="rounded-2xl border border-border bg-surface-container-lowest p-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-primary">
              Delivery location
            </p>
            <p className="mt-0.5 text-[14px] font-semibold">Pincode {pincode || "————"}</p>
            {quote ? (
              <div className="mt-1 text-[12px] text-on-surface-variant">
                {quote.firstOrderFree ? (
                  <p>
                    <span className="tabular line-through opacity-60">
                      {formatInr(quote.grossDeliveryFeePaise)}
                    </span>{" "}
                    <span className="font-bold text-success">FREE</span>
                    <span className="mt-0.5 block text-[11px] font-semibold text-primary">
                      {quote.subsidyLabel ?? "First-Order FREE Delivery"}
                    </span>
                  </p>
                ) : (
                  <p>
                    Shiprocket + {formatInr(quote.platformMarkupPaise)}:{" "}
                    <span className="font-semibold tabular text-foreground">
                      {formatInr(quote.deliveryFeePaise)}
                    </span>
                  </p>
                )}
                <p className="mt-0.5">~{quote.etaMinutes} min food delivery</p>
                {quote.foodDeliveryLabel ? (
                  <p className="mt-0.5 text-[11px] font-semibold text-primary">
                    {quote.foodDeliveryLabel}
                    {quote.courierName ? ` · ${quote.courierName}` : ""}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
          <button
            type="button"
            className="pressable rounded-full bg-primary-fixed px-3 py-1.5 text-[12px] font-bold text-primary"
            onClick={() => setLocSheet(true)}
          >
            Edit
          </button>
        </div>
        {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
      </div>

      {locSheet ? (
        <div className="fixed inset-0 z-50 flex flex-col bg-surface-container-low">
          <div className="flex items-center gap-2 px-4 pb-2 pt-safe">
            <button
              type="button"
              className="pressable flex h-11 w-11 items-center justify-center"
              onClick={() => setLocSheet(false)}
              aria-label="Back"
            >
              <MaterialIcon name="arrow_back" className="text-[22px]" />
            </button>
            <h2 className="font-display text-[17px] font-bold">Select delivery location</h2>
          </div>
          <div className="relative min-h-[40vh] flex-1 bg-[linear-gradient(180deg,#e8eef5,#f5f5f5)]">
            <div className="absolute inset-0 opacity-40" />
            <div className="absolute left-1/2 top-1/3 -translate-x-1/2">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white shadow-lg ring-4 ring-white">
                <MaterialIcon name="restaurant" className="text-[22px]" />
              </div>
            </div>
          </div>
          <div className="sheet-spring rounded-t-[24px] bg-surface-container-lowest px-5 pb-safe pt-3 shadow-2xl">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" />
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-sky-100">
              <MaterialIcon name="location_on" className="text-[32px] text-primary" />
            </div>
            <h3 className="font-display text-center text-[20px] font-bold tracking-tight">
              Device location is off
            </h3>
            <p className="mt-1 text-center text-[13px] text-on-surface-variant">
              Granting location permission will ensure accurate address and hassle-free delivery.
            </p>
            <label className="mt-4 block text-[13px] font-semibold">
              Pincode
              <input
                className="mt-1.5 h-12 w-full rounded-xl border border-border px-3 text-[16px] tabular tracking-widest outline-none focus:ring-2 focus:ring-primary/30"
                inputMode="numeric"
                maxLength={6}
                value={pincode}
                onChange={(e) => {
                  setPincode(e.target.value.replace(/\D/g, "").slice(0, 6));
                  setQuote(null);
                  setError(null);
                }}
              />
            </label>
            <Button
              type="button"
              className="pressable mt-4 w-full"
              disabled={loading || pincode.length !== 6}
              onClick={() => void runQuote()}
            >
              <MaterialIcon name="my_location" className="text-[18px]" />
              {loading ? "Checking…" : "Grant location permission"}
            </Button>
            <button
              type="button"
              className="pressable mt-2 flex h-12 w-full items-center gap-2 rounded-xl border border-border px-3 text-[14px] text-on-surface-variant"
              onClick={() => setLocSheet(false)}
            >
              <MaterialIcon name="search" className="text-[18px]" />
              Search an area or address
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
