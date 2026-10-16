import { config as loadEnv } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, devices } from "@playwright/test";

loadEnv({ path: resolve(dirname(fileURLToPath(import.meta.url)), "../.env") });

const guestBase = process.env.GUEST_WEB_URL ?? "http://localhost:3000";
const crmBase = process.env.CRM_WEB_URL ?? "http://localhost:3001";

export default defineConfig({
  testDir: ".",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  timeout: 60_000,
  use: {
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "guest",
      testMatch: /guest\/.*\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], baseURL: guestBase },
    },
    {
      name: "crm",
      testMatch: /crm\/.*\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], baseURL: crmBase },
    },
    {
      name: "integration",
      testMatch: /cross\/.*\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
      timeout: 90_000,
    },
  ],
});
