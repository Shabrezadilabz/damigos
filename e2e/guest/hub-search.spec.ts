import { expect, test } from "@playwright/test";
import { loadE2eFixtures } from "../fixtures";

const guestApi = process.env.GUEST_API_URL ?? "http://localhost:4000";

test.describe("G-07.02 hub search", () => {
  test("TC-G-091 filters kitchens by query", async ({ page }) => {
    const fx = await loadE2eFixtures();
    test.skip(!fx?.hubSecondRestaurantId, "Re-run db:seed for hub kitchens");

    const res = await fetch(`${guestApi}/v1/hub/restaurants?city=bangalore&q=masala`);
    const data = (await res.json()) as { restaurants: { name: string }[] };
    expect(data.restaurants.length).toBe(1);
    expect(data.restaurants[0].name).toMatch(/Masala Trail/i);

    await page.goto("/hub");
    await page.getByTestId("hub-search").fill("Masala");
    await expect(page.getByText("Masala Trail Indiranagar")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Biryani Box Koramangala")).not.toBeVisible();

    await page.getByTestId("hub-search").fill("zzznomatch");
    await expect(page.getByTestId("hub-empty")).toContainText(/No kitchens match/i);
  });
});
