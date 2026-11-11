"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MaterialIcon } from "@/components/material-icon";
import {
  formatAddressHeadline,
  formatAddressSubline,
  getActiveAddressId,
  readGuestAddresses,
  setActiveAddressId,
  upsertGuestAddress,
  type GuestSavedAddress,
} from "@/lib/guest-addresses";

const COORDS_KEY = "damigos_guest_last_coords";

type Props = {
  open: boolean;
  onClose: () => void;
};

type GpsState =
  | { status: "idle" }
  | { status: "locating" }
  | { status: "ok"; area: string; pincode: string }
  | { status: "nopin"; note: string }
  | { status: "denied"; note: string }
  | { status: "error"; note: string };

/** Hub location picker — auto GPS on open + settings link. */
export function HubAddressSheet({ open, onClose }: Props) {
  const [rows, setRows] = useState<GuestSavedAddress[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [gps, setGps] = useState<GpsState>({ status: "idle" });

  useEffect(() => {
    if (!open) {
      setGps({ status: "idle" });
      return;
    }
    setRows(readGuestAddresses());
    setActiveId(getActiveAddressId());
    void locateFromGps();
  }, [open]);

  async function locateFromGps() {
    setGps({ status: "locating" });
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGps({
        status: "error",
        note: "Location is not available on this device. Add a pincode in Settings or Manage addresses.",
      });
      return;
    }

    await new Promise<void>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const { latitude, longitude } = pos.coords;
            try {
              localStorage.setItem(
                COORDS_KEY,
                JSON.stringify({
                  lat: latitude,
                  lng: longitude,
                  at: new Date().toISOString(),
                }),
              );
            } catch {
              /* ignore */
            }

            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`,
              { headers: { Accept: "application/json" } },
            );
            const data = (await res.json()) as {
              address?: {
                postcode?: string;
                suburb?: string;
                neighbourhood?: string;
                city?: string;
                town?: string;
                village?: string;
                state_district?: string;
              };
            };
            const pin = (data.address?.postcode ?? "").replace(/\D/g, "").slice(0, 6);
            const area =
              data.address?.suburb ||
              data.address?.neighbourhood ||
              data.address?.city ||
              data.address?.town ||
              data.address?.village ||
              data.address?.state_district ||
              "Near you";

            if (pin.length === 6) {
              const merged = upsertGuestAddress({
                label: "Current location",
                pincode: pin,
                area,
                makeActive: true,
              });
              setRows(merged);
              setActiveId(getActiveAddressId());
              setGps({ status: "ok", area, pincode: pin });
            } else {
              setGps({
                status: "nopin",
                note: "GPS on — could not read a 6-digit pincode. Add one manually.",
              });
            }
          } catch {
            setGps({
              status: "error",
              note: "Got GPS, but address lookup failed. Try again or add a pincode.",
            });
          } finally {
            resolve();
          }
        },
        (err) => {
          const denied = err.code === err.PERMISSION_DENIED;
          setGps({
            status: denied ? "denied" : "error",
            note: denied
              ? "Location permission is off. Allow location for this site in Settings, then try again."
              : "Could not read GPS. Turn on location services and try again.",
          });
          resolve();
        },
        { enableHighAccuracy: true, timeout: 15_000, maximumAge: 60_000 },
      );
    });
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/45"
      role="dialog"
      aria-modal="true"
      aria-label="Choose delivery location"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg rounded-t-xl border border-border bg-surface-container-lowest p-4 pb-safe shadow-lg">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-[17px] font-bold">Delivery location</h2>
          <button
            type="button"
            className="pressable flex h-9 w-9 items-center justify-center rounded-md bg-surface-container"
            aria-label="Close"
            onClick={onClose}
          >
            <MaterialIcon name="close" className="text-[20px]" />
          </button>
        </div>

        <div
          className="mb-3 rounded-xl border border-border bg-surface-container px-3 py-3"
          data-testid="hub-address-gps"
        >
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <MaterialIcon
                name={gps.status === "locating" ? "my_location" : "near_me"}
                className={`text-[20px] ${gps.status === "locating" ? "animate-pulse" : ""}`}
              />
            </span>
            <div className="min-w-0 flex-1">
              {gps.status === "locating" ? (
                <p className="text-[14px] font-semibold">Finding your location…</p>
              ) : null}
              {gps.status === "ok" ? (
                <>
                  <p className="text-[14px] font-semibold">{gps.area}</p>
                  <p className="text-[12px] text-on-surface-variant">PIN {gps.pincode} · set as active</p>
                </>
              ) : null}
              {gps.status === "idle" ? (
                <p className="text-[14px] font-semibold">Use current location</p>
              ) : null}
              {gps.status === "denied" || gps.status === "error" || gps.status === "nopin" ? (
                <p className="text-[13px] font-medium text-on-surface-variant">{gps.note}</p>
              ) : null}
              {gps.status === "locating" ? (
                <p className="mt-0.5 text-[12px] text-on-surface-variant">Allow location when prompted</p>
              ) : null}
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              data-testid="hub-address-gps-retry"
              className="pressable flex h-10 flex-1 items-center justify-center gap-1.5 rounded-md border border-border text-[13px] font-bold"
              disabled={gps.status === "locating"}
              onClick={() => void locateFromGps()}
            >
              <MaterialIcon name="my_location" className="text-[18px]" />
              {gps.status === "locating" ? "Locating…" : "Use GPS"}
            </button>
            <Link
              href="/me/settings"
              className="pressable flex h-10 flex-1 items-center justify-center gap-1.5 rounded-md border border-border text-[13px] font-bold"
              onClick={onClose}
              data-testid="hub-address-settings"
            >
              <MaterialIcon name="settings" className="text-[18px]" />
              Settings
            </Link>
          </div>
        </div>

        {rows.length === 0 ? (
          <p className="mb-3 text-[13px] text-on-surface-variant">
            No saved addresses yet. Allow GPS above or add a pincode.
          </p>
        ) : (
          <ul className="mb-3 max-h-[40vh] space-y-2 overflow-y-auto">
            {rows.map((row) => {
              const isActive = activeId === row.id;
              return (
                <li key={row.id}>
                  <button
                    type="button"
                    className={`pressable flex w-full items-center gap-3 rounded-lg border px-3 py-3 text-left ${
                      isActive ? "border-primary bg-primary/5" : "border-border bg-surface-container-lowest"
                    }`}
                    onClick={() => {
                      setActiveAddressId(row.id);
                      setActiveId(row.id);
                      onClose();
                    }}
                  >
                    <MaterialIcon
                      name="location_on"
                      className={`text-[22px] ${isActive ? "text-primary" : "text-on-surface-variant"}`}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14px] font-semibold">
                        {formatAddressHeadline(row, row.label)}
                      </span>
                      <span className="block truncate text-[12px] text-on-surface-variant">
                        {formatAddressSubline(row)}
                      </span>
                    </span>
                    {isActive ? (
                      <span className="text-[11px] font-bold text-success">Active</span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <Link
          href="/me/addresses"
          className="pressable flex h-11 w-full items-center justify-center rounded-md bg-primary text-[14px] font-bold text-primary-foreground"
          onClick={onClose}
        >
          Manage addresses
        </Link>
      </div>
    </div>
  );
}
