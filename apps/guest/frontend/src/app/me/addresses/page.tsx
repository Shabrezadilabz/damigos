"use client";

import { useEffect, useState } from "react";
import { MeSubpageShell } from "@/components/me-subpage-shell";
import { MaterialIcon } from "@/components/material-icon";
import {
  getActiveAddressId,
  readGuestAddresses,
  removeGuestAddress,
  setActiveAddressId,
  upsertGuestAddress,
  type GuestSavedAddress,
} from "@/lib/guest-addresses";

export default function MeAddressesPage() {
  const [rows, setRows] = useState<GuestSavedAddress[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [label, setLabel] = useState("Home");
  const [pincode, setPincode] = useState("");
  const [area, setArea] = useState("");
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    setRows(readGuestAddresses());
    setActiveId(getActiveAddressId());
  }

  useEffect(() => {
    refresh();
  }, []);

  function onAdd(e: React.FormEvent) {
    e.preventDefault();
    const pin = pincode.replace(/\D/g, "");
    if (pin.length !== 6) {
      setError("Enter a 6-digit pincode.");
      return;
    }
    setError(null);
    setRows(upsertGuestAddress({ label, pincode: pin, area, makeActive: true }));
    setActiveId(getActiveAddressId());
    setPincode("");
    setArea("");
  }

  return (
    <MeSubpageShell title="Addresses" backHref="/hub" backLabel="Back to home">
      <p className="mb-4 text-[13px] text-on-surface-variant">
        Saved delivery areas show on the home hub and checkout bill. Tap{" "}
        <span className="font-semibold">Use</span> to set the active drop location.
      </p>

      {rows.length === 0 ? (
        <div className="mb-4 rounded-lg bg-surface-container-lowest p-5 text-center shadow-sm border border-border">
          <MaterialIcon name="location_off" className="text-[32px] text-on-surface-variant/50" />
          <p className="mt-2 text-[15px] font-semibold">No saved addresses yet</p>
          <p className="mt-1 text-[12px] text-on-surface-variant">
            Add a pincode below — we&apos;ll reuse it on hub and checkout.
          </p>
        </div>
      ) : (
        <ul className="mb-4 overflow-hidden rounded-lg bg-surface-container-lowest shadow-sm border border-border">
          {rows.map((row, i) => {
            const isActive = activeId === row.id || (!activeId && i === 0);
            return (
              <li
                key={row.id}
                className={`flex items-center gap-3 px-4 py-3.5 ${i > 0 ? "border-t border-border/60" : ""}`}
              >
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full ${
                    isActive ? "bg-primary/10 text-primary" : "bg-surface-container-low"
                  }`}
                >
                  <MaterialIcon name="home" className="text-[22px]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-semibold">
                    {row.label}
                    {isActive ? (
                      <span className="ml-2 text-[11px] font-bold uppercase tracking-wide text-primary">
                        Active
                      </span>
                    ) : null}
                  </p>
                  <p className="text-[12px] text-on-surface-variant">
                    Pincode {row.pincode}
                    {row.area ? ` · ${row.area}` : ""}
                  </p>
                </div>
                {!isActive ? (
                  <button
                    type="button"
                    className="pressable text-[12px] font-bold text-primary"
                    data-testid={`me-address-use-${row.id}`}
                    onClick={() => {
                      setActiveAddressId(row.id);
                      setActiveId(row.id);
                    }}
                  >
                    Use
                  </button>
                ) : null}
                <button
                  type="button"
                  className="pressable text-[12px] font-bold text-on-surface-variant"
                  onClick={() => {
                    setRows(removeGuestAddress(row.id));
                    setActiveId(getActiveAddressId());
                  }}
                >
                  Remove
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <form onSubmit={onAdd} className="space-y-3 rounded-lg bg-surface-container-lowest p-4 shadow-sm border border-border">
        <p className="text-[13px] font-bold">Add address</p>
        <label className="block text-[12px] font-semibold text-on-surface-variant">
          Label
          <input
            className="mt-1 w-full rounded-xl border border-outline-variant/50 bg-surface-container-low px-3 py-2.5 text-[14px]"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Home / Office"
          />
        </label>
        <label className="block text-[12px] font-semibold text-on-surface-variant">
          Pincode
          <input
            className="mt-1 w-full rounded-xl border border-outline-variant/50 bg-surface-container-low px-3 py-2.5 text-[14px] tracking-wide"
            value={pincode}
            onChange={(e) => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            placeholder="560034"
            data-testid="me-address-pincode"
          />
        </label>
        <label className="block text-[12px] font-semibold text-on-surface-variant">
          Area
          <input
            className="mt-1 w-full rounded-xl border border-outline-variant/50 bg-surface-container-low px-3 py-2.5 text-[14px]"
            value={area}
            onChange={(e) => setArea(e.target.value)}
            placeholder="HSR Layout / Indiranagar"
          />
        </label>
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <button
          type="submit"
          className="pressable flex h-11 w-full items-center justify-center rounded-xl bg-primary text-[14px] font-bold text-on-primary"
        >
          Save &amp; use on hub
        </button>
      </form>
    </MeSubpageShell>
  );
}
