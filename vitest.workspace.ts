import { defineWorkspace } from "vitest/config";

export default defineWorkspace([
  "apps/crm/backend/vitest.config.ts",
  "apps/guest/backend/vitest.config.ts",
  "apps/crm/frontend/vitest.config.ts",
  "apps/guest/frontend/vitest.config.ts",
]);
