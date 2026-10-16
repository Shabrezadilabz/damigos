"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { fetchDeliveryConfig, formatInr, requestDeliveryQuote } from "@/lib/api";

type Props = {
  restaurantId: string;
  onQuoted: () => void;
  /** When DELIVERY_MODE=mock, false until a serviceable quote succeeds */
  onPayAllowedChange?: (allowed: boolean) => void;
};

const DEFAULT_PIN = "560034";

/** G-04.02 / G-04.03 */
export function CheckoutDelivery({ restaurantId, onQuoted, onPayAllowedChange }: Props) {
  const [mode, setMode] = useState<"off" | "mock">("off");
  const [pincode, setPincode] = useState(DEFAULT_PIN);
  const [quote, setQuote] = useState<{
    deliveryFeePaise: number;
    shiprocketRatePaise: number;
    platformMarkupPaise: number;
    etaMinutes: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
        etaMinutes: q.etaMinutes,
      });
      onPayAllowedChange?.(true);
      onQuoted();
    } catch (e) {
      setQuote(null);
      onPayAllowedChange?.(false);
      setError(e instanceof Error ? e.message : "Quote failed");
    } finally {
      setLoading(false);
    }
  }, [mode, onQuoted, pincode, restaurantId]);

  useEffect(() => {
    void fetchDeliveryConfig()
      .then((c) => {
        setMode(c.mode);
        if (c.mode === "off") onPayAllowedChange?.(true);
      })
      .catch(() => {
        setMode("off");
        onPayAllowedChange?.(true);
      });
  }, [onPayAllowedChange]);

  useEffect(() => {
    if (mode !== "mock" || pincode.length !== 6) return;
    onPayAllowedChange?.(false);
    const t = window.setTimeout(() => void runQuote(), 250);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- quote when pincode/mode changes only
  }, [mode, pincode, restaurantId]);

  if (mode === "off") return null;

  return (
    <div className="rounded-xl border border-border p-3">
      <p className="text-xs font-bold uppercase tracking-wide text-primary">Delivery address</p>
      <label className="mt-2 block text-sm">
        Pincode
        <input
          className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm tabular-nums tracking-widest"
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
      {quote && (
        <p className="mt-2 text-sm text-foreground/80">
          Delivery (Shiprocket + {formatInr(quote.platformMarkupPaise)}):{" "}
          <span className="font-semibold tabular-nums">{formatInr(quote.deliveryFeePaise)}</span>
          <span className="text-xs text-foreground/60"> · ~{quote.etaMinutes} min</span>
        </p>
      )}
      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="mt-3"
        disabled={loading || pincode.length !== 6}
        onClick={() => void runQuote()}
      >
        {loading ? "Updating…" : "Update delivery quote"}
      </Button>
    </div>
  );
}
