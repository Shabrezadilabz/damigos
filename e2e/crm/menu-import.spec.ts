import { expect, test } from "@playwright/test";
import { crmLoginViaUi, crmOtpToken, loadE2eFixtures } from "../fixtures";

const crmApi = process.env.CRM_API_URL ?? "http://localhost:4001";

type ImportJobPoll = {
  status: string;
  progressPct: number;
  errorMessage?: string | null;
};

async function waitForImportJob(token: string, jobId: string): Promise<ImportJobPoll> {
  for (let i = 0; i < 30; i += 1) {
    const res = await fetch(`${crmApi}/v1/menu/import/${jobId}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const data = (await res.json()) as { job: ImportJobPoll };
    if (data.job.status === "completed" || data.job.status === "failed") return data.job;
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error("Import job poll timeout");
}

test.describe("C-03.03 menu PDF import", () => {
  test("TC-C-022/023 mock import creates draft rows", async ({ page }) => {
    const fx = await loadE2eFixtures();
    test.skip(!fx, "ENABLE_DEV_FIXTURES=true");

    await crmLoginViaUi(page, fx!.devOwnerPhone, fx!.otpBypass);
    await page.goto("/menu");

    const token = await crmOtpToken(fx!.devOwnerPhone, fx!.otpBypass);
    const start = await fetch(`${crmApi}/v1/menu/import`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ restaurantId: fx!.restaurantId, fileName: "e2e-demo-menu.pdf" }),
    });
    expect(start.ok).toBe(true);
    const { job } = (await start.json()) as { job: { id: string; status: string } };
    expect(job.status).toBe("queued");

    const finished = await waitForImportJob(token, job.id);
    expect(finished.status).toBe("completed");

    const draftRes = await fetch(
      `${crmApi}/v1/menu/items?restaurantId=${fx!.restaurantId}&draft=true`,
      { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" },
    );
    const draft = (await draftRes.json()) as { items: { name: string }[] };
    expect(draft.items.some((i) => i.name.includes("AI Imported Paneer"))).toBe(true);

    await page.getByRole("button", { name: "Draft", exact: true }).click();
    await expect(page.getByText("AI Imported Paneer Butter Masala")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Needs review").first()).toBeVisible();
  });

  test("TC-C-025 split review UI flags low confidence", async ({ page }) => {
    const fx = await loadE2eFixtures();
    test.skip(!fx, "ENABLE_DEV_FIXTURES=true");

    await crmLoginViaUi(page, fx!.devOwnerPhone, fx!.otpBypass);
    await page.goto("/menu");

    await page.locator("[data-testid=menu-pdf-upload]").setInputFiles({
      name: "e2e-demo-menu.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4 e2e"),
    });

    await page.getByRole("button", { name: "Draft", exact: true }).click();
    await expect(page.getByText("AI Imported Chicken Chettinad")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText("Needs review").first()).toBeVisible();
  });

  test("TC-C-025 low-confidence scores in import job API", async () => {
    const fx = await loadE2eFixtures();
    test.skip(!fx, "ENABLE_DEV_FIXTURES=true");

    const token = await crmOtpToken(fx!.devOwnerPhone, fx!.otpBypass);
    const start = await fetch(`${crmApi}/v1/menu/import`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ restaurantId: fx!.restaurantId, fileName: "e2e-confidence.pdf" }),
    });
    const { job } = (await start.json()) as { job: { id: string } };
    await waitForImportJob(token, job.id);

    const jobRes = await fetch(`${crmApi}/v1/menu/import/${job.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const detail = (await jobRes.json()) as {
      reviewItems: { name: string; importConfidence: number | null }[];
    };
    const chettinad = detail.reviewItems.find((i) => i.name.includes("Chettinad"));
    expect(chettinad?.importConfidence).toBe(55);
  });

  test("TC-C-024 failed import surfaces error", async () => {
    const fx = await loadE2eFixtures();
    test.skip(!fx, "ENABLE_DEV_FIXTURES=true");

    const token = await crmOtpToken(fx!.devOwnerPhone, fx!.otpBypass);
    const start = await fetch(`${crmApi}/v1/menu/import`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ restaurantId: fx!.restaurantId, fileName: "e2e-import-fail.pdf" }),
    });
    const { job } = (await start.json()) as { job: { id: string } };
    const finished = await waitForImportJob(token, job.id);
    expect(finished.status).toBe("failed");
    expect(finished.errorMessage).toMatch(/parse|fail/i);
  });
});
