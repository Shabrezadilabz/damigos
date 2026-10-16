"use client";

import { MenuManager } from "@/components/menu-manager";
import { useCrmRestaurant } from "@/components/use-crm-restaurant";

export function MenuPageClient() {
  const { restaurantId, loading, error } = useCrmRestaurant();

  if (loading) {
    return <p className="text-sm text-foreground/60">Loading menu…</p>;
  }

  if (!restaurantId) {
    return (
      <p className="text-sm text-red-700">
        {error ?? "No restaurant linked to this login. Use owner phone from seed or contact support."}
      </p>
    );
  }

  return <MenuManager restaurantId={restaurantId} />;
}
