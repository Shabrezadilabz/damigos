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
  type GuestSavedAddress,
} from "@/lib/guest-addresses";

type Props = {
  open: boolean;
  onClose: () => void;
};

/** Hub location picker — stays on home, does not route to profile. */
export function HubAddressSheet({ open, onClose }: Props) {
  const [rows, setRows] = useState<GuestSavedAddress[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setRows(readGuestAddresses());
    setActiveId(getActiveAddressId());
  }, [open]);

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

        {rows.length === 0 ? (
          <p className="mb-3 text-[13px] text-on-surface-variant">
            No saved addresses yet. Add a pincode for hub + checkout.
          </p>
        ) : (
          <ul className="mb-3 max-h-[50vh] space-y-2 overflow-y-auto">
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
