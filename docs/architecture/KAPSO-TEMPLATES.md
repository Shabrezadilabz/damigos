# Kapso / Meta WhatsApp templates — Damigos catalog

Create these in **Meta WhatsApp Manager → Message templates** (or Kapso Templates), then paste approved names into env.  
Category + language must match Meta approval.

**Language:** `en` (or `en_IN` if you submit that).  
**Agents:** Spark = marketing / opt-in · Food = utility / orders.

Until approved, session messages (HI, buttons) still work as free-form text.

---

## WhatsApp in-app browser (IAB / webview) — Meta rules

Meta controls this. **There is no Kapso/Damigos toggle to “force webview.”**

| Rule | Detail |
|------|--------|
| **What opens in IAB** | Links on a **CTA URL button** (template marketing/utility, or free-form interactive `cta_url`) |
| **What does NOT** | Plain URLs in message **body** text → device browser / new tab |
| **Eligibility** | Phone number typically needs **≥ 1,000** business-initiated conversations / day quality limit tier |
| **Rollout** | Gradual, user/device based; not guaranteed on every phone yet |
| **Desktop WhatsApp Web** | Still opens a **browser tab** — no in-app webview |
| **Enablement** | Automatic when eligible — no Meta Business Manager “turn on webview” switch |
| **Disable** | Cannot turn off per URL; Meta only |

**Damigos code:** Food HI + hub/orders replies use free-form `sendKapsoCtaUrl`. That is correct UX, but Meta IAB often **does not** apply to free-form — users may still get Samsung Internet / Chrome.

**To get real in-app browser:** (1) messaging limit **≥ 1,000**/day on the WABA, (2) send links only via **approved marketing/utility templates** with a **Visit website** CTA (not HI free-form). Check: Meta Business Suite → WhatsApp Manager → Food number → messaging limits / quality.

---

## A. Guest / Food agent (utility)

| Meta name (suggested) | Category | Body variables | When Damigos sends | Env |
|-----------------------|----------|----------------|--------------------|-----|
| `damigos_order_confirmed` | UTILITY | `{{1}}` kitchen · `{{2}}` order short id · `{{3}}` total INR | After payment capture | `KAPSO_FOOD_TEMPLATE_ORDER_CONFIRMED` |
| `damigos_order_track` | UTILITY | `{{1}}` status · `{{2}}` track URL | Dispatch / status change | `KAPSO_FOOD_TEMPLATE_TRACK_UPDATE` |
| `damigos_order_out_for_delivery` | UTILITY | `{{1}}` kitchen · `{{2}}` ETA / AWB · `{{3}}` track URL | Rider out for delivery | (optional; wire later) |
| `damigos_order_delivered` | UTILITY | `{{1}}` kitchen · `{{2}}` hub URL | Delivered | (optional) |
| `damigos_payment_failed` | UTILITY | `{{1}}` retry URL | Payment failed | (optional) |

**Sample body — order confirmed**

```
Your order from {{1}} is confirmed (#{{2}}).
Total: ₹{{3}}
We'll WhatsApp tracking when the kitchen Accepts.
— D'aMigo Food
```

**Sample body — track update**

```
Order update: {{1}}
Track live: {{2}}
— D'aMigo Food
```

**HI / buttons** — no template (customer-initiated session).

---

## B. Guest / Spark agent (marketing + service)

| Meta name | Category | Variables | When | Env (future) |
|-----------|----------|-----------|------|----------------|
| `damigos_spark_opt_in` | MARKETING | `{{1}}` kitchen · `{{2}}` play URL | Cold invite if no session | `KAPSO_SPARK_TEMPLATE_OPT_IN` |
| `damigos_spark_claim_nudge` | MARKETING | `{{1}}` kitchen · `{{2}}` reward · `{{3}}` menu URL | Claimed, no order yet | `KAPSO_SPARK_TEMPLATE_CLAIM_NUDGE` |
| `damigos_spark_reward_unlocked` | UTILITY | `{{1}}` play URL | After unlock (if outside session) | optional |

**In-session** Unlock / View menu buttons already use free-form interactive replies — no template required.

---

## C. CRM restaurant Grow (Spark marketing)

Restaurant-level campaigns debit the **Grow wallet**. Map each Grow `templateKey` to a Meta template:

| Grow key (CRM UI) | Meta name | Category | Variables | Notes |
|-------------------|-----------|----------|-----------|-------|
| `weekend_special` | `damigos_grow_weekend_special` | MARKETING | `{{1}}` kitchen · `{{2}}` offer · `{{3}}` menu/hub URL | Weekend blast |
| `new_menu_drop` | `damigos_grow_new_menu` | MARKETING | `{{1}}` kitchen · `{{2}}` highlight · `{{3}}` menu URL | New dishes |
| `winback_7d` | `damigos_grow_winback` | MARKETING | `{{1}}` kitchen · `{{2}}` offer · `{{3}}` menu URL | 7-day idle |
| `poster_status_blast` | `damigos_grow_poster` | MARKETING | `{{1}}` kitchen · `{{2}}` headline · `{{3}}` link | Prefer **IMAGE** header + body; or text-only first |

**Sample — weekend special**

```
🎉 Weekend at {{1}}
{{2}}
Order here: {{3}}
Reply STOP to opt out.
— Spark by D'aMigo's
```

Today CRM still sends **plain text** via Kapso until these are approved and wired to `sendKapsoTemplate("spark", …)`. Wallet debit already uses ₹2.50 / message (`WHATSAPP_MSG_COST_PAISE`).

---

## D. Create order in Meta / Kapso

1. WhatsApp Manager → Message templates → Create  
2. Pick category (UTILITY vs MARKETING)  
3. Add body + `{{n}}` placeholders only (no emojis in some regions if rejected — retry)  
4. Submit → wait **Approved**  
5. Put exact name in Vercel + local `.env`:

```env
KAPSO_FOOD_TEMPLATE_ORDER_CONFIRMED=damigos_order_confirmed
KAPSO_FOOD_TEMPLATE_TRACK_UPDATE=damigos_order_track
```

6. Redeploy `damigos-guest-api`

**Minimum to go live this week:** `damigos_order_confirmed` + `damigos_order_track`.  
Grow Meta templates after wallet Razorpay top-up is proven.

---

## E. Wallet ↔ broadcast credits (CRM)

| Pack | Amount | ≈ Credits (@ ₹2.50/msg) |
|------|--------|-------------------------|
| Starter | ₹499 | ~199 |
| Standard | ₹999 | ~399 |
| Pro | ₹2499 | ~999 |

`WALLET_TOPUP_MODE=live` + Razorpay → CRM **Grow → Wallet** → pay → balance + credit count update.
