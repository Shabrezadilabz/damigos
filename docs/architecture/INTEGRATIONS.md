# D'aMigo's — Integrations & Policy Rules

**Version:** 1.0

---

## 1. QR / barcode (stickers)

| Rule | Specification |
|------|----------------|
| URL | `https://d-amigos.in/s/{token}` |
| Token entropy | ≥ 128 bits, URL-safe |
| Batch validity | Default 10–15 days (`valid_from`, `valid_to`) |
| Mint | Platform admin only |
| Activate | Owner enters batch code in CRM |
| Logging | Every scan → `scan_events` |
| Packaging vs table | **Phase 1: packaging only** — no 60-minute table session |

---

## 2. Kapso + WhatsApp (Meta)

### 2.1 Channel split

| Profile | Purpose | Message class |
|---------|---------|---------------|
| HERO / Utility | OTP fallback, order confirm, status | Utility / service |
| MARKETING | Campaigns | Marketing template only |

### 2.2 Product-enforced rules (code)

1. `marketing_opt_in = true` required to enqueue campaign recipient
2. **Cap:** max 1 marketing template per `(customer_id, restaurant_id)` per rolling 7 days
3. Wallet balance ≥ cost before send; atomic debit on accept
4. Template name must exist in approved catalog (sync nightly from Meta/Kapso)
5. Log all sends to `message_delivery_log`; handle webhooks: sent, delivered, read, failed
6. Pause restaurant on high block/report rate (manual threshold Phase 1)

### 2.3 Meta compliance checklist

- Business verification complete before pilot scale
- Opt-in evidence stored (who/when/version)
- Unsubscribe / opt-out path in CRM + honor on next send
- No prohibited content (gambling, adult, misleading aggregator claims)
- Template variables: no guest full phone in body — use `{first_name}` etc.

### 2.4 Kapso implementation notes

- Verify API for: send template, WABA id, phone number id, webhook registration
- Store Kapso message id on each log row for reconciliation
- Retry transient 5xx with exponential backoff; do not retry policy failures

---

## 3. Shiprocket

| Step | When | Action |
|------|------|--------|
| Serviceability | Checkout | Pincode/lat-lng check |
| Quote | Checkout | Rate + ETA estimate |
| Create shipment | After `PAID` + accepted | AWB |
| Track webhook | Runtime | Update order status |
| Display | Guest bill | Label "Shiprocket" + ₹5 platform markup line |

Failures: if quote fails, block checkout with user message.

---

## 4. Razorpay

| Use | Account |
|-----|---------|
| Guest food payment | Restaurant linked account (Route) |
| Platform fees | Split: convenience ₹2, delivery markup → platform |
| CRM wallet top-up | Platform account |

Webhooks: verify signature; idempotent handlers; reconcile nightly.

---

## 5. DeepSeek (menu extract)

- Input: PDF from S3
- Output: JSON rows + confidence
- Human publish gate in CRM
- Do not auto-fetch Google Images in P1

---

## 6. India regulatory (summary)

| Area | Action |
|------|--------|
| DPDP | Notice, consent versions, erasure API, DPO contact |
| FSSAI | Optional at signup; verify via `POST /v1/onboarding/fssai/verify` ([FSSAI-VERIFICATION.md](./FSSAI-VERIFICATION.md)); show on guest menu footer when verified |
| Promotions | Publish T&C for spin/scratch; fixed prize pool |
| Reference pricing | Owner attestation; no competitor trademarks |

---

## 7. Webhook ingress (single service)

| Provider | Path | Handler |
|----------|------|---------|
| Razorpay | `POST /webhooks/razorpay` | payments |
| Shiprocket | `POST /webhooks/shiprocket` | shipments |
| Kapso | `POST /webhooks/kapso` | message status |

All: raw body HMAC, DLQ on parse failure.
