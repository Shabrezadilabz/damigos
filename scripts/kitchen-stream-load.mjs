/**
 * P2-T07 load smoke — open N concurrent kitchen SSE connections.
 *
 * Usage (crm-api running, Redis up):
 *   node scripts/kitchen-stream-load.mjs --phone=9876543210 --otp=000000 --restaurantId=<uuid> --connections=10
 */
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), "..", ".env") });

const crmApi = process.env.CRM_API_URL ?? "http://localhost:4001";

function arg(name, fallback) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split("=").slice(1).join("=") : fallback;
}

const phone = arg("phone", process.env.DEV_OWNER_PHONE ?? "9876543210");
const otp = arg("otp", process.env.OTP_BYPASS_CODE ?? "000000");
const connections = Number(arg("connections", "8"));
const restaurantIdArg = arg("restaurantId", "");

async function otpVerify() {
  const res = await fetch(`${crmApi}/v1/auth/otp/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, code: otp }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? "OTP failed");
  return data;
}

async function openStream(token, restaurantId, idx) {
  const url = `${crmApi}/v1/kitchen/stream?restaurantId=${restaurantId}&token=${encodeURIComponent(token)}`;
  const res = await fetch(url, {
    headers: { Accept: "text/event-stream" },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`conn ${idx}: HTTP ${res.status} ${body}`);
  }
  const reader = res.body?.getReader();
  if (!reader) throw new Error(`conn ${idx}: no body`);
  const decoder = new TextDecoder();
  let buf = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    if (buf.includes("event: connected")) {
      return { idx, peers: res.headers.get("x-kitchen-connections") };
    }
  }
  throw new Error(`conn ${idx}: stream closed before connected`);
}

const session = await otpVerify();
const restaurantId = restaurantIdArg || session.restaurantId;
if (!restaurantId) {
  console.error("restaurantId required (flag or JWT)");
  process.exit(1);
}

console.log(`Opening ${connections} SSE connections for ${restaurantId}…`);
const started = Date.now();
const results = await Promise.all(
  Array.from({ length: connections }, (_, i) => openStream(session.token, restaurantId, i + 1)),
);
console.log(
  `OK ${results.length} connected in ${Date.now() - started}ms (last peers header: ${results.at(-1)?.peers})`,
);
