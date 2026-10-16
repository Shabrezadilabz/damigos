import { expect, test } from "@playwright/test";
import {
  crmLoginViaUi,
  crmOtpToken,
  fetchGuestMenuNames,
  loadE2eFixtures,
  publishMenuItemIds,
} from "../fixtures";

const crmApi = process.env.CRM_API_URL ?? "http://localhost:4001";

test.describe("C-03.05 / C-03.07 menu item drawer", () => {
  test("TC-C-026 edit drawer saves live item", async ({ page }) => {
    const fx = await loadE2eFixtures();
    test.skip(!fx, "ENABLE_DEV_FIXTURES=true");

    const uniqueName = `E2E Drawer ${Date.now()}`;
    const token = await crmOtpToken(fx!.devOwnerPhone, fx!.otpBypass);

    const create = await fetch(`${crmApi}/v1/menu/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        restaurantId: fx!.restaurantId,
        name: uniqueName,
        pricePaise: 12_500,
        isVeg: true,
      }),
    });
    expect(create.ok).toBe(true);
    const { item } = (await create.json()) as { item: { id: string } };
    await publishMenuItemIds(fx!.restaurantId, token, [item.id]);

    await crmLoginViaUi(page, fx!.devOwnerPhone, fx!.otpBypass);
    await page.goto("/menu");
    await page.getByRole("button", { name: "Live", exact: true }).click();
    await page.getByText(uniqueName).click();

    const edited = `${uniqueName} edited`;
    await page.getByTestId("menu-item-name").fill(edited);
    await page.getByTestId("menu-item-price").fill("149");
    await page.getByRole("button", { name: "Save" }).click();

    await expect(page.getByRole("dialog", { name: /Edit item/i })).toBeHidden({ timeout: 10_000 });
    await expect(page.getByText(edited)).toBeVisible();

    await expect.poll(async () => fetchGuestMenuNames(fx!.restaurantId), { timeout: 10_000 }).toContain(
      edited,
    );
  });

  test("TC-C-028 86 hides item from guest menu", async ({ page }) => {
    const fx = await loadE2eFixtures();
    test.skip(!fx, "ENABLE_DEV_FIXTURES=true");

    const uniqueName = `E2E 86 ${Date.now()}`;
    const token = await crmOtpToken(fx!.devOwnerPhone, fx!.otpBypass);

    const create = await fetch(`${crmApi}/v1/menu/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        restaurantId: fx!.restaurantId,
        name: uniqueName,
        pricePaise: 9900,
        isVeg: true,
      }),
    });
    const { item } = (await create.json()) as { item: { id: string } };
    await publishMenuItemIds(fx!.restaurantId, token, [item.id]);

    let names = await fetchGuestMenuNames(fx!.restaurantId);
    expect(names).toContain(uniqueName);

    await crmLoginViaUi(page, fx!.devOwnerPhone, fx!.otpBypass);
    await page.goto("/menu");
    await page.getByRole("button", { name: "Live", exact: true }).click();
    await page.getByText(uniqueName).click();
    await page.getByRole("button", { name: /86 — hide from menu/i }).click();

    await expect(page.getByText("86'd").first()).toBeVisible({ timeout: 10_000 });

    await expect.poll(async () => fetchGuestMenuNames(fx!.restaurantId), { timeout: 10_000 }).not.toContain(
      uniqueName,
    );
  });
});
