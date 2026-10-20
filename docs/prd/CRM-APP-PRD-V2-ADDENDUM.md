# CRM App PRD — v2.0 Addendum

**Parent:** [CRM-APP-PRD.md](./CRM-APP-PRD.md) (v1.0 base)  
**Document ID:** PRD-CRM-2.0-ADD  
**Date:** 2026-10-18  
**Status:** LOCKED for planning

---

## A. Version header overrides

| Field | v2.0 Value |
|-------|------------|
| Version | 2.0 |
| Design | Apple SF Pro + 17 principles on CRM web + kitchen tablet; Stitch `crm_1`–`crm_6` |
| Decisions | DEC-005, DEC-007, DEC-008, DEC-014, DEC-015 |
| Agents | Spark (campaigns) + D'aMigo Food (utility pushes mirrored from guest-api) |

---

## B. Design system override (§4)

- Desktop CRM: SF Pro; left sidebar "Restaurant CRM"
- Kitchen tablet (`768+`): large touch targets ≥44px; loud audio on PAID; countdown with `tabular-nums`
- Press response + springs on Accept / +5m / Ready buttons
- No NFC table pedestal UI until P3

---

## C. Global rules — additions

| ID | Rule |
|----|------|
| C-R08 | Kitchen GPS `lat`/`lng` **required** before ordering_enabled=true |
| C-R09 | Every menu item must have `prep_category` before Publish (default `COOKED_15M`) |
| C-R10 | Offers created in Grow default `scope=RESTAURANT_SCOPED`; only PLATFORM_ADMIN creates `PLATFORM_WIDE` |
| C-R11 | `Accept` always: (1) status ACCEPTED, (2) start prep countdown, (3) create Shiprocket shipment |
| C-R12 | `+5 min` extend allowed **once** per order and only while remaining > 3 minutes |
| C-R13 | Waiting penalty after rider_at_pickup + (committed+extended+3m grace) accrues ₹2/min cap ₹60 → `WAITING_PENALTY_DEBIT` |

---

## D. New / upgraded features

### C-01.04 Kitchen GPS at onboarding

| Item | Detail |
|------|--------|
| **Fields** | Map pin or lat/lng + address; accuracy ≤ 50m preferred |
| **API** | `POST /v1/onboarding/applications` includes `lat`,`lng`; `PATCH /v1/settings/location` |
| **Acceptance** | Cannot activate ordering without coordinates |
| **Phase** | P1 |
| **Tests** | TC-C-005 |

### C-03.09 Prep category on items

| Item | Detail |
|------|--------|
| **UI** | Item drawer: toggle Ready (10m) vs Fresh Cook (15m) |
| **API** | `prepCategory: READY_10M \| COOKED_15M` |
| **Acceptance** | Guest menu may show badge; Kitchen SLA uses max over cart items |
| **Phase** | P1 |
| **Tests** | TC-C-030 |

### C-04.01b Offer scope badge

| Item | Detail |
|------|--------|
| **UI** | Offers & game editor shows `RESTAURANT_SCOPED` badge |
| **Acceptance** | Weights validated; scoped offers only redeemable at this restaurant |
| **Phase** | P1 |
| **Tests** | TC-C-040..041 |

### C-05.06 Accept → Auto rider + prep timer

| Item | Detail |
|------|--------|
| **UI** | Kitchen card: Accept → countdown `10:00` or `15:00` (max prep across items); button `+5 min` |
| **API** | `POST /v1/orders/:id/accept`, `POST /v1/orders/:id/extend-prep` |
| **Side effects** | Shiprocket create; guest track + D'aMigo Food ETA push |
| **Audio** | Multimodal: chime + vibrate (tablet) on new PAID |
| **Phase** | P1 |
| **Tests** | TC-C-066..067 |

### C-05.07 Ready for pickup + waiting penalty

| Item | Detail |
|------|--------|
| **API** | `POST /v1/orders/:id/ready-for-pickup`; Shiprocket `rider_at_pickup` webhook starts grace clock |
| **Ledger** | Overtime → `restaurant_payout_ledger` debit; Dashboard shows penalty |
| **Phase** | P1 |
| **Tests** | TC-C-068..069, TC-I-PEN-001..003 |

### C-02.05 Payout & penalty summary

| Item | Detail |
|------|--------|
| **API** | `GET /v1/payouts/ledger?range=` |
| **UI** | Home/Analytics: gross sales, platform subsidy, waiting penalties |
| **Phase** | P2 |
| **Tests** | TC-C-015 |

### C-06.08 Settings location

| Item | Detail |
|------|--------|
| **UI** | Settings map pin editor |
| **Phase** | P1 |
| **Tests** | TC-C-076 |

---

## E. Kitchen state machine (v2)

```text
PAID → (audio) → ACCEPTED (+ timer start + rider dispatch)
     → PREPARING
     → READY_FOR_PICKUP (stops kitchen clock for penalty; rider may still be en route)
     → DISPATCHED → DELIVERED → CLOSED
```

Penalty clock: starts at `rider_arrived_at` if not yet `ready_for_pickup_at` after grace.

---

## F. Acceptance gate (CRM v2)

No CRM feature Done without: RBAC tests + Apple/kitchen feel gate + TC PASS + GPS/prep fields where required.
