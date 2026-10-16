import { expect, test } from "@playwright/test";

const crmApi = process.env.CRM_API_URL ?? "http://localhost:4001";

test.describe("Redis infra", () => {
  test("crm-api /health reports redis up", async () => {
    const res = await fetch(`${crmApi}/health`, { cache: "no-store" });
    expect(res.ok).toBeTruthy();
    const data = (await res.json()) as {
      ok?: boolean;
      dependencies?: { redis?: string };
    };
    expect(data.ok).toBe(true);
    expect(data.dependencies?.redis).toBe("up");
  });
});
