"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { SwitchKitchenModal } from "@/components/switch-kitchen-modal";
import {
  clearOpenCart,
  fetchHubRestaurants,
  fetchOpenCart,
  type HubRestaurant,
  type OpenCartSummary,
} from "@/lib/api";
import { getGuestToken } from "@/lib/session";

/** G-S6 / G-07.01 curated pilot list */
export function HubKitchenList({ embedded = false }: { embedded?: boolean }) {
  const router = useRouter();
  const [rows, setRows] = useState<HubRestaurant[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [openCart, setOpenCart] = useState<OpenCartSummary | null>(null);
  const [pending, setPending] = useState<HubRestaurant | null>(null);
  const [clearing, setClearing] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setLoading(true);
      void fetchHubRestaurants("bangalore", search)
        .then((list) => {
          setRows(list);
          setError(null);
        })
        .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
        .finally(() => setLoading(false));
    }, search ? 250 : 0);
    return () => window.clearTimeout(handle);
  }, [search]);

  useEffect(() => {
    if (!getGuestToken()) return;
    void fetchOpenCart()
      .then(setOpenCart)
      .catch(() => setOpenCart(null));
  }, []);

  function onKitchenClick(e: React.MouseEvent, target: HubRestaurant) {
    if (!openCart || openCart.restaurantId === target.id) return;
    e.preventDefault();
    setPending(target);
  }

  async function onConfirmSwitch() {
    if (!pending) return;
    setClearing(true);
    try {
      await clearOpenCart();
      setOpenCart(null);
      setPending(null);
      router.push(pending.menuPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not clear cart");
    } finally {
      setClearing(false);
    }
  }

  const Wrapper = embedded ? "div" : "main";
  const wrapperClass = embedded ? "flex flex-col gap-4" : "mx-auto min-h-dvh max-w-lg p-4 md:max-w-3xl";

  return (
    <Wrapper className={wrapperClass}>
      {!embedded ? (
        <>
          <h1 className="font-[family-name:var(--font-display)] text-xl font-bold">Discover</h1>
          <p className="mt-2 text-sm text-foreground/70">
            Curated Bangalore kitchens on D&apos;aMigo&apos;s — order direct, skip aggregator fees.
          </p>
        </>
      ) : (
        <h2 className="font-[family-name:var(--font-display)] text-sm font-semibold text-on-surface-variant">
          Partner kitchens
        </h2>
      )}

      <label className={embedded ? "block" : "mt-4 block"}>
        <span className="sr-only">Search kitchens</span>
        <input
          type="search"
          placeholder="Search kitchens…"
          className="w-full rounded-lg border border-border px-3 py-2 text-sm"
          data-testid="hub-search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </label>

      {error && <p className="mt-4 text-sm text-red-700">{error}</p>}

      <ul className="mt-6 space-y-3" data-testid="hub-kitchen-list">
        {rows.map((r) => (
          <li key={r.id} className="rounded-xl border border-border p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{r.name}</p>
                <p className="text-xs text-foreground/60">{r.city ?? "Bangalore"}</p>
                {!r.orderingEnabled && (
                  <p className="mt-1 text-xs text-amber-800">Ordering paused — menu view only</p>
                )}
              </div>
              <Button size="sm" asChild variant={r.orderingEnabled ? "default" : "outline"}>
                <Link href={r.menuPath} onClick={(e) => onKitchenClick(e, r)}>
                  {r.orderingEnabled ? "Order" : "View menu"}
                </Link>
              </Button>
            </div>
          </li>
        ))}
      </ul>

      {!rows.length && !error && !loading && (
        <p className="mt-6 text-sm text-foreground/60" data-testid="hub-empty">
          {search.trim() ? "No kitchens match your search." : "No kitchens listed yet — run db:seed."}
        </p>
      )}

      <Button variant="ghost" asChild className="mt-8 w-full">
        <Link href="/orders">Your orders</Link>
      </Button>

      {pending && openCart && (
        <SwitchKitchenModal
          openCart={openCart}
          targetKitchenName={pending.name}
          onCancel={() => setPending(null)}
          onConfirm={() => void onConfirmSwitch()}
          confirming={clearing}
        />
      )}
    </Wrapper>
  );
}
