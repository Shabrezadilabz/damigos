"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MaterialIcon } from "@/components/material-icon";
import {
  fetchCrmCustomers,
  fetchCrmOrders,
  formatInr,
  type CrmCustomerRow,
  type CrmOrder,
} from "@/lib/api";

type QuickLink = { id: string; label: string; hint: string; href: string; icon: string };

const QUICK_LINKS: QuickLink[] = [
  { id: "nav-home", label: "Home", hint: "Dashboard", href: "/", icon: "home" },
  { id: "nav-kitchen", label: "Kitchen board", hint: "Live orders · tables rail", href: "/orders/kitchen", icon: "skillet" },
  { id: "nav-orders", label: "Orders list", hint: "All orders", href: "/orders", icon: "receipt_long" },
  { id: "nav-redeem", label: "Counter redeem", hint: "Tables / redeem", href: "/orders/redeem", icon: "qr_code_2" },
  { id: "nav-customers", label: "Customers", hint: "Guest directory", href: "/grow?tab=customers", icon: "group" },
  { id: "nav-menu", label: "Menu", hint: "Items & stock", href: "/menu", icon: "restaurant_menu" },
  { id: "nav-campaigns", label: "Campaigns", hint: "Grow WhatsApp", href: "/grow?tab=campaigns", icon: "campaign" },
  { id: "nav-settings", label: "Settings", hint: "Payout & profile", href: "/settings", icon: "settings" },
];

type Result =
  | { kind: "link"; item: QuickLink }
  | { kind: "guest"; item: CrmCustomerRow }
  | { kind: "order"; item: CrmOrder };

type Props = {
  open: boolean;
  onClose: () => void;
  restaurantId: string | null;
};

export function CrmCommandPalette({ open, onClose, restaurantId }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [guests, setGuests] = useState<CrmCustomerRow[]>([]);
  const [orders, setOrders] = useState<CrmOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActiveIndex(0);
    setError(null);
    const t = window.setTimeout(() => inputRef.current?.focus(), 20);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open || !restaurantId) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([fetchCrmCustomers(restaurantId), fetchCrmOrders(restaurantId, false, 40)])
      .then(([c, o]) => {
        if (cancelled) return;
        setGuests(c);
        setOrders(o);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Search failed");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, restaurantId]);

  const results = useMemo((): Result[] => {
    const q = query.trim().toLowerCase();
    const links = QUICK_LINKS.filter(
      (l) =>
        !q ||
        l.label.toLowerCase().includes(q) ||
        l.hint.toLowerCase().includes(q) ||
        (q.includes("table") && (l.id === "nav-kitchen" || l.id === "nav-redeem")),
    ).map((item) => ({ kind: "link" as const, item }));

    if (!q) return links.slice(0, 8);

    const guestHits = guests
      .filter((g) => {
        const name = (g.name ?? "").toLowerCase();
        const phone = g.phoneMasked.toLowerCase();
        return name.includes(q) || phone.includes(q) || g.id.toLowerCase().includes(q);
      })
      .slice(0, 8)
      .map((item) => ({ kind: "guest" as const, item }));

    const orderHits = orders
      .filter((o) => {
        const id = o.id.toLowerCase();
        const short = o.id.slice(0, 8).toLowerCase();
        const phone = (o.customerPhoneLast4 ?? "").toLowerCase();
        const status = o.status.toLowerCase();
        return id.includes(q) || short.includes(q) || phone.includes(q) || status.includes(q);
      })
      .slice(0, 8)
      .map((item) => ({ kind: "order" as const, item }));

    return [...links.slice(0, 4), ...guestHits, ...orderHits];
  }, [query, guests, orders]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, results.length]);

  const go = useCallback(
    (row: Result) => {
      if (row.kind === "link") {
        router.push(row.item.href);
      } else if (row.kind === "guest") {
        router.push(`/grow?tab=customers&customerId=${encodeURIComponent(row.item.id)}`);
      } else {
        const active = ["PAID", "ACCEPTED", "PREPARING", "READY"].includes(row.item.status);
        router.push(active ? `/orders/kitchen` : `/orders`);
      }
      onClose();
    },
    [onClose, router],
  );

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, Math.max(results.length - 1, 0)));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === "Enter" && results[activeIndex]) {
        e.preventDefault();
        go(results[activeIndex]);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, results, activeIndex, go]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Search CRM"
      className="fixed inset-0 z-[60] flex items-start justify-center bg-black/40 px-4 pt-[12vh]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-border/60 bg-background shadow-2xl">
        <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
          <MaterialIcon name="search" className="text-[22px] text-on-surface-variant" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search guest, table or order…"
            className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-on-surface-variant"
          />
          <kbd className="rounded bg-surface-container-high px-1.5 py-0.5 text-[10px] font-semibold text-on-surface-variant">
            Esc
          </kbd>
        </div>
        <div className="max-h-[50vh] overflow-y-auto py-2">
          {!restaurantId ? (
            <p className="px-4 py-6 text-sm text-on-surface-variant">Sign in to search this kitchen.</p>
          ) : loading && !guests.length && !orders.length ? (
            <p className="px-4 py-6 text-sm text-on-surface-variant">Loading…</p>
          ) : error ? (
            <p className="px-4 py-6 text-sm text-red-700">{error}</p>
          ) : !results.length ? (
            <p className="px-4 py-6 text-sm text-on-surface-variant">No matches.</p>
          ) : (
            <ul className="flex flex-col gap-0.5 px-2">
              {results.map((row, i) => {
                const active = i === activeIndex;
                if (row.kind === "link") {
                  return (
                    <li key={row.item.id}>
                      <button
                        type="button"
                        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                          active ? "bg-primary-container text-on-primary-container" : "hover:bg-surface-container-low"
                        }`}
                        onMouseEnter={() => setActiveIndex(i)}
                        onClick={() => go(row)}
                      >
                        <MaterialIcon name={row.item.icon} className="text-[20px]" />
                        <span className="flex min-w-0 flex-col">
                          <span className="text-sm font-semibold">{row.item.label}</span>
                          <span className="text-[11px] opacity-70">{row.item.hint}</span>
                        </span>
                      </button>
                    </li>
                  );
                }
                if (row.kind === "guest") {
                  return (
                    <li key={`g-${row.item.id}`}>
                      <button
                        type="button"
                        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                          active ? "bg-primary-container text-on-primary-container" : "hover:bg-surface-container-low"
                        }`}
                        onMouseEnter={() => setActiveIndex(i)}
                        onClick={() => go(row)}
                      >
                        <MaterialIcon name="person" className="text-[20px]" />
                        <span className="flex min-w-0 flex-col">
                          <span className="text-sm font-semibold">{row.item.name ?? "Guest"}</span>
                          <span className="text-[11px] opacity-70">
                            {row.item.phoneMasked} · {row.item.orderCount} orders
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                }
                return (
                  <li key={`o-${row.item.id}`}>
                    <button
                      type="button"
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                        active ? "bg-primary-container text-on-primary-container" : "hover:bg-surface-container-low"
                      }`}
                      onMouseEnter={() => setActiveIndex(i)}
                      onClick={() => go(row)}
                    >
                      <MaterialIcon name="receipt_long" className="text-[20px]" />
                      <span className="flex min-w-0 flex-col">
                        <span className="text-sm font-semibold">#{row.item.id.slice(0, 8)}</span>
                        <span className="text-[11px] opacity-70">
                          {row.item.status}
                          {row.item.customerPhoneLast4 ? ` · …${row.item.customerPhoneLast4}` : ""} ·{" "}
                          {formatInr(row.item.totalPaise)}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
