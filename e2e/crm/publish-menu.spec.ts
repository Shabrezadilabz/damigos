import { expect, test } from "@playwright/test";
import {
  crmLoginViaUi,
  crmOtpToken,
  fetchGuestMenuNames,
  loadE2eFixtures,
  publishMenuItemIds,
} from "../fixtures";

test.describe("TC-C-027 publish menu", () => {
  test("draft item appears on guest menu after publish", async ({ page }) => {
    const fx = await loadE2eFixtures();
    test.skip(!fx, "Start guest-api with ENABLE_DEV_FIXTURES=true and db:seed");

    const uniqueName = `E2E Publish ${Date.now()}`;

    await crmLoginViaUi(page, fx!.devOwnerPhone, fx!.otpBypass);
    await page.goto("/menu");

    await page.getByRole("button", { name: "Draft", exact: true }).click();
    await page.getByPlaceholder("Item name").fill(uniqueName);
    await page.getByPlaceholder("Price (₹)").fill("99");
    await page.getByRole("button", { name: "Add to draft" }).click();

    await expect(page.getByText(uniqueName)).toBeVisible({ timeout: 10_000 });

    let guestNames = await fetchGuestMenuNames(fx!.restaurantId);
    expect(guestNames).not.toContain(uniqueName);

    const token = await crmOtpToken(fx!.devOwnerPhone, fx!.otpBypass);
    const draftItemsRes = await fetch(
      `${process.env.CRM_API_URL ?? "http://localhost:4001"}/v1/menu/items?restaurantId=${fx!.restaurantId}&draft=true`,
      { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" },
    );
    const draftItems = (await draftItemsRes.json()) as { items: { id: string; name: string }[] };
    const created = draftItems.items.find((i) => i.name === uniqueName);
    if (!created) throw new Error("Draft item not found after create");
    await publishMenuItemIds(fx!.restaurantId, token, [created.id]);

    await page.getByRole("button", { name: "Live", exact: true }).click();

    await expect.poll(async () => fetchGuestMenuNames(fx!.restaurantId), { timeout: 15_000 }).toContain(
      uniqueName,
    );
  });
});
