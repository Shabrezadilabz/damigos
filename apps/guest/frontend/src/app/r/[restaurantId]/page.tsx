import { RewardsHub } from "@/components/rewards-hub";
import { fetchGuestMenu } from "@/lib/api";

/** G-S1 restaurant landing — rewards (G-01.04–08) + Sparkle Win */
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

  return (
    <main className="min-h-dvh bg-background pb-8">
      <RewardsHub
        restaurantId={restaurantId}
        scanId={scan ?? null}
        brand={brand}
        restaurantName={restaurantName}
      />
    </main>
  );
}
