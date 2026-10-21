"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useCrmRestaurant } from "@/components/use-crm-restaurant";
import { getCrmToken } from "@/lib/session";

function isKitchenOnly(roles: string[]) {
  const elevated = roles.some((r) =>
    ["RESTAURANT_OWNER", "PLATFORM_ADMIN", "STAFF"].includes(r),
  );
  return !elevated && roles.includes("KITCHEN");
}

/** Redirect to /start when CRM JWT missing (P0-T04); kitchen staff → orders only */
export function CrmAuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { roles, loading } = useCrmRestaurant();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = getCrmToken();
    if (!token) {
      router.replace(`/start?next=${encodeURIComponent(pathname)}`);
      return;
    }
    setReady(true);
  }, [pathname, router]);

  useEffect(() => {
    if (!ready || loading) return;
    if (!isKitchenOnly(roles)) return;
    const allowed =
      pathname === "/orders" ||
      pathname.startsWith("/orders/") ||
      pathname.startsWith("/start");
    if (!allowed) {
      router.replace("/orders/kitchen");
    }
  }, [ready, loading, roles, pathname, router]);

  if (!ready) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-sm text-foreground/60">
        Checking session…
      </div>
    );
  }

  return <>{children}</>;
}

export function CrmLogoutButton() {
  return (
    <Button variant="ghost" size="sm" className="w-full justify-start" asChild>
      <Link href="/start" onClick={() => import("@/lib/session").then((m) => m.clearCrmSession())}>
        Log out
      </Link>
    </Button>
  );
}
