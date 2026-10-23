# Kapso / Meta WhatsApp templates — Damigos catalog (approved)

**13 approved templates** on the connected D’aMigo’s number.  
**Send with the template `name`.** Kapso UUID and Meta template ID are **reference only** — never use them as `template.name`.

**Language:** `en_US` · **Parameters:** positional (`{{1}}`, `{{2}}`, …) — do **not** send `parameter_name`.

Source of truth in code: `@damigos/domain` → `kapso-templates.ts` (`DAMIGOS_WA_TEMPLATES`, `GROW_KEY_TO_TEMPLATE`).

---

## Connected number

| Field | Value |
|-------|--------|
| `whatsapp_config_id` (Kapso) | `4e26028f-5565-4fab-afcc-125539f56c75` |
| `phone_number_id` (Meta API) | `1365748713295932` |
| `business_account_id` (WABA) | `2100142510693917` |

```http
POST https://api.kapso.ai/meta/whatsapp/v24.0/1365748713295932/messages
X-API-Key: <api_key>
Content-Type: application/json
```

Set env (guest-api + crm-api):

```env
KAPSO_MODE=live
KAPSO_API_KEY=...
# Single connected number today — use for Food and/or Spark:
KAPSO_FOOD_PHONE_NUMBER_ID=1365748713295932
KAPSO_SPARK_PHONE_NUMBER_ID=1365748713295932
KAPSO_WABA_ID=2100142510693917
```

---

## API send shape

```json
{
  "messaging_product": "whatsapp",
  "to": "<recipient_phone_with_country_code>",
  "type": "template",
  "template": {
    "name": "damigos_order_confirmed",
    "language": { "code": "en_US" },
    "components": [
      {
        "type": "body",
        "parameters": [
          { "type": "text", "text": "Spice Kitchen" },
          { "type": "text", "text": "A1B2" },
          { "type": "text", "text": "499" }
        ]
      }
    ]
  }
}
```

For **`damigos_grow_poster`**, include a **header** image (fresh media `id` or public `link` — not the template-review handle):

```json
{
  "type": "header",
  "parameters": [{ "type": "image", "image": { "link": "https://…" } }]
}
```

CTA button URLs are fixed on the template; do not pass them as body params.

---

## Catalog (13)

| # | Send name | Kapso ID | Meta ID | Cat | Body params (order) | Button |
|---|-----------|----------|---------|-----|---------------------|--------|
| 1 | `damigos_order_track` | `143d458b-485f-4b5e-9089-d8bed87f0309` | `28882695058018351` | UTILITY | `{{1}}` status | Track Order → `/orders` |
| 2 | `damigos_order_out_for_delivery` | `2241829d-e847-4608-a3e0-d973c2e4ab54` | `1645434637032778` | UTILITY | `{{1}}` restaurant · `{{2}}` ETA/tracking | Track Order → `/orders` |
| 3 | `damigos_grow_winback` | `2a52898f-8323-4097-9da2-30f9ab2971f3` | `1104913529022319` | MARKETING | `{{1}}` restaurant · `{{2}}` offer | Order Again → `/` |
| 4 | `damigos_spark_reward_unlocked` | `3a4f156e-3289-4a76-8890-fd0970c3d947` | `1119397907213606` | MARKETING | _(none)_ | Claim Reward → `/` |
| 5 | `damigos_grow_weekend_special` | `43881fc8-e967-4c15-91ac-4cf82eef710a` | `1672253281185486` | MARKETING | `{{1}}` restaurant · `{{2}}` offer | Order Now → `/` |
| 6 | `damigos_grow_poster` | `4624a0e2-7da3-4fd7-8f25-d7a808d0a621` | `1500605038933766` | MARKETING | IMAGE header + `{{1}}` headline · `{{2}}` message | Order Now → `/` |
| 7 | `damigos_spark_opt_in` | `4ebb53e1-73e4-4635-ac2b-60ac160aa4b2` | `1437924231675420` | MARKETING | `{{1}}` restaurant | Play now → `/` |
| 8 | `damigos_spark_claim_nudge` | `757cddcf-ce09-49fd-a9ca-bdccd78271b3` | `1093422630253211` | MARKETING | `{{1}}` restaurant · `{{2}}` reward | View menu → `/` |
| 9 | `damigos_grow_paycheck` | `9748c53d-c8ed-4bf2-8863-fec77bf171b5` | `1141014738361136` | MARKETING | `{{1}}` restaurant · `{{2}}` offer | Order Now → `/` |
| 10 | `damigos_grow_new_menu` | `9d6b8d81-fe8f-4fdd-8ff0-aabbbc595e00` | `1159068236790471` | MARKETING | `{{1}}` restaurant · `{{2}}` menu copy | View Menu → `/` |
| 11 | `damigos_order_delivered` | `ad87674e-0b78-48e3-9a74-5326245df777` | `1651479839824854` | MARKETING | `{{1}}` restaurant | Order Again → `/hub` |
| 12 | `damigos_order_confirmed` | `ae0b08d6-81db-429e-be54-c4cdd08d17e0` | `2003170180379599` | UTILITY | `{{1}}` restaurant · `{{2}}` order # · `{{3}}` total (no ₹) | Track Order → `/orders` |
| 13 | `damigos_open_hub` | `ce9471a1-7cc7-4dc6-9c5f-cc14edf73a29` | `1301590259714340` | MARKETING | _(none)_ | Order → `/hub` |

Guest web base for buttons: `https://damigos-guest-web.vercel.app`

---

## Code wiring

| Flow | Template name | Params sent |
|------|---------------|-------------|
| Paid order confirm | `damigos_order_confirmed` | kitchen, short id, total digits |
| Status / track update | `damigos_order_track` | status only |
| Out for delivery | `damigos_order_out_for_delivery` | kitchen, ETA/AWB |
| Delivered | `damigos_order_delivered` | kitchen |
| Spark opt-in (cold) | `damigos_spark_opt_in` | kitchen |
| Spark claim nudge | `damigos_spark_claim_nudge` | kitchen, reward |
| Grow weekend | `damigos_grow_weekend_special` | kitchen, offer |
| Grow new menu | `damigos_grow_new_menu` | kitchen, copy |
| Grow winback | `damigos_grow_winback` | kitchen, offer |
| Grow paycheck | `damigos_grow_paycheck` | kitchen, offer |
| Grow poster | `damigos_grow_poster` | headline, message + **header image** |
| Open hub / reward unlocked | `damigos_open_hub` / `damigos_spark_reward_unlocked` | none |

### CRM Grow `templateKey` → Meta name

| CRM key | Meta name |
|---------|-----------|
| `weekend_special` | `damigos_grow_weekend_special` |
| `new_menu_drop` | `damigos_grow_new_menu` |
| `winback_7d` | `damigos_grow_winback` |
| `poster_status_blast` | `damigos_grow_poster` |
| `grow_paycheck` / `paycheck` | `damigos_grow_paycheck` |

Poster sends need a public image URL (or media id). Until campaign rows store a poster URL, set:

```env
KAPSO_GROW_POSTER_IMAGE_LINK=https://…/poster.png
```

Without it, Grow falls back to free-form text for that recipient.

---

## WhatsApp in-app browser (IAB)

Meta controls this — no Kapso toggle. CTA URL buttons on **approved templates** are the path to IAB (when messaging-limit tier allows). Free-form HI/`cta_url` may still open an external browser.

---

## Env overrides (optional)

Defaults are the approved names above. Overrides only if Meta renames:

```env
KAPSO_FOOD_TEMPLATE_ORDER_CONFIRMED=damigos_order_confirmed
KAPSO_FOOD_TEMPLATE_TRACK_UPDATE=damigos_order_track
KAPSO_FOOD_TEMPLATE_OUT_FOR_DELIVERY=damigos_order_out_for_delivery
KAPSO_FOOD_TEMPLATE_DELIVERED=damigos_order_delivered
KAPSO_SPARK_TEMPLATE_OPT_IN=damigos_spark_opt_in
KAPSO_SPARK_TEMPLATE_CLAIM_NUDGE=damigos_spark_claim_nudge
KAPSO_GROW_POSTER_IMAGE_LINK=
```

---

## Wallet ↔ broadcast credits (CRM)

| Pack | Amount | ≈ Credits (@ ₹2.50/msg) |
|------|--------|-------------------------|
| Starter | ₹499 | ~199 |
| Standard | ₹999 | ~399 |
| Pro | ₹2499 | ~999 |

`WALLET_TOPUP_MODE=live` + Razorpay → CRM **Grow → Wallet**.
