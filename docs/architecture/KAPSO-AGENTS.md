# Kapso dual agents — Spark + D'aMigo Food

**Status:** wired (mock default)  
**Related:** [INTEGRATIONS-V2.md](./INTEGRATIONS-V2.md) §1

## Agents

| Agent | Env phone id | Role |
|-------|--------------|------|
| **Spark by D'aMigo** | `KAPSO_SPARK_PHONE_NUMBER_ID` (fallback `KAPSO_PHONE_NUMBER_ID`) | Packaging opt-in, reward unlock buttons, Grow marketing |
| **D'aMigo Food** | `KAPSO_FOOD_PHONE_NUMBER_ID` (fallback `KAPSO_PHONE_NUMBER_ID`) | Order confirmed, HI smart reply, track links |

API: `POST https://api.kapso.ai/meta/whatsapp/v24.0/{phone_number_id}/messages` with header `X-API-Key`.

## Modes

| `KAPSO_MODE` | Behaviour |
|--------------|-----------|
| `mock` (default) | No network; console log + fake message ids |
| `live` | Real Kapso Meta Proxy calls |
| `off` | All sends refused |

## Guest API

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/v1/wa/status` | Mode + which phone ids are configured (no secrets) |
| POST | `/v1/wa/spark/opt-in` | Store `phone_e164` + marketing consent; return play URL + JWT |
| POST | `/v1/wa/spark/invite` | Send Spark interactive opt-in to phone |
| GET/POST | `/v1/wa/webhooks/kapso` | Meta verify + inbound HI / button replies |

Webhook URL (prod): `{GUEST_API_URL}/v1/wa/webhooks/kapso`  
Verify token: `KAPSO_WEBHOOK_VERIFY_TOKEN` (default `damigos-kapso-verify`).

## Flows

1. **Scan → Spark bridge** — `GET /v1/scan/resolve` redirects to `/wa/spark?restaurantId=&scan=` (DEC-010). Creates `spark_play_sessions` row.
2. **Opt-in Yes** — bridge `POST /wa/spark/opt-in` + `invite`; or WA button `unlock_reward` → marketing consent + **play URL with scan** (not `/hub`).
3. **Play webview** — `/r/{id}?scan=` spinner/scratch → Sparkle Win confetti → **Redeem & Place Order** → `/r/{id}/menu`.
4. **PAID order** — `captureOrderPayment` sends Food utility confirm + track if `phone_e164`.
5. **Claim without order** — scheduler nudges on Spark (`SPARK_CLAIM_NUDGE_*`); Food still only bills after pay.
6. **HI Food** — unchanged (`sendFoodHiNew` / `sendFoodHiReturning`).
7. **Grow campaign** — CRM Spark marketing; skips recipients without phone.

## Templates catalog

Full Meta template list (Food utility + Spark / Grow marketing): see **[KAPSO-TEMPLATES.md](./KAPSO-TEMPLATES.md)**.

Minimum this week: `damigos_order_confirmed` + `damigos_order_track`.

## Dual-number sandbox setup (Spark + Food)

Use **two** Kapso-connected WhatsApp numbers from day one.

### 1. Kapso dashboard

1. Create / open Kapso project → **Integrations → API keys** → copy `KAPSO_API_KEY`.
2. Connect **number A** → label it **Spark by D'aMigo** → copy its **Phone Number ID**.
3. Connect **number B** → label it **D'aMigo Food** → copy its **Phone Number ID**.
4. (Optional) Set display names in Meta WhatsApp Manager so guests see the right brand.

### 2. `.env` (guest-api + crm-api)

```env
KAPSO_MODE=live
KAPSO_API_KEY=...
KAPSO_SPARK_PHONE_NUMBER_ID=<phone_number_id_A>
KAPSO_FOOD_PHONE_NUMBER_ID=<phone_number_id_B>
KAPSO_USE_SANDBOX=false
KAPSO_WEBHOOK_VERIFY_TOKEN=damigos-kapso-verify
# Digits guests open via wa.me on Spark bridge (no +)
KAPSO_SPARK_WA_E164=91XXXXXXXXXX
# After Meta template approval:
# KAPSO_FOOD_TEMPLATE_ORDER_CONFIRMED=damigos_order_confirmed
# KAPSO_FOOD_TEMPLATE_TRACK_UPDATE=damigos_order_track
```

Agent-specific ids always win. `KAPSO_USE_SANDBOX=true` + `KAPSO_SANDBOX_PHONE_NUMBER_ID` is only a **fallback** when SPARK/FOOD are unset (legacy single number).

### 3. Webhook (both numbers → same guest URL)

Point Kapso/Meta webhook for **both** phone configs to:

`{GUEST_API_URL}/v1/wa/webhooks/kapso`

Verify token = `KAPSO_WEBHOOK_VERIFY_TOKEN`. Use a public URL (ngrok / staging).

### 4. Verify

```bash
curl http://localhost:4000/v1/wa/status
# expect mode live, configured.spark true, configured.food true
```

| Test | Expect |
|------|--------|
| Spark invite / opt-in button | Message from **Spark** number |
| Paid order | Confirm + track from **Food** number |
| Guest texts HI to Food | Food HI reply |
| Unlock reward button on Spark | Play URL with scan |

### 5. Local mock first (no Kapso)

1. `KAPSO_MODE=mock` → `GET /v1/wa/status`.
2. Scan QR → Spark bridge → play → redeem → menu.
3. Checkout → console `[kapso:mock] food …`.
4. Then flip to dual-number `live` as above.
