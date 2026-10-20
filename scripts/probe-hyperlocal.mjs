import { readFileSync } from "node:fs";
import { resolve } from "node:path";

for (const line of readFileSync(resolve(".env"), "utf8").split(/\r?\n/)) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (!m) continue;
  const k = m[1].trim();
  const v = m[2].trim().replace(/^["']|["']$/g, "");
  if (!(k in process.env)) process.env[k] = v;
}

const base = "https://apiv2.shiprocket.in/v1/external";
const login = await fetch(`${base}/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    email: process.env.SHIPROCKET_EMAIL,
    password: process.env.SHIPROCKET_PASSWORD,
  }),
});
const { token } = await login.json();
if (!token) {
  console.log("login failed", await login.text());
  process.exit(1);
}

async function probe(label, query) {
  const qs = new URLSearchParams(query);
  const sv = await fetch(`${base}/courier/serviceability/?${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const svj = await sv.json();
  const cos = svj?.data?.available_courier_companies || [];
  console.log("\n==", label, "status", sv.status, "count", cos.length);
  console.log("data_keys", Object.keys(svj?.data || {}));
  for (const c of cos.slice(0, 10)) {
    console.log(
      "-",
      c.courier_company_id,
      c.courier_name,
      "rate",
      c.rate ?? c.freight_charge,
      "etd",
      c.etd || c.etd_hours,
      "local",
      c.is_local ?? c.is_hyperlocal ?? c.courier_type,
    );
  }
}

await probe("plain", {
  pickup_postcode: "560034",
  delivery_postcode: "560034",
  weight: "0.5",
  cod: "0",
  order_value: "299",
});

await probe("is_new_hyperlocal", {
  pickup_postcode: "560034",
  delivery_postcode: "560034",
  weight: "0.5",
  cod: "0",
  order_value: "299",
  is_new_hyperlocal: "1",
});

await probe("latlng", {
  pickup_postcode: "560034",
  delivery_postcode: "560001",
  weight: "0.5",
  cod: "0",
  order_value: "299",
  pickup_lat: "12.9352",
  pickup_long: "77.6245",
  delivery_lat: "12.9716",
  delivery_long: "77.5946",
  is_new_hyperlocal: "1",
});
