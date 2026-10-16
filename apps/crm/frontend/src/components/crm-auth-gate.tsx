"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { getCrmToken } from "@/lib/session";

/** Redirect to /start when CRM JWT missing (P0-T04) */
export function CrmAuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = getCrmToken();
    if (!token) {
      router.replace(`/start?next=${encodeURIComponent(pathname)}`);
      return;
    }
    setReady(true);
  }, [pathname, router]);

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
