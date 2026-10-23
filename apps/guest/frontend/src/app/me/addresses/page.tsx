"use client";

import { useEffect, useState } from "react";
import { MeSubpageShell } from "@/components/me-subpage-shell";
import { MaterialIcon } from "@/components/material-icon";
import {
  readGuestAddresses,
  removeGuestAddress,
  upsertGuestAddress,
  type GuestSavedAddress,
} from "@/lib/guest-addresses";

export default function MeAddressesPage() {
  const [rows, setRows] = useState<GuestSavedAddress[]>([]);
  const [label, setLabel] = useState("Home");
  const [pincode, setPincode] = useState("");
  const [area, setArea] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setRows(readGuestAddresses());
  }, []);

  function onAdd(e: React.FormEvent) {
    e.preventDefault();
    const pin = pincode.replace(/\D/g, "");
    if (pin.length !== 6) {
      setError("Enter a 6-digit pincode.");
      return;
    }
    setError(null);
    setRows(upsertGuestAddress({ label, pincode: pin, area }));
    setPincode("");
    setArea("");
  }

  return (
    <MeSubpageShell title="Addresses">
      <p className="mb-4 text-[13px] text-on-surface-variant">
        Saved delivery areas for packaging / Drop pin checkout.
      </p>

      {rows.length === 0 ? (
        <div className="mb-4 rounded-2xl bg-white p-5 text-center shadow-sm ring-1 ring-black/5">
          <MaterialIcon name="location_off" className="text-[32px] text-on-surface-variant/50" />
          <p className="mt-2 text-[15px] font-semibold">No saved addresses yet</p>
          <p className="mt-1 text-[12px] text-on-surface-variant">
            Add a pincode below — we&apos;ll reuse it at checkout.
          </p>
        </div>
      ) : (
        <ul className="mb-4 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
          {rows.map((row, i) => (
            <li
              key={row.id}
              className={`flex items-center gap-3 px-4 py-3.5 ${i > 0 ? "border-t border-border/60" : ""}`}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-low">
                <MaterialIcon name="home" className="text-[22px]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-semibold">{row.label}</p>
                <p className="text-[12px] text-on-surface-variant">
                  Pincode {row.pincode}
                  {row.area ? ` · ${row.area}` : ""}
                </p>
              </div>
              <button
                type="button"
                className="pressable text-[12px] font-bold text-primary"
                onClick={() => setRows(removeGuestAddress(row.id))}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={onAdd} className="space-y-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
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
          Area (optional)
          <input
            className="mt-1 w-full rounded-xl border border-outline-variant/50 bg-surface-container-low px-3 py-2.5 text-[14px]"
            value={area}
            onChange={(e) => setArea(e.target.value)}
            placeholder="Koramangala"
          />
        </label>
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <button
          type="submit"
          className="pressable flex h-11 w-full items-center justify-center rounded-xl bg-primary text-[14px] font-bold text-on-primary"
        >
          Save address
        </button>
      </form>
    </MeSubpageShell>
  );
}
