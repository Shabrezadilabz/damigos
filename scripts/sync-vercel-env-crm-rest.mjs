import fs from "fs";
import { execSync } from "child_process";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const raw = fs.readFileSync(join(root, ".env"), "utf8");
const map = {};
for (const line of raw.split(/\r?\n/)) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const i = t.indexOf("=");
  if (i < 0) continue;
  map[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^["']|["']$/g, "");
}
map.CRM_CORS_ORIGINS = "*";
map.CRM_WEB_URL = "https://damigos-crm-web.vercel.app";
map.ONBOARDING_AUTO_APPROVE = "true";
map.SETTLEMENT_SCHEDULER_ENABLED = map.SETTLEMENT_SCHEDULER_ENABLED || "true";

const keys = [
  "KAPSO_MODE",
  "KAPSO_API_KEY",
  "KAPSO_SPARK_PHONE_NUMBER_ID",
  "KAPSO_FOOD_PHONE_NUMBER_ID",
  "KAPSO_PHONE_NUMBER_ID",
  "KAPSO_SPARK_WA_E164",
  "KAPSO_USE_SANDBOX",
  "KAPSO_WEBHOOK_VERIFY_TOKEN",
  "CRM_CORS_ORIGINS",
  "CRM_WEB_URL",
  "ONBOARDING_AUTO_APPROVE",
  "WALLET_TOPUP_MODE",
  "PARTNERS_NOTIFY_EMAIL",
  "SETTLEMENT_SCHEDULER_ENABLED",
];

const cwd = join(root, "apps/crm/backend");
const guestWeb = join(root, "apps/guest/frontend");
const crmWeb = join(root, "apps/crm/frontend");

function setEnv(dir, key, value) {
  if (!value) return;
  try {
    execSync(`npx vercel env rm ${key} production -y`, { cwd: dir, stdio: "pipe" });
  } catch {}
  const tmp = join(process.env.TEMP || "/tmp", `venv_${key}.txt`);
  fs.writeFileSync(tmp, value, "utf8");
  execSync(`cmd /c type "${tmp}" | npx vercel env add ${key} production`, {
    cwd: dir,
    stdio: "pipe",
    shell: true,
  });
  console.log("set", key);
}

for (const k of keys) {
  try {
    setEnv(cwd, k, map[k]);
  } catch (e) {
    console.log("FAIL", k, String(e.message || e).slice(0, 100));
  }
}
try {
  setEnv(guestWeb, "NEXT_PUBLIC_GUEST_API_URL", "https://damigos-guest-api.vercel.app");
} catch (e) {
  console.log("FAIL guest web", e.message);
}
try {
  setEnv(crmWeb, "CRM_API_PROXY_TARGET", "https://damigos-crm-api.vercel.app");
} catch (e) {
  console.log("FAIL crm web", e.message);
}
console.log("done");
