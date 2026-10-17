"use client";

import { useCallback, useRef, useState } from "react";
import { KitchenBoard } from "@/components/kitchen-board";
import { OrdersList } from "@/components/orders-list";
import { KitchenMenuStockPanel } from "@/components/orders/kitchen-menu-stock-panel";
import { OrdersActionRail, type OrdersViewMode } from "@/components/orders/orders-action-rail";
import { OrdersKitchenHistory } from "@/components/orders/orders-kitchen-history";
import { OrdersRedeemStrip } from "@/components/orders/orders-redeem-strip";
import { useCrmRestaurant } from "@/components/use-crm-restaurant";

export function OrdersModule({ mode }: { mode: OrdersViewMode }) {
  const { restaurantId } = useCrmRestaurant();
  const [connectionLabel, setConnectionLabel] = useState<string>();
  const refreshRef = useRef<(() => void) | null>(null);

  const handleRegisterRefresh = useCallback((fn: () => void) => {
    refreshRef.current = fn;
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <OrdersActionRail
        mode={mode}
        connectionLabel={connectionLabel}
        onRefresh={mode === "kitchen" ? () => refreshRef.current?.() : undefined}
      />
      {mode === "list" ? (
        <OrdersList embedded />
      ) : null}
      {mode === "kitchen" ? (
        <>
          <KitchenBoard
            chrome="stitch"
            hideTopBar
            onConnectionLabel={setConnectionLabel}
            registerRefresh={handleRegisterRefresh}
          />
          {restaurantId ? <OrdersKitchenHistory restaurantId={restaurantId} /> : null}
          <OrdersRedeemStrip />
        </>
      ) : null}
      {mode === "stock" ? (
        restaurantId ? (
          <KitchenMenuStockPanel restaurantId={restaurantId} />
        ) : (
          <p className="text-sm text-on-surface-variant">Select a restaurant to manage menu stock.</p>
        )
      ) : null}
    </div>
  );
}
