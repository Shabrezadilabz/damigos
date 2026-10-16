"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  addCartItem,
  fetchCart,
  formatInr,
  type GuestMenuItem,
  type CartResponse,
} from "@/lib/api";
import { getGuestToken } from "@/lib/session";
import { ProfileConsentSheet } from "@/components/profile-consent-sheet";

type Props = {
  restaurantId: string;
  restaurantName: string;
  items: GuestMenuItem[];
};

export function MenuShop({ restaurantId, restaurantName, items }: Props) {
  const [cart, setCart] = useState<CartResponse | null>(null);
  const [selected, setSelected] = useState<GuestMenuItem | null>(null);
  const [qty, setQty] = useState(1);
  const [authOpen, setAuthOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshCart = useCallback(async () => {
    if (!getGuestToken()) return;
    try {
      const c = await fetchCart(restaurantId);
      setCart(c);
    } catch {
      setCart(null);
    }
  }, [restaurantId]);

  useEffect(() => {
    void refreshCart();
  }, [refreshCart]);

  async function onAdd(item: GuestMenuItem, quantity: number) {
    if (!getGuestToken()) {
      setSelected(item);
      setQty(quantity);
      setAuthOpen(true);
      return;
    }
    setError(null);
    try {
      await addCartItem(restaurantId, item.id, quantity);
      await refreshCart();
      setSelected(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add");
    }
  }

  return (
    <>
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/orders">← Orders</Link>
        </Button>
        <span className="text-sm font-semibold">{restaurantName}</span>
        <Link href={`/r/${restaurantId}/checkout`} className="text-sm font-semibold text-primary">
          Cart{cart && cart.itemCount > 0 ? ` (${cart.itemCount})` : ""}
        </Link>
      </header>

      {error && <p className="px-4 pt-2 text-sm text-red-700">{error}</p>}

      <ul className="divide-y divide-border p-4">
        {items.map((item) => (
          <li key={item.id} className="flex gap-3 py-4">
            <span
              className={`mt-1 h-4 w-4 shrink-0 border ${item.isVeg ? "border-green-600" : "border-primary"}`}
            />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{item.name}</p>
              {item.description && (
                <p className="text-sm text-foreground/65 line-clamp-2">{item.description}</p>
              )}
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <p className="font-bold tabular-nums">{formatInr(item.pricePaise)}</p>
                {item.referencePricePaise != null && item.referencePricePaise > 0 && (
                  <span
                    className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground/70"
                    data-testid="reference-price-chip"
                  >
                    Est. reference {formatInr(item.referencePricePaise)}
                  </span>
                )}
              </div>
            </div>
            <Button size="sm" variant="outline" className="shrink-0" onClick={() => setSelected(item)}>
              ADD
            </Button>
          </li>
        ))}
      </ul>

      {selected && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-t-2xl bg-background p-6 shadow-xl">
            <h3 className="font-semibold">{selected.name}</h3>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-foreground/70">
              <span className="font-semibold tabular-nums text-foreground">{formatInr(selected.pricePaise)}</span>
              {selected.referencePricePaise != null && selected.referencePricePaise > 0 && (
                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px]">
                  Est. reference {formatInr(selected.referencePricePaise)}
                </span>
              )}
            </div>
            <div className="mt-4 flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={() => setQty((q) => Math.max(1, q - 1))}>
                −
              </Button>
              <span className="tabular-nums">{qty}</span>
              <Button variant="outline" size="sm" onClick={() => setQty((q) => q + 1)}>
                +
              </Button>
            </div>
            <Button className="mt-4 w-full" onClick={() => void onAdd(selected, qty)}>
              Add to cart
            </Button>
            <Button variant="ghost" className="mt-2 w-full" onClick={() => setSelected(null)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="fixed inset-x-0 bottom-0 border-t border-border bg-background p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
          <div className="text-sm">
            {cart && cart.itemCount > 0 ? (
              <>
                <span className="font-semibold tabular-nums">{formatInr(cart.subtotalPaise)}</span>
                <span className="text-foreground/60"> · {cart.itemCount} items</span>
              </>
            ) : (
              <span className="text-foreground/60">Cart empty</span>
            )}
          </div>
          <Button asChild disabled={!cart?.itemCount}>
            <Link href={`/r/${restaurantId}/checkout`}>View cart</Link>
          </Button>
        </div>
      </div>

      <ProfileConsentSheet
        open={authOpen}
        onComplete={() => {
          setAuthOpen(false);
          if (selected) void onAdd(selected, qty);
        }}
      />
    </>
  );
}
