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
          "fixed left-0 top-0 z-50 flex h-full w-[min(100vw-3rem,16rem)] flex-col justify-between border-r border-[#E2E5EE] bg-white/95 py-5 backdrop-blur-xl transition-transform duration-200 ease-out lg:w-64 lg:translate-x-0",
          navOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto">
          <div className="px-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-[#0F1115] font-display text-xs font-extrabold text-[#EAFF81] shadow-[0_4px_12px_rgba(15,17,21,0.2)]">
                  D&apos;A
                </div>
                <div className="min-w-0">
                  <div className="truncate font-display text-[16px] font-extrabold tracking-tight text-[#0F1115]">
                    D&apos;aMigo&apos;s
                  </div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                    {kitchenOnly ? "Kitchen OS" : "Guest OS"}
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="rounded-md p-2 text-on-surface-variant hover:bg-surface-container-high lg:hidden"
                onClick={closeNav}
                aria-label="Close menu"
              >
                <MaterialIcon name="close" className="text-[22px]" />
              </button>
            </div>
            {!kitchenOnly ? (
              <div className="rounded-md border border-border bg-surface-container-lowest p-2.5">
                <CrmGuestStorefrontToggle restaurantId={restaurantId} />
              </div>
            ) : (
              <p className="rounded-md border border-border bg-surface-container-lowest p-2.5 text-[11px] text-on-surface-variant">
                Orders only — accept, prep, and dispatch.
              </p>
            )}
          </div>
          <nav className="flex flex-col gap-0.5 px-2" aria-label="CRM">
            {nav.map((item) => {
              const active =
                pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeNav}
                  className={cn(
                    "flex items-center gap-3 rounded-[14px] px-3.5 py-2.5 text-[14px] font-bold tracking-tight transition-all",
                    active
                      ? "bg-[#0F1115] text-white shadow-[0_6px_14px_-4px_rgba(15,17,21,0.28)]"
                      : "text-[#475569] hover:bg-[#EEF0F5] hover:text-[#0F1115]",
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
