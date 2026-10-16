import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { GuestMenuItem } from "@/lib/api";
import { formatInr } from "@/lib/api";

/** G-15 — read-only menu when ORDERING_PAUSED */
export function KitchenPausedMenu({
  restaurantId,
  restaurantName,
  items,
}: {
  restaurantId: string;
  restaurantName: string;
  items: GuestMenuItem[];
}) {
  return (
    <div className="mx-auto min-h-dvh max-w-lg pb-24">
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
        <h1 className="font-[family-name:var(--font-display)] text-lg font-bold">{restaurantName}</h1>
        <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          <p className="text-[10px] font-bold uppercase tracking-wide text-amber-800/80">G-ERR-06</p>
          <p className="font-semibold">
            {items.length > 0 ? "Direct ordering paused" : "Kitchen is off right now"}
          </p>
          <p className="mt-0.5 text-xs leading-snug opacity-90">
            {items.length > 0
              ? "Menu is view-only — check back later or browse other kitchens."
              : "This kitchen is not taking guest orders. Try again during open hours or pick another spot on the hub."}
          </p>
        </div>
      </header>
      {items.length > 0 ? (
        <ul className="divide-y divide-border">
          {items.map((item) => (
            <li key={item.id} className="flex justify-between gap-3 px-4 py-3 opacity-80">
              <div>
                <p className="font-medium">{item.name}</p>
                {item.description && (
                  <p className="text-xs text-foreground/60">{item.description}</p>
                )}
              </div>
              <span className="shrink-0 text-sm tabular-nums">{formatInr(item.pricePaise)}</span>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-background p-4">
        <Button variant="outline" asChild className="w-full max-w-lg mx-auto block">
          <Link href="/hub">Discover other kitchens</Link>
        </Button>
        <Button variant="ghost" asChild className="mt-2 w-full max-w-lg mx-auto block">
          <Link href={`/r/${restaurantId}`}>Back to rewards</Link>
        </Button>
      </div>
    </div>
  );
}
