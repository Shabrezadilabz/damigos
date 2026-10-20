# Shiprocket sandbox + Razorpay test setup

**Status:** wired in code (`DELIVERY_MODE=sandbox|live`, `PAYMENT_MODE=razorpay`)  
**Do this before Kapso / WhatsApp live.**

---

## References

| Product | Docs |
|---------|------|
| Razorpay API | [razorpay.com/docs/api](https://razorpay.com/docs/api) |
| Razorpay CLI | [Install CLI](https://razorpay.com/docs/api/install-cli/) |
| Razorpay ↔ Shiprocket plugin (Payment Pages) | [Payment Pages + Shiprocket](https://razorpay.com/docs/payments/payment-pages/plugins-add-ons/shiprocket/) — **ecommerce plugin**, not our custom guest checkout |
| Shiprocket API | [apidocs.shiprocket.in](https://apidocs.shiprocket.in/#2fe757ce-e268-4b28-8763-d6dbb8640e45) |
| Shiprocket Postman | [shiprocket-dev public workspace](https://www.postman.com/shiprocketdev/shiprocket-dev-s-public-workspace/collection/qu05zax/shiprocket-api) |

Our integration uses **Razorpay Orders + Checkout.js** and **Shiprocket External API** aligned for **Bangalore food / hyperlocal** (auth → serviceability → create adhoc → assign AWB → generate pickup), not the Razorpay Payment Pages Shiprocket add-on.

**Shiprocket Quick** (formerly Saral) food fleets (Ola / Borzo / Shadowfax Local, ≤50 km) use the same JWT External API. Until Quick is enabled on the account, we **prefer Instant / local** couriers from serviceability. Ask Shiprocket support to enable Quick for food if `is_new_hyperlocal=1` returns zero partners.

---

## Razorpay TEST

1. Dashboard → **Test Mode** ON → [API Keys](https://dashboard.razorpay.com/app/keys).
2. Copy Key Id (`rzp_test_…`) + Key Secret.
3. Root `.env` (never commit):

```env
PAYMENT_MODE=razorpay
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
# Optional until you expose guest-api publicly:
# RAZORPAY_WEBHOOK_SECRET=...
GUEST_WEB_URL=http://localhost:3000
```

4. Restart **guest-api** + guest web.
5. Checkout → Razorpay modal → [test cards](https://razorpay.com/docs/payments/payments/test-card-details/) e.g. `4111 1111 1111 1111`.
6. Server verifies via `POST /v1/checkout/verify-razorpay` (HMAC of `order_id|payment_id`).

**CLI (optional):**

```bash
# https://razorpay.com/docs/api/install-cli/
razorpay configure --key-id rzp_test_... --key-secret ...
razorpay --version
```

**Webhook (staging):** `POST {GUEST_API_URL}/v1/webhooks/razorpay` — forward **raw body**; set `RAZORPAY_WEBHOOK_SECRET`.

---

## Shiprocket SANDBOX / API user

Shiprocket’s **Sandbox** toggle (company settings) and the **External API** login are easy to confuse.

1. **Preferred for API:** Settings → **API** → Configure → **Create an API User**  
   (email **different** from your main Shiprocket login). Copy that email + password.  
   Docs: [Create API user](https://support.shiprocket.in/support/solutions/articles/43000604103-how-to-create-an-api-user-can-i-have-more-than-one-api-users-).
2. **Sandbox panel** credentials (Sandbox → API Email / Password) are for the sandbox UI.  
   They often **do not** work on `POST https://apiv2.shiprocket.in/v1/external/auth/login` (returns `403 Invalid email and password`).  
   If sandbox login fails, create a normal **API User** as in step 1, or confirm with Shiprocket support which credentials map to the External API.
3. Ensure a **pickup location** exists (name = `SHIPROCKET_PICKUP_LOCATION`, default `Primary`) and wallet has balance for real AWB tests (cancel test shipments to refund).
4. `.env`:

```env
DELIVERY_MODE=sandbox
SHIPROCKET_EMAIL=...          # API user email
SHIPROCKET_PASSWORD=...       # API user password
SHIPROCKET_API_BASE=https://apiv2.shiprocket.in/v1/external
SHIPROCKET_PICKUP_POSTCODE=560034
SHIPROCKET_PICKUP_LOCATION=Primary
```

5. Restart **guest-api** and **crm-api**.
6. Verify: `node scripts/verify-sr-rz.mjs` → expect `shiprocket … token_ok`.
7. Guest checkout → pincode quote → `GET /courier/serviceability/`.
8. Pay → Kitchen **Accept** → `POST /orders/create/adhoc` + `POST /courier/assign/awb`  
   (synthetic AWB fallback if assign fails; check crm-api logs).

### API sequence (food dispatch)

```
POST /auth/login
GET  /courier/serviceability/?pickup_postcode&delivery_postcode&weight&cod
     (+ optional pickup_lat/long, delivery_lat/long)
POST /orders/create/adhoc          # Bangalore city/state defaults; food weight ~0.5 kg
POST /courier/assign/awb           # courier_id from food-friendly ranking
POST /courier/generate/pickup      # notify rider to kitchen
```

Implemented in `packages/domain/src/shiprocket.ts` → `createShiprocketShipmentBundle`.  
CRM **Accept** calls this via `create-shipment-on-accept.ts`. Kitchen board shows AWB + live track + status.

### CRM food delivery updates

| Surface | What kitchen sees |
|---------|-------------------|
| Kitchen board card | Carrier, AWB, last tracking status, “Live rider track” link |
| Order list API | `shipment.foodDelivery`, `trackingUrl`, `lastTrackingStatus` |
| Webhook | `POST {GUEST_API}/v1/webhooks/shiprocket` updates shipment + may set order `DISPATCHED` / `DELIVERED` |

Optional: `SHIPROCKET_WEBHOOK_TOKEN` — send as `x-api-key` or `x-shiprocket-token`.

### Bangalore food pilot notes

- Default pickup postcode `560034` (Koramangala area) — override with kitchen GPS when set on `restaurants.lat/lng`.
- Guest quote returns `foodFriendly` + `foodDeliveryLabel` (Instant/hyperlocal vs standard).
- Vehicle tier for meals: **2-wheeler** (≤20 kg); we send ~0.5 kg food parcels.

---

## Modes cheat sheet

| Env | Behaviour |
|-----|-----------|
| `PAYMENT_MODE=mock` | One-click mock pay |
| `PAYMENT_MODE=stub` | Prepare → confirm-stub / webhook E2E |
| `PAYMENT_MODE=razorpay` | Real Checkout.js (use **test** keys locally) |
| `DELIVERY_MODE=off` | No pincode quote |
| `DELIVERY_MODE=mock` | Fake 560xxx rates |
| `DELIVERY_MODE=sandbox` / `live` | Real Shiprocket API |

---

## Verify quickly

```bash
# Delivery config
curl http://localhost:4000/v1/delivery/config

# Serviceability (sandbox)
curl "http://localhost:4000/v1/delivery/serviceability?pincode=560034"
```

Expect `mode: "sandbox"` and `shiprocketConfigured: true`.

---

## Security

- Keep sandbox password + Razorpay secret in `.env` only (gitignored).
- Rotate any secrets that were pasted into chat or tickets.
- Never use `rzp_live_` / production Shiprocket until pilot go-live.

---

## After this works → Kapso

Only once checkout pay + delivery quote + Accept AWB work end-to-end, turn on WhatsApp (`KAPSO_MODE=live` / sandbox). See [KAPSO-AGENTS.md](./KAPSO-AGENTS.md).
