"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { MaterialIcon } from "@/components/material-icon";
import { fetchDeliveryConfig, formatInr, requestDeliveryQuote } from "@/lib/api";
import {
  formatAddressHeadline,
  formatDeliveryAddressText,
  getActiveAddress,
  GUEST_ADDRESS_CHANGED,
  readGuestAddresses,
  setActiveAddressId,
  type GuestSavedAddress,
} from "@/lib/guest-addresses";

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
  const [saved, setSaved] = useState<GuestSavedAddress[]>([]);
  const [active, setActive] = useState<GuestSavedAddress | null>(null);
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
  const [gpsBusy, setGpsBusy] = useState(false);
  const [gpsNote, setGpsNote] = useState<string | null>(null);

  const syncSaved = useCallback(() => {
    const rows = readGuestAddresses();
    const cur = getActiveAddress();
    setSaved(rows);
    setActive(cur);
    if (cur?.pincode?.length === 6) setPincode(cur.pincode);
  }, []);

  useEffect(() => {
    syncSaved();
    window.addEventListener(GUEST_ADDRESS_CHANGED, syncSaved);
    window.addEventListener("storage", syncSaved);
    return () => {
      window.removeEventListener(GUEST_ADDRESS_CHANGED, syncSaved);
      window.removeEventListener("storage", syncSaved);
    };
  }, [syncSaved]);

  const runQuote = useCallback(async () => {
    if (mode === "off" || pincode.length !== 6) return;
    setLoading(true);
    setError(null);
    try {
      const q = await requestDeliveryQuote(
        restaurantId,
        pincode,
        formatDeliveryAddressText(active) ??
          (active ? `${active.label}, PIN ${active.pincode}` : null),
      );
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
  }, [active, mode, onQuoted, onPayAllowedChange, pincode, restaurantId]);

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

  function pickSaved(row: GuestSavedAddress) {
    setActiveAddressId(row.id);
    setActive(row);
    setPincode(row.pincode);
    setQuote(null);
    setError(null);
    setGpsNote(null);
  }

  async function requestGps() {
    setGpsBusy(true);
    setGpsNote(null);
    setError(null);
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setError("Location is not supported on this device. Enter a pincode or pick a saved address.");
      window.alert("Location services are not available. Turn on GPS or enter your pincode.");
      setGpsBusy(false);
      return;
    }
    await new Promise<void>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const { latitude, longitude } = pos.coords;
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`,
              { headers: { Accept: "application/json" } },
            );
            const data = (await res.json()) as {
              address?: { postcode?: string; suburb?: string; neighbourhood?: string; city?: string };
            };
            const pin = (data.address?.postcode ?? "").replace(/\D/g, "").slice(0, 6);
            if (pin.length === 6) {
              setPincode(pin);
              setGpsNote(
                [
                  data.address?.suburb || data.address?.neighbourhood || data.address?.city,
                  `PIN ${pin}`,
                ]
                  .filter(Boolean)
                  .join(" · "),
              );
              setQuote(null);
            } else {
              setGpsNote("GPS on — could not read pincode. Enter PIN manually.");
              window.alert("GPS is on, but we could not read a 6-digit pincode. Please enter it manually.");
            }
          } catch {
            setGpsNote("GPS on — enter pincode to continue.");
            window.alert("Got your location, but lookup failed. Please enter your pincode.");
          } finally {
            setGpsBusy(false);
            resolve();
          }
        },
        (err) => {
          const denied = err.code === err.PERMISSION_DENIED;
          const msg = denied
            ? "Location permission is off. Turn on GPS / allow location for this site, or enter a pincode."
            : "Could not read GPS. Turn on location services or enter a pincode.";
          setError(msg);
          window.alert(msg);
          setGpsBusy(false);
          resolve();
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
      );
    });
  }

  if (mode === "off") return null;

  const placeLine = formatAddressHeadline(active, "");
  const pinLine = `Pincode ${pincode || "————"}`;

  return (
    <>
      <div className="rounded-lg border border-border bg-surface-container-lowest p-3" data-testid="checkout-delivery">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-primary">
              Delivery location
            </p>
            {placeLine ? (
              <p className="mt-0.5 truncate text-[14px] font-semibold">{placeLine}</p>
            ) : null}
            <p className={`text-[13px] ${placeLine ? "text-on-surface-variant" : "mt-0.5 font-semibold"}`}>
              {active?.label ? `${active.label} · ${pinLine}` : pinLine}
            </p>
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
            className="pressable shrink-0 rounded-full bg-primary-fixed px-3 py-1.5 text-[12px] font-bold text-primary"
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
          <div className="relative min-h-[28vh] flex-1 bg-[linear-gradient(180deg,#e8eef5,#f5f5f5)]">
            <div className="absolute inset-0 opacity-40" />
            <div className="absolute left-1/2 top-1/3 -translate-x-1/2">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white shadow-lg ring-4 ring-white">
                <MaterialIcon name="restaurant" className="text-[22px]" />
              </div>
            </div>
          </div>
          <div className="sheet-spring max-h-[62vh] overflow-y-auto rounded-t-[24px] bg-surface-container-lowest px-5 pb-safe pt-3 shadow-2xl">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" />
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-sky-100">
              <MaterialIcon name="location_on" className="text-[32px] text-primary" />
            </div>
            <h3 className="font-display text-center text-[20px] font-bold tracking-tight">
              Confirm drop location
            </h3>
            <p className="mt-1 text-center text-[13px] text-on-surface-variant">
              Turn on GPS for accurate delivery, or use a saved address / pincode.
            </p>
            {gpsNote ? (
              <p className="mt-2 text-center text-[12px] font-semibold text-success">{gpsNote}</p>
            ) : null}

            {saved.length ? (
              <ul className="mt-4 space-y-2" data-testid="checkout-saved-addresses">
                {saved.map((row) => {
                  const selected = active?.id === row.id || pincode === row.pincode;
                  return (
                    <li key={row.id}>
                      <button
                        type="button"
                        className={`pressable flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left ${
                          selected ? "border-primary bg-primary/5" : "border-border bg-surface-container-lowest"
                        }`}
                        onClick={() => pickSaved(row)}
                      >
                        <MaterialIcon name="home" className="text-[22px] text-primary" />
                        <span className="min-w-0 flex-1">
                          <span className="block text-[14px] font-semibold">{row.label}</span>
                          <span className="block text-[12px] text-on-surface-variant">
                            {row.area ? `${row.area} · ` : ""}PIN {row.pincode}
                          </span>
                        </span>
                        {selected ? (
                          <MaterialIcon name="check_circle" className="text-[20px] text-primary" />
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : null}

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
              variant="outline"
              className="pressable mt-4 w-full"
              disabled={gpsBusy}
              onClick={() => void requestGps()}
              data-testid="checkout-grant-gps"
            >
              <MaterialIcon name="my_location" className="text-[18px]" />
              {gpsBusy ? "Reading GPS…" : "Turn on GPS / grant location"}
            </Button>
            <Button
              type="button"
              className="pressable mt-2 w-full"
              disabled={loading || pincode.length !== 6}
              onClick={() => void runQuote()}
            >
              {loading ? "Checking…" : "Confirm & get delivery fee"}
            </Button>
            <a
              href="/me/addresses"
              className="pressable mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-border px-3 text-[14px] font-semibold text-on-surface-variant"
            >
              <MaterialIcon name="add_location" className="text-[18px]" />
              Manage saved addresses
            </a>
          </div>
        </div>
      ) : null}
    </>
  );
}
