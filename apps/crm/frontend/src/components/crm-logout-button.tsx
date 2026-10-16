"use client";

import { useRouter } from "next/navigation";
import { MaterialIcon } from "@/components/material-icon";
import { clearCrmSession } from "@/lib/session";
import { cn } from "@/lib/utils";

export function CrmLogoutButton({
  className,
  variant = "sidebar",
}: {
  className?: string;
  variant?: "sidebar" | "header";
}) {
  const router = useRouter();

  function onLogout() {
    clearCrmSession();
    router.replace("/start");
  }

  if (variant === "header") {
    return (
      <button
        type="button"
        onClick={onLogout}
        title="Log out"
        data-testid="crm-logout"
        className={cn(
          "flex h-9 items-center gap-1.5 rounded-lg bg-surface-container-low px-2.5 text-xs font-semibold text-on-surface-variant hover:bg-surface-container-high hover:text-foreground",
          className,
        )}
      >
        <MaterialIcon name="logout" className="text-[18px]" />
        <span className="hidden sm:inline">Log out</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onLogout}
      data-testid="crm-logout"
      className={cn(
        "flex w-full items-center justify-center gap-2 rounded-lg border border-outline-variant/50 bg-surface-container-low px-3 py-2 text-xs font-semibold text-on-surface-variant transition hover:bg-surface-container-high hover:text-foreground",
        className,
      )}
    >
      <MaterialIcon name="logout" className="text-[18px]" />
      Log out
    </button>
  );
}
