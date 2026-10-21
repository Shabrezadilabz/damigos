"use client";

import { useEffect } from "react";
import { fetchCrmBrandKit } from "@/lib/api";
import {
  applyCrmTheme,
  DEFAULT_CRM_THEME,
  readStoredCrmTheme,
  storeCrmTheme,
} from "@/lib/crm-theme";
import { useCrmRestaurant } from "@/components/use-crm-restaurant";

/** Loads kitchen brand kit / local theme and paints CRM CSS tokens. */
export function CrmThemeProvider({ children }: { children: React.ReactNode }) {
  const { restaurantId } = useCrmRestaurant();

  useEffect(() => {
    const cached = readStoredCrmTheme();
    applyCrmTheme(cached ?? DEFAULT_CRM_THEME);
  }, []);

  useEffect(() => {
    if (!restaurantId) return;
    let cancelled = false;
    void fetchCrmBrandKit(restaurantId)
      .then((kit) => {
        if (cancelled) return;
        const theme = {
          primaryColor: kit.primaryColor,
          backgroundColor: kit.backgroundColor,
          accentColor: kit.accentColor,
        };
        storeCrmTheme(theme);
        applyCrmTheme(theme);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [restaurantId]);

  return <>{children}</>;
}
