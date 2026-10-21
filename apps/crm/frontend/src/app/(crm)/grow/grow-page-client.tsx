"use client";

import { GrowModule } from "@/components/grow/grow-module";
import { GROW_TABS, type GrowTabId } from "@/components/grow/grow-tabs";
import { useCrmRestaurant } from "@/components/use-crm-restaurant";

function parseTab(raw: string | null | undefined): GrowTabId {
  const ids = new Set(GROW_TABS.map((t) => t.id));
  if (raw && ids.has(raw as GrowTabId)) return raw as GrowTabId;
  return "offers";
}

export function GrowPageClient({
  tabParam,
  customerId,
}: {
  tabParam?: string;
  customerId?: string;
}) {
  const { restaurantId, loading, error } = useCrmRestaurant();
  const tab = parseTab(tabParam);

  if (loading) return <p className="text-sm text-foreground/60">Loading Grow…</p>;
  if (!restaurantId) {
    return (
      <p className="text-sm text-red-700">
        {error ?? "No restaurant linked to this login."}
      </p>
    );
  }

  return <GrowModule restaurantId={restaurantId} tab={tab} openCustomerId={customerId} />;
}
