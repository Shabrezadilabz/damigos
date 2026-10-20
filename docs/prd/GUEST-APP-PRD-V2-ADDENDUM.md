# Guest App PRD — v2.0 Addendum

**Parent:** [GUEST-APP-PRD.md](./GUEST-APP-PRD.md) (v1.0 base)  
**Document ID:** PRD-GUEST-2.0-ADD  
**Date:** 2026-10-18  
**Status:** LOCKED for planning — supersedes conflicting v1 rules below

---

## A. Version header overrides

| Field | v2.0 Value |
|-------|------------|
| Version | 2.0 |
| Design | [APPLE-DESIGN-SYSTEM.md](../design/APPLE-DESIGN-SYSTEM.md) + [STITCH-SCREEN-MAP.md](../design/STITCH-SCREEN-MAP.md) |
| Decisions | DEC-009…DEC-015 in [DECISION-LOG.md](../tracking/DECISION-LOG.md) |
| Entry | Spark by D'aMigo opt-in → game → menu (primary); D'aMigo Food HI (secondary) |

---

## B. Design system override (replaces §4 fonts)

- **Fonts:** Apple SF Pro Display / Text / Rounded / Mono — **not** Plus Jakarta Sans / Inter
- **Motion:** 17 Apple Design principles (100ms press scale, springs, rubber-band sheets, single glass)
- **Chrome:** WhatsApp webview bar (`lock` + `d-amigos.in` + `verified` + refresh/close)
- **Copy:** Packaging Delivery / Direct D2C only — never "Table 04" / "Dine-in"
- **Palette:** Warm alabaster `#FCF9F8`, crimson `#B7122A`/`#E23744`, gold `#D4A338`/`#F3BF51`, CRED charcoal `#161616` game zone
- **Ownly WA patterns (DEC-016):** sticky dual-layer cart dock, Hub craving rails, Best Value + Other Apps ₹, Top Picks 2-col, Menu FAB, location permission sheet, transparent fee bill, profile cards — see [WA-OWNLY-GUEST-UI-REFERENCE.md](../design/WA-OWNLY-GUEST-UI-REFERENCE.md). **Never** adopt Ownly magenta as brand.

---

## C. Global rules — supersessions

| ID | v1 Rule | v2.0 Rule |
|----|---------|-----------|
| G-R01 | One cart = one restaurant | **Superseded by G-R01b** |
| **G-R01b** | — | Cart may contain **up to 2 restaurants** (Cross-By). Server rejects 3+. Same restaurant still one cart line group. |
| G-R09 | — | **NEW:** Restaurant-scoped rewards apply only to that restaurant's leg; platform offers apply to checkout_group. |
| G-R10 | — | **NEW:** First paid order on platform: delivery fee `₹0` to guest (D'aMigo subsidy). |
| G-R11 | — | **NEW:** Concurrent orders allowed; never block checkout because an active order exists. |
| G-R12 | — | **NEW:** All prices/timers use `tabular-nums`; all CTAs respond on `pointerdown`. |

---

## D. New / upgraded features

### G-01.10 Spark WhatsApp Opt-In Entry

| Item | Detail |
|------|--------|
| **Trigger** | Scan `/s/:token` → deep-link Spark WA → guest taps "Yes, Unlock My Reward" |
| **API** | Kapso Spark inbound + `POST /v1/wa/spark/opt-in` `{token, phone, consentVersion}` |
| **Success** | Open webview `/r/:id/play?scanId=` with marketing_opt_in=true |
| **Acceptance** | Opt-in evidence stored; game launches without second consent wall for marketing |
| **Phase** | P1 |
| **Tests** | TC-G-027, TC-I-WA-001 |

### G-01.07b Dashing Sparkle Win Bottom Sheet (upgrade of G-01.07)

| Item | Detail |
|------|--------|
| **UI** | CRED charcoal + gold sheet: title "Pouch Perk Unlocked", Min Order / Expiry / Instant grid, CTA "Redeem & Place Order" |
| **Motion** | Spring sheet + haptic on reveal; `prefers-reduced-motion` → cross-fade |
| **Acceptance** | Matches Stitch `g1` win sheet; CTA → menu with sticky claimed reward pill |
| **Phase** | P1 |
| **Tests** | TC-G-024..025, TC-D-003 |

### G-04.08 Offer scoping at checkout

| Item | Detail |
|------|--------|
| **Bill lines** | Restaurant Scoped Reward; D'aMigo Platform Offer (separate) |
| **Rule** | Scoped reward cannot reduce another restaurant's leg |
| **Phase** | P1 |
| **Tests** | TC-G-056, TC-G-068 |

### G-04.09 First-order FREE delivery

| Item | Detail |
|------|--------|
| **Rule** | If guest has zero prior `DELIVERED`/`CLOSED` platform orders → delivery charge `₹0`; subsidy attributed to platform |
| **UI** | Bill: "First-Order FREE Delivery · Sponsored by D'aMigo's" |
| **Phase** | P1 |
| **Tests** | TC-G-057 |

### G-04.10 Cross-By nearby kitchen strip

| Item | Detail |
|------|--------|
| **UI** | Cart `g9`: "Complete Your Meal / Cross-By Nearby Kitchen (≤ 1 km)" carousel |
| **API** | `GET /v1/cart/cross-by/nearby` |
| **Acceptance** | Shows kitchens within configurable radius; add opens switch/add modal (`g18` upgraded) |
| **Phase** | P1.5 |
| **Tests** | TC-G-062..063 |

### G-04.11 Rider assignment by distance

| Item | Detail |
|------|--------|
| **Rule** | If 2 restaurants: Haversine ≤ 1.0 km → 1 multi-pickup rider (1× delivery); > 1.0 km → 2 riders (2× delivery). First-order free applies per guest once, not per rider. |
| **Phase** | P1.5 |
| **Tests** | TC-G-066, TC-I-CB-001..003 |

### G-04.12 Checkout groups

| Item | Detail |
|------|--------|
| **API** | `POST /v1/checkout-groups` → one Razorpay intent → 1–2 `orders` with `leg_index` |
| **Acceptance** | Idempotent; bill matches consolidated tax invoice `g10` |
| **Phase** | P1.5 |
| **Tests** | TC-G-067, TC-P-012 |

### G-05.03 Live prep countdown

| Item | Detail |
|------|--------|
| **UI** | Track shows `10:00` or `15:00` after kitchen Accept; updates on +5m extension |
| **Source** | Order fields `committed_prep_minutes`, `extended_prep_minutes` |
| **Phase** | P1 |
| **Tests** | TC-G-072 |

### G-05.04 Dual-order / dual-leg toggler

| Item | Detail |
|------|--------|
| **UI** | Segmented control `[1st Order | 2nd Order]` on `g4`/`g13` |
| **API** | `GET /v1/orders/group/:groupId` or active orders list |
| **Acceptance** | Independent timeline + timer per leg/order; spring interruptible |
| **Phase** | P1.5 |
| **Tests** | TC-G-073..074 |

### G-06.03 Concurrent ordering

| Item | Detail |
|------|--------|
| **Rule** | Guest may start new cart while Active orders exist |
| **UI** | Orders home shows N active cards (`g5`/`g16`) |
| **Phase** | P1.5 |
| **Tests** | TC-G-083 |

### G-07.02 Your Direct Perks rail (Hub)

| Item | Detail |
|------|--------|
| **UI** | Horizontal poster cards: restaurant-scoped coins/offers + platform badges |
| **API** | `GET /v1/hub/perks` |
| **Phase** | P2 |
| **Tests** | TC-G-091 |

### G-08.01 D'aMigo Food Smart HI

| Item | Detail |
|------|--------|
| **Trigger** | Inbound "HI" / "Hi" to D'aMigo Food |
| **Returning** | 3-card carousel of last kitchens + 3 quick replies: Order Last Visited / Explore Hub / Active Orders & Perks |
| **New** | Hub welcome + First-Order FREE Delivery badge |
| **Phase** | P2 |
| **Tests** | TC-I-WA-010..012 |

---

## E. Bill composition (canonical `g10`)

1. Item Subtotal (per restaurant section if Cross-By)  
2. Restaurant Scoped Reward (−)  
3. D'aMigo Platform Offer (−)  
4. Delivery: Shiprocket quote + ₹5 **or** ₹0 First-Order FREE  
5. Convenience Fee ₹2 (per checkout_group once)  
6. GST 5% on taxable base  
7. Grand Total (tabular-nums)

---

## F. Acceptance gate (Guest v2)

No Guest feature Done without: PRD AC + Apple feel checklist + mapped TC PASS + zero dine-in copy.
