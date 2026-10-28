"use client";

import { useEffect } from "react";

const PROMPTED_KEY = "damigos_guest_location_prompted_v1";
const COORDS_KEY = "damigos_guest_last_coords";

/**
 * Ask for live location as soon as the app opens.
 * Soft-fail if denied / GPS off — never blocks rendering.
 */
export function GuestLocationBootstrap() {
  useEffect(() => {
    if (typeof window === "undefined" || !navigator.geolocation) return;
    try {
      if (sessionStorage.getItem(PROMPTED_KEY) === "1") return;
      sessionStorage.setItem(PROMPTED_KEY, "1");
    } catch {
      /* ignore */
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        try {
          localStorage.setItem(
            COORDS_KEY,
            JSON.stringify({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              at: new Date().toISOString(),
            }),
          );
        } catch {
          /* ignore */
        }
      },
      () => {
        /* permission denied / location off — Settings can re-prompt */
      },
      { enableHighAccuracy: false, timeout: 12_000, maximumAge: 60_000 },
    );
  }, []);

  return null;
}
