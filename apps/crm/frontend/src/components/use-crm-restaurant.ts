"use client";

import { useEffect, useState } from "react";
import { fetchCrmMe } from "@/lib/api";
import { getCrmSession, setCrmSession } from "@/lib/session";

/** Prefer JWT-backed /me; fall back to login session or env demo id. */
export function useCrmRestaurant() {
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await fetchCrmMe();
        if (cancelled) return;
        setRoles(me.roles);
        setCrmSession({ restaurantId: me.restaurantId, roles: me.roles });
        const fromSession = me.restaurantId ?? getCrmSession()?.restaurantId ?? null;
        const envFallback = process.env.NEXT_PUBLIC_DEMO_RESTAURANT_ID ?? null;
        setRestaurantId(fromSession ?? envFallback);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Could not load session");
        const cached = getCrmSession();
        setRestaurantId(cached?.restaurantId ?? process.env.NEXT_PUBLIC_DEMO_RESTAURANT_ID ?? null);
        setRoles(cached?.roles ?? []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { restaurantId, roles, loading, error, isPlatformAdmin: roles.includes("PLATFORM_ADMIN") };
}
