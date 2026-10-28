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

map.GUEST_CORS_ORIGINS = map.GUEST_CORS_ORIGINS || "*";
map.CRM_CORS_ORIGINS = map.CRM_CORS_ORIGINS || "*";
map.ONBOARDING_AUTO_APPROVE = map.ONBOARDING_AUTO_APPROVE || "true";
map.GUEST_WEB_URL = "https://damigos-guest-web.vercel.app";
map.CRM_WEB_URL = "https://damigos-crm-web.vercel.app";
map.SETTLEMENT_SCHEDULER_ENABLED = map.SETTLEMENT_SCHEDULER_ENABLED || "true";

const guestKeys = [
  "OTP_BYPASS_CODE",
  "ENABLE_DEV_FIXTURES",
  "DAMIGOS_ENV",
  "GUEST_CORS_ORIGINS",
  "GUEST_WEB_URL",
  "PAYMENT_MODE",
  "RAZORPAY_KEY_ID",
  "RAZORPAY_KEY_SECRET",
  "DELIVERY_MODE",
  "SHIPROCKET_EMAIL",
  "SHIPROCKET_PASSWORD",
  "SHIPROCKET_API_BASE",
  "SHIPROCKET_PICKUP_POSTCODE",
  "SHIPROCKET_PICKUP_LOCATION",
  "KAPSO_MODE",
  "KAPSO_API_KEY",
  "KAPSO_SPARK_PHONE_NUMBER_ID",
  "KAPSO_FOOD_PHONE_NUMBER_ID",
  "KAPSO_PHONE_NUMBER_ID",
  "KAPSO_SPARK_WA_E164",
  "KAPSO_USE_SANDBOX",
  "KAPSO_WEBHOOK_VERIFY_TOKEN",
];

const crmKeys = [
  ...guestKeys.filter((k) => !k.startsWith("GUEST_")),
  "CRM_CORS_ORIGINS",
  "CRM_WEB_URL",
  "ONBOARDING_AUTO_APPROVE",
  "WALLET_TOPUP_MODE",
  "PARTNERS_NOTIFY_EMAIL",
  "SETTLEMENT_SCHEDULER_ENABLED",
  "MSG91_AUTH_KEY",
  "MSG91_SENDER_ID",
  "MSG91_OTP_TEMPLATE_ID",
  "MSG91_TEMPLATE_ID",
];

function setEnv(cwd, key, value) {
  if (!value) {
    console.log("skip empty", key);
    return;
  }
  try {
    execSync(`npx vercel env rm ${key} production -y`, { cwd, stdio: "pipe" });
  } catch {
    /* not present */
  }
  const tmp = join(process.env.TEMP || "/tmp", `venv_${key}.txt`);
  fs.writeFileSync(tmp, value, "utf8");
  try {
    execSync(`cmd /c type "${tmp}" | npx vercel env add ${key} production`, {
      cwd,
      stdio: "pipe",
      shell: true,
    });
    console.log("set", cwd.replace(/\\/g, "/").split("/").slice(-2).join("/"), key);
  } catch (e) {
    const msg = e.stderr?.toString?.() || e.message || String(e);
    console.log("FAIL", key, msg.slice(0, 160));
  }
}

const guestApi = join(root, "apps/guest/backend");
const crmApi = join(root, "apps/crm/backend");
const guestWeb = join(root, "apps/guest/frontend");
const crmWeb = join(root, "apps/crm/frontend");

for (const k of guestKeys) setEnv(guestApi, k, map[k]);
for (const k of crmKeys) setEnv(crmApi, k, map[k]);
setEnv(guestWeb, "NEXT_PUBLIC_GUEST_API_URL", "https://damigos-guest-api.vercel.app");
setEnv(crmWeb, "CRM_API_PROXY_TARGET", "https://damigos-crm-api.vercel.app");
console.log("done");
