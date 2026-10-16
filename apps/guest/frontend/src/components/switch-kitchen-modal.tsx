"use client";

import { Button } from "@/components/ui/button";
import { formatInr, type OpenCartSummary } from "@/lib/api";

type Props = {
  openCart: OpenCartSummary;
  targetKitchenName: string;
  onCancel: () => void;
  onConfirm: () => void;
  confirming?: boolean;
};

/** G-07.03 — packaging QR kitchens only; hub switch clears cart */
export function SwitchKitchenModal({
  openCart,
  targetKitchenName,
  onCancel,
  onConfirm,
  confirming,
}: Props) {
  return (
    <div
      role="dialog"
      aria-labelledby="switch-kitchen-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
    >
      <div className="w-full max-w-md rounded-2xl border border-border bg-background p-5 shadow-xl">
        <h2 id="switch-kitchen-title" className="font-semibold">
          Switch kitchen?
        </h2>
        <p className="mt-2 text-sm text-foreground/70">
          You have{" "}
          <strong>
            {openCart.itemCount} item{openCart.itemCount === 1 ? "" : "s"} ({formatInr(openCart.subtotalPaise)})
          </strong>{" "}
          from <strong>{openCart.restaurantName}</strong>. Starting an order at{" "}
          <strong>{targetKitchenName}</strong> will clear your current cart.
        </p>
        <div className="mt-5 flex gap-2">
          <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>
            Keep current cart
          </Button>
          <Button type="button" className="flex-1" disabled={confirming} onClick={onConfirm}>
            {confirming ? "Clearing…" : "Clear & continue"}
          </Button>
        </div>
      </div>
    </div>
  );
}
