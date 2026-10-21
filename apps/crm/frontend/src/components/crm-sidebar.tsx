"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MaterialIcon } from "@/components/material-icon";
import { useCrmShell } from "@/components/crm-shell";
import { CrmGuestStorefrontToggle } from "@/components/crm-guest-storefront-toggle";
import { CrmLogoutButton } from "@/components/crm-logout-button";
import { useCrmRestaurant } from "@/components/use-crm-restaurant";
import { cn } from "@/lib/utils";

const fullNav = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/menu", label: "Menu", icon: "restaurant_menu" },
  { href: "/grow", label: "Grow", icon: "trending_up" },
  { href: "/orders", label: "Orders", icon: "receipt_long" },
  { href: "/settings", label: "Settings", icon: "settings" },
] as const;

const kitchenNav = [
  { href: "/orders/kitchen", label: "Kitchen board", icon: "skillet" },
  { href: "/orders", label: "Orders list", icon: "receipt_long" },
] as const;

function isKitchenOnly(roles: string[]) {
  const elevated = roles.some((r) =>
    ["RESTAURANT_OWNER", "PLATFORM_ADMIN", "STAFF"].includes(r),
  );
  return !elevated && roles.includes("KITCHEN");
}

export function CrmSidebar() {
  const pathname = usePathname();
  const { restaurantId, roles } = useCrmRestaurant();
  const { navOpen, closeNav } = useCrmShell();
  const kitchenOnly = isKitchenOnly(roles);
  const nav = kitchenOnly ? kitchenNav : fullNav;
  const roleLabel = roles.includes("PLATFORM_ADMIN")
    ? "Platform admin"
    : roles.includes("RESTAURANT_OWNER")
      ? "Owner"
      : kitchenOnly
        ? "Kitchen"
        : roles[0]?.replace(/_/g, " ") ?? "Staff";

  return (
    <>
      {/* Mobile / tablet overlay */}
      <button
        type="button"
        aria-label="Close navigation"
        className={cn(
          "fixed inset-0 z-[45] bg-black/40 backdrop-blur-[2px] transition-opacity lg:hidden",
          navOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={closeNav}
      />

      <aside
        id="crm-sidebar"
        className={cn(
          "fixed left-0 top-0 z-50 flex h-full w-[min(100vw-3rem,16rem)] flex-col justify-between bg-surface-container-low py-6 shadow-[0_1px_8px_rgba(0,0,0,0.04)] transition-transform duration-200 ease-out lg:w-64 lg:translate-x-0",
          navOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto">
          <div className="px-5">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary font-[family-name:var(--font-display)] text-sm font-bold text-primary-foreground">
                  D
                </div>
                <div className="min-w-0">
                  <div className="truncate font-[family-name:var(--font-display)] text-sm font-semibold tracking-tight">
                    D&apos;aMigo&apos;s
                  </div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                    {kitchenOnly ? "Kitchen OS" : "Guest OS"}
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="rounded-lg p-2 text-on-surface-variant hover:bg-surface-container-high lg:hidden"
                onClick={closeNav}
                aria-label="Close menu"
              >
                <MaterialIcon name="close" className="text-[22px]" />
              </button>
            </div>
            {!kitchenOnly ? (
              <div className="rounded-xl bg-surface-container-lowest p-2.5 shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
                <CrmGuestStorefrontToggle restaurantId={restaurantId} />
              </div>
            ) : (
              <p className="rounded-xl bg-surface-container-lowest p-2.5 text-[11px] text-on-surface-variant shadow-sm">
                Orders only — accept, prep, and dispatch.
              </p>
            )}
          </div>
          <nav className="flex flex-col gap-1 px-3" aria-label="CRM">
            {nav.map((item) => {
              const active =
                pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeNav}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all",
                    active
                      ? "bg-primary-container text-on-primary-container shadow-[0_1px_8px_rgba(0,0,0,0.04)]"
                      : "text-on-surface-variant hover:bg-surface-container-high hover:text-foreground",
                  )}
                >
                  <MaterialIcon name={item.icon} className="text-[20px]" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex shrink-0 flex-col gap-2 px-4 pt-3">
          <div className="flex items-center gap-2.5 rounded-xl bg-surface-container-lowest p-3 shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary">
              <MaterialIcon name="person" className="text-[18px] text-primary-foreground" />
            </div>
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-xs font-semibold">CRM session</span>
              <span className="truncate text-[10px] capitalize text-on-surface-variant">{roleLabel}</span>
            </div>
          </div>
          <CrmLogoutButton />
        </div>
      </aside>
    </>
  );
}
