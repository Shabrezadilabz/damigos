import Link from "next/link";

import { RewardsHub } from "@/components/rewards-hub";

import { Button } from "@/components/ui/button";

import { fetchGuestMenu } from "@/lib/api";



/** G-S1 restaurant landing — rewards (G-01.04–08) */

export default async function RestaurantPage({

  params,

  searchParams,

}: {

  params: Promise<{ restaurantId: string }>;

  searchParams: Promise<{ scan?: string }>;

}) {

  const { restaurantId } = await params;

  const { scan } = await searchParams;



  let restaurantName = "Your kitchen";
  let brand: Awaited<ReturnType<typeof fetchGuestMenu>>["restaurant"]["brand"] = null;

  try {
    const menu = await fetchGuestMenu(restaurantId);
    restaurantName = menu.restaurant.name;
    brand = menu.restaurant.brand ?? null;
  } catch {
    /* menu optional for header */
  }

  const headerStyle = brand
    ? ({
        borderColor: `${brand.primaryColor}33`,
        backgroundColor: `${brand.backgroundColor}ee`,
      } as const)
    : undefined;

  return (
    <main
      className="mx-auto min-h-dvh max-w-lg pb-24"
      style={brand ? { backgroundColor: brand.backgroundColor } : undefined}
    >
      <header
        className="sticky top-0 z-10 border-b border-border bg-background/90 px-4 py-3 backdrop-blur"
        style={headerStyle}
      >
        {brand?.logoDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={brand.logoDataUrl} alt="" className="mb-1 h-8 w-auto object-contain" />
        ) : null}
        <p
          className="text-[10px] font-bold uppercase tracking-wider text-primary"
          style={brand ? { color: brand.primaryColor } : undefined}
        >
          Packaging perks
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-lg font-bold">{restaurantName}</h1>
      </header>

      <RewardsHub restaurantId={restaurantId} scanId={scan ?? null} brand={brand} />

      <div className="px-4 pb-4">

        <Button variant="ghost" asChild className="w-full">

          <Link href="/orders">Your orders</Link>

        </Button>

      </div>

    </main>

  );

}

