# D'aMigo's — API Contracts Overview

**Version:** 1.0 — OpenAPI YAML to be added at `damigos-platform/openapi/` when repo scaffolded.

---

## Guest API (`guest-api`)

| Method | Path | Feature IDs |
|--------|------|-------------|
| POST | `/v1/auth/otp/request` | G-02.01 |
| POST | `/v1/auth/otp/verify` | G-02.01 |
| GET | `/v1/me` | G-02.01 |
| POST | `/v1/me/profile` | G-02.01 |
| POST | `/v1/me/consents` | G-02.02 |
| GET | `/v1/scan/resolve` | G-01.01 |
| GET | `/v1/me/restaurants/:id/profile` | G-01.02 |
| GET | `/v1/restaurants/:id/offers/active` | G-01.04 |
| POST | `/v1/rewards/spin` | G-01.05 |
| POST | `/v1/rewards/claim` | G-01.07 |
| GET | `/v1/restaurants/:id/menu` | G-03.01 |
| GET/POST/PATCH/DELETE | `/v1/cart`, `/v1/cart/items` | G-03.04 |
| POST | `/v1/me/addresses` | G-04.02 |
| GET | `/v1/delivery/serviceability` | G-04.02 |
| POST | `/v1/delivery/quote` | G-04.03 |
| POST | `/v1/orders` | G-04.05 |
| GET | `/v1/orders/:id` | G-05.01 |
| GET | `/v1/me/orders?status=active\|past` | G-06.01 |
| GET | `/v1/hub/restaurants` | G-07.01 |

---

## CRM API (`crm-api`)

| Method | Path | Feature IDs |
|--------|------|-------------|
| GET | `/v1/kitchen/stream?restaurantId=&token=` | C-05.02 SSE |
| POST | `/v1/onboarding/applications` | C-01.01 |
| POST | `/v1/auth/otp/*` | C-01.02 |
| GET | `/v1/dashboard/overview` | C-02.01 |
| GET | `/v1/dashboard/analytics` | C-02.04 |
| CRUD | `/v1/menu/*` | C-03.* |
| GET/PUT | `/v1/grow/offers-game` | C-04.01 |
| GET | `/v1/customers` | C-04.02 |
| CRUD | `/v1/campaigns` | C-04.04-05 |
| GET/POST | `/v1/wallet/*` | C-04.06 |
| GET/POST | `/v1/orders/*` | C-05.* |
| WS | `/v1/ws/kitchen` | C-05.02 |
| POST | `/v1/redeem/validate` | C-05.04 |
| PATCH | `/v1/settings/*` | C-06.* |
| POST | `/v1/stickers/activate` | C-06.04 |
| POST | `/v1/admin/sticker-batches` | C-06.05 |
| POST | `/v1/admin/sticker-batches/:id/revoke` | C-06.06 |

---

## Standard error envelope

```json
{
  "error": {
    "code": "STICKER_EXPIRED",
    "message": "Human readable",
    "correlationId": "uuid"
  }
}
```

---

## Idempotency

Header `Idempotency-Key` required on `POST /v1/orders` and wallet top-up.
