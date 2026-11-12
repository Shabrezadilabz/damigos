import { describe, expect, it } from "vitest";
import { mergeDirectAndOndcHub, normalizeKitchenName } from "../../../src/lib/hub-ondc-merge";
import type { HubRestaurant } from "../../../src/lib/api";
import type { OndcDiscoveredRestaurant } from "../../../src/lib/ondc-beckn";

const direct = (name: string, id = "d1"): HubRestaurant => ({
  id,
  name,
  slug: name.toLowerCase().replace(/\s+/g, "-"),
  city: "Bangalore",
  orderingEnabled: true,
  menuPath: `/r/${id}/menu`,
  listingSource: "direct",
});

const ondc = (name: string, providerId: string): OndcDiscoveredRestaurant => ({
  providerId,
  bppId: "bpp.test",
  bppUri: "https://bpp.test",
  name,
  city: "Bengaluru",
  itemsCount: 1,
  sampleItems: [{ id: "i1", name: "Item", priceInr: "100" }],
  updatedAt: new Date().toISOString(),
});

describe("hub-ondc-merge", () => {
  it("normalizes kitchen names for match", () => {
    expect(normalizeKitchenName("The Biryani Cafe & Restaurant")).toBe("biryani");
  });

  it("keeps Direct and drops ONDC duplicate by name", () => {
    const merged = mergeDirectAndOndcHub(
      [direct("HSR Donne Biryani House")],
      [ondc("HSR Donne Biryani House (ONDC PreProd)", "p1"), ondc("New ONDC Kitchen", "p2")],
    );
    const names = merged.map((r) => r.name);
    expect(names).toContain("HSR Donne Biryani House");
    expect(names).toContain("New ONDC Kitchen");
    expect(merged.filter((r) => r.listingSource === "ondc")).toHaveLength(1);
    expect(merged.find((r) => r.name.includes("HSR"))?.listingSource).toBe("direct");
  });

  it("tags ONDC listings", () => {
    const merged = mergeDirectAndOndcHub([], [ondc("Only ONDC", "x")]);
    expect(merged[0]?.listingSource).toBe("ondc");
    expect(merged[0]?.id.startsWith("ondc:")).toBe(true);
  });
});
