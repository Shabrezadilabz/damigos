"use client";

import { Button } from "@/components/ui/button";
import { formatInr, type OpenCartSummary } from "@/lib/api";

type Props = {
  openCart: OpenCartSummary;
  openCarts?: OpenCartSummary[];
  targetKitchenName: string;
  /** When false (already 2 kitchens), hide Add as 2nd */
  canAddSecond?: boolean;
  onCancel: () => void;
  /** Cross-By: keep existing cart(s) and open target as 2nd kitchen */
  onAddSecond?: () => void;
  /** Clear all open carts then continue */
  onReplace: () => void;
  confirming?: boolean;
};

/** G-07.04 / g18 — Add as 2nd kitchen (Cross-By) or replace */
export function SwitchKitchenModal({
  openCart,
  openCarts,
  targetKitchenName,
  canAddSecond = true,
  onCancel,
  onAddSecond,
  onReplace,
  confirming,
}: Props) {
  const kitchens = openCarts?.length ? openCarts : [openCart];
  const multi = kitchens.length > 1;

  return (
    <div
      role="dialog"
      aria-labelledby="switch-kitchen-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
    >
      <div className="sheet-spring w-full max-w-md rounded-t-[28px] bg-background p-5 pb-safe shadow-xl sm:rounded-2xl">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border sm:hidden" />
        <h2 id="switch-kitchen-title" className="font-display text-[20px] font-bold tracking-tight">
          {canAddSecond && !multi ? "Add a 2nd kitchen?" : "Switch kitchen?"}
        </h2>
        <p className="mt-2 text-[14px] text-on-surface-variant">
          {multi ? (
            <>
              Your cart already has <strong>{kitchens.length} kitchens</strong> (Cross-By max). To order
              from <strong>{targetKitchenName}</strong>, replace your current carts.
            </>
          ) : (
            <>
              You have{" "}
              <strong>
                {openCart.itemCount} item{openCart.itemCount === 1 ? "" : "s"} (
                {formatInr(openCart.subtotalPaise)})
              </strong>{" "}
              from <strong>{openCart.restaurantName}</strong>.
              {canAddSecond
                ? " Cross-By lets you add one nearby kitchen in the same checkout."
                : null}
            </>
          )}
        </p>

        {kitchens.length > 0 ? (
          <ul className="mt-3 space-y-1.5 rounded-xl bg-surface-container-low p-3 text-[12px]">
            {kitchens.map((k) => (
              <li key={k.cartId} className="flex justify-between gap-2">
                <span className="truncate font-semibold">{k.restaurantName}</span>
                <span className="tabular text-on-surface-variant">
                  {k.itemCount} · {formatInr(k.subtotalPaise)}
                </span>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="mt-5 flex flex-col gap-2">
          <Button
            type="button"
            className="pressable w-full"
            data-testid="switch-kitchen-keep-cart"
            onClick={onCancel}
          >
            Keep cart
          </Button>
          {canAddSecond && onAddSecond && !multi ? (
            <Button
              type="button"
              variant="outline"
              className="pressable w-full"
              disabled={confirming}
              onClick={onAddSecond}
            >
              Add as 2nd kitchen (Cross-By)
            </Button>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            className="pressable w-full text-on-surface-variant"
            disabled={confirming}
            data-testid="switch-kitchen-replace"
            onClick={onReplace}
          >
            {confirming ? "Clearing…" : multi ? "Clear carts & continue" : "Replace kitchen"}
          </Button>
        </div>
      </div>
    </div>
  );
}
