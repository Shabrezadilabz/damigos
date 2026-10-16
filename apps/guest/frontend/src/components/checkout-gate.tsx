"use client";

import { useEffect, useState } from "react";
import { ProfileConsentSheet } from "@/components/profile-consent-sheet";
import { fetchMe } from "@/lib/api";
import { getGuestToken } from "@/lib/session";

export function CheckoutGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [showSheet, setShowSheet] = useState(false);

  useEffect(() => {
    async function check() {
      const token = getGuestToken();
      if (!token) {
        setShowSheet(true);
        return;
      }
      try {
        const me = await fetchMe(token);
        if (me.profileComplete) setReady(true);
        else setShowSheet(true);
      } catch {
        setShowSheet(true);
      }
    }
    void check();
  }, []);

  return (
    <>
      {ready ? children : <p className="p-4 text-sm text-foreground/70">Complete profile to checkout…</p>}
      <ProfileConsentSheet
        open={showSheet}
        onComplete={() => {
          setShowSheet(false);
          setReady(true);
        }}
      />
    </>
  );
}
