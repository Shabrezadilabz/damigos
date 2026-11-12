import type { HubRestaurant } from "@/lib/api";
import type { OndcDiscoveredRestaurant } from "@/lib/ondc-beckn";

export function normalizeKitchenName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[''`]/g, "")
    .replace(/\(.*?\)/g, " ")
    .replace(/\b(restaurant|kitchen|cafe|hotel|house|corner|the|and|&|ondc|preprod|bpp|network)\b/g, " ")
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Direct onboarded wins when names match; ONDC copies are dropped. */
export function mergeDirectAndOndcHub(
  direct: HubRestaurant[],
  ondc: OndcDiscoveredRestaurant[],
): HubRestaurant[] {
  const directNorm = new Set(direct.map((r) => normalizeKitchenName(r.name)).filter(Boolean));
  const out: HubRestaurant[] = direct.map((r) => ({
    ...r,
    listingSource: r.listingSource ?? "direct",
  }));

  for (const o of ondc) {
    const key = normalizeKitchenName(o.name);
    if (!key || directNorm.has(key)) continue;
    const slug = `ondc-${o.bppId}-${o.providerId}`
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .slice(0, 120);
    out.push({
      id: `ondc:${o.bppId}:${o.providerId}`,
      name: o.name,
      slug,
      city: o.city ?? "Bangalore",
      orderingEnabled: true,
      menuPath: `/ondc?provider=${encodeURIComponent(o.providerId)}&bpp=${encodeURIComponent(o.bppId)}`,
      coverImageUrl: o.symbol ?? null,
      logoUrl: o.symbol ?? null,
      listingSource: "ondc",
      vegFriendly: true,
      pureVeg: false,
      sampleDishes: o.sampleItems.slice(0, 3).map((it) => ({
        id: it.id || `${o.providerId}-${it.name}`,
        name: it.name,
        pricePaise: Math.round(Number(it.priceInr || 0) * 100),
        isVeg: true,
        imageUrl: null,
      })),
    });
  }

  return out.sort((a, b) => a.name.localeCompare(b.name));
}
