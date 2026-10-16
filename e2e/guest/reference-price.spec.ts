import { expect, test } from "@playwright/test";
import { loadE2eFixtures } from "../fixtures";

const guestApi = process.env.GUEST_API_URL ?? "http://localhost:4000";

test.describe("G-03.05 reference price", () => {
  test("TC-G-045 chip shows when reference price set", async ({ page }) => {
    const fx = await loadE2eFixtures();
    test.skip(!fx, "db:seed required");

    const menuRes = await fetch(`${guestApi}/v1/restaurants/${fx!.restaurantId}/menu`);
    const menu = (await menuRes.json()) as {
      items: { name: string; referencePricePaise: number | null }[];
    };
    const biryani = menu.items.find((i) => i.name.includes("Hyderabadi Chicken Biryani"));
    expect(biryani?.referencePricePaise).toBe(29900);

    const paneer = menu.items.find((i) => i.name.includes("Paneer"));
    expect(paneer?.referencePricePaise ?? null).toBeNull();

    await page.goto(`/r/${fx!.restaurantId}/menu`);
    await expect(page.getByText("Hyderabadi Chicken Biryani", { exact: true })).toBeVisible();
    const chip = page.getByTestId("reference-price-chip").first();
    await expect(chip).toContainText("Est. reference");
    await expect(chip).toContainText("299");
    await expect(page.getByText(/Swiggy|Zomato/i)).not.toBeVisible();
  });
});
