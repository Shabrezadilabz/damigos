# Shiprocket at Damigos scale (100 kitchens · 1000s of orders)

## Who owns what

| Layer | Owner | Notes |
|-------|--------|--------|
| Guest checkout, kitchen board, OTP, WhatsApp | **Damigos APIs** | Multi-tenant by `restaurantId` — already concurrent |
| Quote → AWB → pickup → track webhooks | **Shiprocket External API** | One HTTP call chain **per order** |
| Rider app UI / courier OTP digits | **Courier partner** (Ola/Borzo/…) | Not exposed to Damigos |

There is **no** separate “Shiprocket Quick OTP API.” Quick is a **fleet product** on the same [External API](https://apidocs.shiprocket.in/) ([Postman](https://www.postman.com/shiprocketdev/shiprocket-dev-s-public-workspace/collection/qu05zax/shiprocket-api), [food](https://www.shiprocket.in/quick/food-delivery-services/)).

## Do you pay Shiprocket?

| Item | Typical |
|------|---------|
| External API user | Free to create |
| Wallet / freight | **Yes** — prepaid wallet; each AWB debits delivery fee (~₹10/km Quick-style) |
| Sandbox testing | May need small wallet / cancel test AWBs to refund |
| Private / hidden APIs | **Not required** for AWB + track + webhook. OTP digits are not sold as an API. Enterprise support can enable **Quick / hyperlocal** and clarify OTP-POD on partners |

**Damigos side:** restaurant pays you; you pay Shiprocket wallet (or pass-through). No Shiprocket “platform licence” for API itself beyond shipping spend + optional VAS.

## Will one Shiprocket account handle 100 restaurants?

**Yes, with pickup locations** — preferred for pilot:

1. One Shiprocket company + API user (JWT).
2. Each kitchen = `POST /settings/company/addpickup` nickname → store on `restaurants.shiprocket_pickup_location`.
3. On Accept: `create/adhoc` with that `pickup_location` + lat/lng + guest drop.
4. Concurrent Accepts = concurrent HTTP calls; Shiprocket returns **429** if you exceed rate (~headers show ~180/min class limits — queue/retry on Damigos).

**When to split accounts:** separate GST/wallets per restaurant brand, or Shiprocket rejects too many pickups on one seller. Then map `restaurantId → SR credentials` (future).

Shiprocket does **not** need a special “multi-thread restaurant mode.” They process each shipment independently; **your** CRM/guest APIs already fan out by restaurant.

## Multi-order / multi-place scenarios

| Scenario | Handled? | How |
|----------|----------|-----|
| Many orders same kitchen same minute | Yes | Parallel Accept → each gets own AWB + pickup code |
| 100 kitchens parallel | Yes | Damigos scopes by `restaurantId`; SR uses per-kitchen pickup nickname |
| Cross-By multi-leg | Partial | Existing SINGLE AWB share / SPLIT dual AWB |
| Kitchen handoff verify | Yes (Damigos) | Rider states AWB / `#shortId` / 4-digit pickup code |
| Guest drop OTP | Yes (Damigos WA) | Issued on DISPATCHED / OFD webhook — **not** from SR API |
| Courier already OTP-POD | Yes | Webhook `pod_status` / `DELIVERED` → mark delivered |

## Will it “work perfectly”?

**Production-ready if:**

- Quick/hyperlocal enabled on the SR account for Bangalore food pins  
- Wallet funded + webhook URL live (`/v1/webhooks/shiprocket`)  
- Each kitchen has verified pickup location + GPS  
- Damigos retries on 429/5xx and falls back to synthetic AWB only in mock  

**Not perfect if:** you expect Shiprocket to push OTP digits into Damigos, or one global pickup for all 100 kitchens without nicknames.

## Hidden APIs?

Paying for private APIs **won’t** give rider-app screenshots or OTP codes today. Ask SR sales/support for: Quick enablement, higher rate limits, OTP-based POD VAS on partners, multi-pickup limits. Keep Damigos handoff codes as source of truth.

## Env checklist

```env
DELIVERY_MODE=sandbox   # or live
SHIPROCKET_EMAIL=...
SHIPROCKET_PASSWORD=...
SHIPROCKET_PICKUP_LOCATION=Primary   # default; override per restaurant in DB
SHIPROCKET_WEBHOOK_TOKEN=...
DELIVERY_OTP_PEPPER=...              # hash guest OTPs
KAPSO_MODE=live
KAPSO_FOOD_PHONE_NUMBER_ID=...
```
