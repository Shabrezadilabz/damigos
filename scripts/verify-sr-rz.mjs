import { readFileSync } from "node:fs";
import { resolve } from "node:path";

for (const line of readFileSync(resolve(".env"), "utf8").split(/\r?\n/)) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (!m) continue;
  const k = m[1].trim();
  const v = m[2].trim().replace(/^["']|["']$/g, "");
  if (!(k in process.env)) process.env[k] = v;
}

const email = process.env.SHIPROCKET_EMAIL;
const pass = process.env.SHIPROCKET_PASSWORD;
const key = process.env.RAZORPAY_KEY_ID;
const secret = process.env.RAZORPAY_KEY_SECRET;

console.log(
  JSON.stringify({
    payment: process.env.PAYMENT_MODE,
    delivery: process.env.DELIVERY_MODE,
    key: key?.slice(0, 12),
  }),
);

const auth = Buffer.from(`${key}:${secret}`).toString("base64");
const rz = await fetch("https://api.razorpay.com/v1/orders", {
  method: "POST",
  headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
  body: JSON.stringify({ amount: 10000, currency: "INR", receipt: "damigos_test_1" }),
});
const rzj = await rz.json();
console.log("razorpay", rz.status, rzj.id || rzj.error?.description || rzj);

const bases = [
  process.env.SHIPROCKET_API_BASE || "https://apiv2.shiprocket.in/v1/external",
  "https://apiv2.shiprocket.in/v1/external",
];

for (const base of [...new Set(bases)]) {
  const sr = await fetch(`${base.replace(/\/$/, "")}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: pass }),
  });
  const srj = await sr.json();
  console.log("shiprocket", base, sr.status, srj.token ? "token_ok" : srj.message || srj);
}
