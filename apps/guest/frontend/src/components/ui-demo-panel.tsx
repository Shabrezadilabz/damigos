"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type UiDemoPayload = {
  seeded: boolean;
  restaurantName: string;
  scanPath: string | null;
  guest: { phone: string; otp: string; profileName: string };
  guestUrls: {
    hub: string;
    orders: string;
    menu: string;
    trackOrder: string | null;
  };
  doc: string;
};

const base = process.env.NEXT_PUBLIC_GUEST_API_URL ?? "http://localhost:4000";

export function UiDemoPanel() {
  const [data, setData] = useState<UiDemoPayload | null>(null);
  const show = process.env.NEXT_PUBLIC_SHOW_UI_DEMO !== "false";

  useEffect(() => {
    if (!show) return;
    void fetch(`${base}/v1/dev/ui-demo`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .catch(() => setData(null));
  }, [show]);

  if (!show || !data) return null;

  return (
    <section
      data-testid="ui-demo-panel"
      className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm"
    >
      <p className="text-xs font-bold uppercase tracking-wider text-primary">UI demo (Stitch validation)</p>
      {!data.seeded ? (
        <p className="mt-2 text-amber-900">Run <code className="rounded bg-background px-1">npm run db:seed</code> for filled screens.</p>
      ) : (
        <>
          <p className="mt-2 text-foreground/80">
            Guest <strong>{data.guest.profileName}</strong> · {data.guest.phone} / OTP {data.guest.otp}
          </p>
          <p className="text-foreground/70">{data.restaurantName}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {data.scanPath ? (
              <Button size="sm" variant="secondary" asChild>
                <Link href={data.scanPath}>Scan landing (g1)</Link>
              </Button>
            ) : null}
            <Button size="sm" variant="outline" asChild>
              <Link href={data.guestUrls.menu}>Menu (g2)</Link>
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link href={data.guestUrls.hub}>Hub (g17)</Link>
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link href={data.guestUrls.orders}>Orders (g16)</Link>
            </Button>
            {data.guestUrls.trackOrder ? (
              <Button size="sm" variant="outline" asChild>
                <Link href={data.guestUrls.trackOrder}>Live track (g13)</Link>
              </Button>
            ) : null}
          </div>
        </>
      )}
      <p className="mt-2 text-xs text-foreground/50">CRM: localhost:3001/start · 9876543210 / {data.guest.otp}</p>
    </section>
  );
}
