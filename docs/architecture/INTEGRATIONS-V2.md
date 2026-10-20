# Integrations & Policy Rules — v2.0 Addendum

**Parent:** [INTEGRATIONS.md](./INTEGRATIONS.md)  
**Version:** 2.0 | **Date:** 2026-10-18

---

## 1. Dual WhatsApp agents (Kapso) — supersedes §2.1 naming

**Implementation:** [KAPSO-AGENTS.md](./KAPSO-AGENTS.md) · guest `lib/kapso.ts` + `routes/wa.ts` · CRM `lib/kapso.ts` + campaign queue.

| Agent | Brand | Purpose | Templates |
|-------|-------|---------|-----------|
| **Spark by D'aMigo** | Marketing WABA | Packaging QR opt-in, game launch link, Grow campaigns | Marketing + opt-in CTAs |
| **D'aMigo Food** | Utility WABA | HI conversational entry, order confirm, bill summary, live track, ETA/+5m updates | Utility / service |

### 1.1 Spark opt-in loop

1. Guest scans sticker → `https://d-amigos.in/s/{token}` may redirect or show CTA into Spark chat  
2. Spark sends opt-in interactive message  
3. Guest taps **"Yes, Unlock My Reward"**  
4. Backend stores `marketing_opt_in` + source `SPARK_QR`  
5. Spark sends webview URL → Fortune Wheel / Scratch (`/r/:id/play`)

### 1.2 D'aMigo Food smart HI

| Guest type | Response |
|------------|----------|
| Returning (has orders or scans) | Interactive carousel: last 3 kitchens + quick replies: Order Last Visited / Explore Hub / Active Orders & Perks |
| New | Hub welcome card + First-Order FREE Delivery badge + Hub deep-link |

### 1.3 Cap rules (unchanged + clarify)

- Marketing cap: 1 msg / 7 days / `(customer_id, restaurant_id)` on **Spark** only  
- Utility messages on **D'aMigo Food** are not counted against marketing cap  
- Global spam guard: optional platform-level max marketing msgs / day (P2)

---

## 2. Shiprocket — multi-pickup & waiting

| Scenario | Action |
|----------|--------|
| 1 restaurant | Single pickup → drop |
| 2 restaurants, Haversine ≤ 1.0 km | Prefer single rider multi-pickup; 1× delivery fee to guest |
| 2 restaurants, > 1.0 km | Two shipments; 2× delivery fee (unless first-order free subsidy covers guest line) |
| On kitchen `Accept` | Create shipment(s); do not wait for READY |
| Webhook `rider_at_pickup` | Set `orders.rider_arrived_at`; start penalty grace if not ready |
| Webhook track updates | Mirror to guest track + optional Food WA |

Display: Shiprocket line + ₹5 platform markup per charged delivery leg (first-order free → ₹0 guest).

---

## 3. Razorpay — checkout groups

| Use | Rule |
|-----|------|
| Guest pay | One payment intent per `checkout_group` |
| Capture | Split settlement across leg restaurants + platform fees |
| Wallet top-up | Platform account (unchanged) |
| Idempotency | `Idempotency-Key` = checkout_group key |

---

## 4. Waiting penalty policy (code)

```text
grace = committed_prep_minutes + extended_prep_minutes + 3
if rider_arrived_at set AND ready_for_pickup_at null:
  overtime_min = max(0, floor((now - rider_arrived_at)/60) - grace)
  penalty_paise = min(overtime_min * 200, 6000)  # ₹2/min, cap ₹60
on finalize (DISPATCHED or READY+timeout job):
  write WAITING_PENALTY_DEBIT to restaurant_payout_ledger
```

---

## 5. Haversine rule (Cross-By)

```text
R = 6371 km
d = 2R asin(sqrt(hav(Δlat)+cos(lat1)cos(lat2)hav(Δlng)))
if d <= 1.0 → rider_mode = SINGLE else SPLIT
```

Coordinates from `restaurants.lat/lng` only (not guest address).
