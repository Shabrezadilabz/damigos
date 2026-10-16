"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { formatInr } from "@/lib/api";
import { authHeaders } from "@/lib/session";

/** G-S4 track shell P0 */
export default function OrderTrackPage({ params }: { params: Promise<{ orderId: string }> }) {
  const [orderId, setOrderId] = useState<string | null>(null);
  const [order, setOrder] = useState<{
    status: string;
    totalPaise: number;
    subtotalPaise: number;
    discountPaise?: number;
    restaurantId: string;
  } | null>(null);
  const [shipment, setShipment] = useState<{ awb: string | null; carrier: string } | null>(null);

  useEffect(() => {
    void params.then((p) => setOrderId(p.orderId));
  }, [params]);

  useEffect(() => {
    if (!orderId) return;
    const base = process.env.NEXT_PUBLIC_GUEST_API_URL ?? "http://localhost:4000";
    const load = () =>
      fetch(`${base}/v1/orders/${orderId}`, { headers: authHeaders() })
        .then((r) => r.json())
        .then((d) => {
          setOrder(d.order);
          setShipment(d.shipment ?? null);
        })
        .catch(() => setOrder(null));
    void load();
    const id = window.setInterval(() => void load(), 15_000);
    return () => window.clearInterval(id);
  }, [orderId]);

  const steps = [
    { key: "PAID", label: "Paid — sent to kitchen" },
    { key: "ACCEPTED", label: "Kitchen accepted" },
    { key: "PREPARING", label: "Preparing your order" },
    { key: "READY", label: "Ready for pickup / dispatch" },
    { key: "DISPATCHED", label: "Out for delivery" },
    { key: "DELIVERED", label: "Delivered" },
  ];
  const rank = (s: string) => steps.findIndex((x) => x.key === s);
  const currentRank = order ? rank(order.status) : -1;

  return (
    <main className="mx-auto min-h-dvh max-w-lg p-4">
      <h1 className="font-[family-name:var(--font-display)] text-xl font-bold">Order tracking</h1>
      {order ? (
        <div className="mt-4 space-y-2 text-sm">
          <p>
            Status: <strong>{order.status}</strong>
          </p>
          {order.discountPaise != null && order.discountPaise > 0 && (
            <p className="tabular-nums text-emerald-800">
              Reward saved: {formatInr(order.discountPaise)}
            </p>
          )}
          <p className="tabular-nums">Total: {formatInr(order.totalPaise)}</p>
          {shipment?.awb && (
            <p className="text-xs text-foreground/70">
              {shipment.carrier} AWB: <span className="font-mono">{shipment.awb}</span>
            </p>
          )}
          <ul className="mt-4 space-y-2 border-l-2 border-primary pl-4">
            {steps.map((step, i) => {
              const done = currentRank >= i && currentRank !== -1;
              const active = order.status === step.key;
              return (
                <li
                  key={step.key}
                  className={
                    active
                      ? "font-medium text-primary"
                      : done
                        ? "text-foreground"
                        : "text-foreground/45"
                  }
                >
                  {step.label}
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <p className="mt-4 text-sm text-foreground/60">Loading…</p>
      )}
      <div className="mt-6 flex flex-col gap-2">
        {order && (
          <Button variant="secondary" asChild>
            <Link href={`/r/${order.restaurantId}/menu`}>Reorder from this kitchen</Link>
          </Button>
        )}
        <Button variant="outline" asChild>
          <Link href="/orders">All orders</Link>
        </Button>
      </div>
    </main>
  );
}
