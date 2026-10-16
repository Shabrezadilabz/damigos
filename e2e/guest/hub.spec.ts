import { expect, test } from "@playwright/test";
import { guestOtpToken, guestSeedSession, loadE2eFixtures } from "../fixtures";

const guestApi = process.env.GUEST_API_URL ?? "http://localhost:4000";

test.describe("G-07 Discover hub", () => {
  test("TC-G-090 hub lists curated kitchens only", async ({ page }) => {
    const fx = await loadE2eFixtures();
    test.skip(!fx?.hubSecondRestaurantId, "Re-run db:seed for hub kitchens");

    const hubRes = await fetch(`${guestApi}/v1/hub/restaurants?city=bangalore`);
    expect(hubRes.ok).toBe(true);
    const hub = (await hubRes.json()) as { restaurants: { id: string; name: string }[] };
    expect(hub.restaurants.length).toBeGreaterThanOrEqual(2);
    expect(hub.restaurants.some((r) => r.id === fx!.restaurantId)).toBe(true);
    expect(hub.restaurants.some((r) => r.id === fx!.hubSecondRestaurantId)).toBe(true);
    expect(hub.restaurants.some((r) => r.name.includes("Paused"))).toBe(false);

    await page.goto("/hub");
    await expect(page.getByTestId("hub-kitchen-list")).toBeVisible();
    await expect(page.getByText("Masala Trail Indiranagar")).toBeVisible();
    await expect(page.getByText("Biryani Box Koramangala")).toBeVisible();
    await expect(page.getByText("Cloud Kitchen (Paused Demo)")).not.toBeVisible();
  });

  test("TC-G-092 switch kitchen clears cart after confirm", async ({ page }) => {
    const fx = await loadE2eFixtures();
    test.skip(!fx?.hubSecondRestaurantId, "Re-run db:seed for hub kitchens");

    const token = await guestOtpToken(fx!.devGuestPhone, fx!.otpBypass);
    await guestSeedSession(page, fx!.devGuestPhone, fx!.otpBypass);

    const menuRes = await fetch(`${guestApi}/v1/restaurants/${fx!.restaurantId}/menu`);
    const menu = (await menuRes.json()) as { items: { id: string }[] };
    await fetch(`${guestApi}/v1/cart/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        restaurantId: fx!.restaurantId,
        menuItemId: menu.items[0].id,
        quantity: 1,
      }),
    });

    const openBefore = await fetch(`${guestApi}/v1/cart/open`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect((await openBefore.json()).openCart).toBeTruthy();

    await page.goto("/hub");
    await page.getByRole("link", { name: "Order" }).filter({ hasText: /^Order$/ }).nth(1).click();
    await expect(page.getByRole("dialog", { name: /Switch kitchen/i })).toBeVisible();
    await page.getByRole("button", { name: /Clear & continue/i }).click();
    await page.waitForURL(new RegExp(`/r/${fx!.hubSecondRestaurantId}/menu`), { timeout: 15_000 });

    const openAfter = await fetch(`${guestApi}/v1/cart/open`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect((await openAfter.json()).openCart).toBeNull();
  });
});
