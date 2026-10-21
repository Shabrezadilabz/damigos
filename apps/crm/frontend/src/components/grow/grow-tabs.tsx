"use client";

import Link from "next/link";
import { MaterialIcon } from "@/components/material-icon";
import { cn } from "@/lib/utils";

export const GROW_TABS = [
  { id: "offers", label: "Offers & game", icon: "redeem" },
  { id: "customers", label: "Customers", icon: "group" },
  { id: "campaigns", label: "Campaigns", icon: "campaign" },
  { id: "wallet", label: "Wallet", icon: "account_balance_wallet" },
  { id: "poster", label: "AI poster", icon: "auto_awesome", badge: "Beta" },
] as const;

export type GrowTabId = (typeof GROW_TABS)[number]["id"];

export function GrowTabs({ active }: { active: GrowTabId }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div className="-mx-1 max-w-full overflow-x-auto px-1 [scrollbar-width:thin]">
        <div className="inline-flex min-w-min items-center gap-1 rounded-xl bg-surface-container-high p-1 shadow-sm sm:gap-2">
          {GROW_TABS.map((tab) => {
            const isActive = tab.id === active;
            return (
              <Link
                key={tab.id}
                href={`/grow?tab=${tab.id}`}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold transition-all sm:gap-2 sm:px-3.5",
                  isActive
                    ? "bg-surface-container-lowest text-primary shadow-[0_2px_8px_-2px_rgba(28,28,28,0.08)]"
                    : "text-on-surface-variant hover:text-foreground",
                )}
              >
                <MaterialIcon
                  name={tab.icon}
                  className={cn(
                    "text-[18px]",
                    tab.id === "poster" && !isActive && "text-tertiary",
                    isActive && tab.id === "campaigns" && "[font-variation-settings:'FILL'_1]",
                  )}
                />
                <span className="whitespace-nowrap">{tab.label}</span>
                {isActive && tab.id === "campaigns" ? (
                  <span className="ml-0.5 h-1.5 w-1.5 rounded-full bg-primary" />
                ) : null}
                {"badge" in tab && tab.badge ? (
                  <span className="rounded-full bg-tertiary-fixed px-1.5 py-0.5 text-[9px] font-bold uppercase text-on-tertiary-fixed">
                    {tab.badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>
      </div>
      <div className="hidden items-center gap-4 rounded-xl bg-surface-container-low px-4 py-2 xl:flex">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 animate-pulse rounded-full bg-[#24963F]" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
            WhatsApp Meta Tier:
          </span>
          <span className="text-xs font-semibold">Tier 2 (10k msgs/day)</span>
        </div>
        <span className="h-1 w-1 rounded-full bg-outline-variant" />
        <span className="flex items-center gap-1.5 text-[10px] font-semibold text-on-surface-variant">
          <MaterialIcon name="bolt" className="text-[16px] text-tertiary" />
          99.4% Delivery rate
        </span>
      </div>
    </div>
  );
}
