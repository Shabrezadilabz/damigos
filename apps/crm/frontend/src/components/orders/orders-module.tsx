"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { KitchenBoard } from "@/components/kitchen-board";
import { OrdersList } from "@/components/orders-list";
import { KitchenMenuStockPanel } from "@/components/orders/kitchen-menu-stock-panel";
import { OrdersActionRail, type OrdersViewMode } from "@/components/orders/orders-action-rail";
import { OrdersKitchenHistory } from "@/components/orders/orders-kitchen-history";
import { OrdersRedeemStrip } from "@/components/orders/orders-redeem-strip";
import { useCrmRestaurant } from "@/components/use-crm-restaurant";
import { subscribeCrmRefresh } from "@/lib/crm-refresh-bus";
import { readKitchenSoundOn } from "@/lib/kitchen-alert-audio";

export function OrdersModule({ mode }: { mode: OrdersViewMode }) {
  const { restaurantId } = useCrmRestaurant();
  const [connectionLabel, setConnectionLabel] = useState<string>();
  const [soundOn, setSoundOn] = useState(true);
  const refreshRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    setSoundOn(readKitchenSoundOn());
  }, []);

  const handleRegisterRefresh = useCallback((fn: () => void) => {
    refreshRef.current = fn;
  }, []);

  useEffect(() => {
    return subscribeCrmRefresh(() => {
      refreshRef.current?.();
    });
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <OrdersActionRail
        mode={mode}
        connectionLabel={connectionLabel}
        onRefresh={mode === "kitchen" ? () => refreshRef.current?.() : undefined}
        soundOn={soundOn}
        onSoundChange={setSoundOn}
      />
      {mode === "list" ? (
        <OrdersList embedded />
      ) : null}
      {mode === "kitchen" ? (
        <>
          <KitchenBoard
            chrome="stitch"
            hideTopBar
            soundEnabled={soundOn}
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
