# D'aMigo's Guest App — Product Requirements Document

| Field | Value |
|-------|--------|
| **Document ID** | PRD-GUEST-1.0 (+ v2.0 addendum) |
| **App** | `guest-web` (mobile webview; WhatsApp in-app browser primary) |
| **API** | `guest-api` (REST + optional WebSocket for order status) |
| **Version** | 1.0 base · **2.0 planning overlay** |
| **Date** | 2026-10-15 · v2 addendum 2026-10-18 |
| **Companion** | [CRM-APP-PRD.md](./CRM-APP-PRD.md), [SYSTEM-ARCHITECTURE.md](../architecture/SYSTEM-ARCHITECTURE.md) |
| **v2.0 LOCKED overlay** | **[GUEST-APP-PRD-V2-ADDENDUM.md](./GUEST-APP-PRD-V2-ADDENDUM.md)** — supersedes fonts, G-R01, and adds Spark/Cross-By/timers/HI |

---

## 1. Executive summary

The guest app is a **restaurant-scoped ordering webview** opened from **packaging QR/barcode** (Phase 1) or optionally from **Discover hub** (Phase 1 minimal / Phase 2 expanded). One **global guest identity** (phone); **per-restaurant** credits, offers, and cart. Primary journey: **Scan → rewards (optional) → menu → checkout (UPI) → track → orders home**.

**North star (guest-side):** Completed platform orders with repeat within 30 days.

---

## 2. Goals & non-goals

### 2.1 Goals

- Frictionless order on phone without installing an app
- Restaurant branding (logo, name, credits) — no aggregator logos
- Compliant consent (DPDP); marketing separate from game
- Transparent fees (convenience ₹2, delivery Shiprocket + ₹5 display)

### 2.2 Non-goals (Phase 1)

- Native iOS/Android apps
- Full Swiggy-like marketplace (Hero is curated list only)
- Dine-in table ordering as primary model (design artifacts mentioning "Table 04" are **deprecated** for Phase 1 — see gaps doc)
- Cash on delivery (recommend UPI-only pilot)
- Ads on reward / spin screens

---

## 3. Users & personas

| Persona | Description | Needs |
|---------|-------------|--------|
| **Delivery guest** | Ordered via aggregator; scans bag sticker | Rewards, reorder direct, track |
| **Repeat guest** | Returns via orders home or new scan | Fast menu, saved address |
| **Hub guest** | Opens `/hub` without scan | Pick kitchen, no false "table" UX |

---

## 4. Design system

> **v2.0 override:** See [APPLE-DESIGN-SYSTEM.md](../design/APPLE-DESIGN-SYSTEM.md). SF Pro Display/Text/Mono replaces Plus Jakarta Sans / Inter. 17 Apple Design principles are mandatory.

- **Reference:** Stitch export `crimson_guest_experience/DESIGN.md` + folders `g1`–`g18` ([STITCH-SCREEN-MAP.md](../design/STITCH-SCREEN-MAP.md))
- **Viewport:** 390×844 baseline; safe areas `env(safe-area-inset-*)`
- **Fonts (v2):** `-apple-system, BlinkMacSystemFont, "SF Pro Display"|"SF Pro Text"|"SF Mono"` + `tabular-nums` on ₹/timers
- **Primary CTA:** `#E23744` / `#B7122A` crimson; game zone CRED charcoal `#161616` + gold `#F3BF51`
- **WhatsApp chrome:** `lock` + `d-amigos.in` + `verified` + refresh/close — do not duplicate OS back when WA provides close

---

## 5. Information architecture — six shells

| Shell | Route | Stitch reference |
|-------|--------|------------------|
| **G-S1 Restaurant** | `/s/:token`, `/r/:restaurantId` | `g1_*`, `g3_scratch`, `g4_win` |
| **G-S2 Menu** | `/r/:id/menu` | `g2`, `g8` |
| **G-S3 Checkout** | `/r/:id/checkout` | `g9`, `g10`, `g11`, `g12`, `g3_cart`, `g6_location` |
| **G-S4 Track** | `/orders/:orderId` | `g13`, `g4_order_tracking` |
| **G-S5 Orders** | `/orders` | `g5`, `g16` |
| **G-S6 Discover** | `/hub` | `g17`, `g6_hero`, `g18` |

**Modals (not top-level routes):** profile/consent (`g5_one_time_guest_profile`), switch kitchen (`g18`), item sheet (part of G-S2).

**Error routes:** `/s/:token/error` or inline states — `g14` expired, `g15` kitchen paused.

---

## 6. Global rules

| ID | Rule | Implementation |
|----|------|----------------|
| G-R01 | ~~One cart = one `restaurant_id`~~ | **Superseded by G-R01b (v2):** max **2** restaurants (Cross-By); see addendum |
| G-R02 | Back from menu → `/orders` | Not to spin screen |
| G-R03 | Credits label | "Credits with {Restaurant}" — not "WhatsApp wallet" |
| G-R04 | Game optional | "View menu without offer" always available Phase 1 |
| G-R05 | No ads on G-S1 reward zone | Layout guard |
| G-R06 | Est. elsewhere price | Owner-entered reference only; no scraping |
| G-R07 | Session auth | JWT after OTP; httpOnly cookie or secure storage |
| G-R08 | Idempotent pay | `Idempotency-Key` on order create |

---

## 7. Feature specification

### 7.1 Scan & token resolution (G-S1)

#### G-01.01 Resolve scan token

| Item | Detail |
|------|--------|
| **Trigger** | GET `/s/:token` load |
| **API** | `GET /v1/scan/resolve?token=` |
| **Success** | 302 → `/r/{restaurantId}?ctx={scanId}` |
| **Acceptance** | Valid token returns restaurant meta, batch id, scan logged |
| **Errors** | Unknown → G-ERR-01; Expired batch → G-ERR-02; Revoked → G-ERR-03; Consumed (if single-use) → G-ERR-04 |
| **Phase** | P0 |
| **Tests** | TC-G-001..004 |

**Backend:** `sticker_tokens` joined to `sticker_batches`; check `valid_from`, `valid_to`, `status`.

#### G-01.02 Restaurant header

| Item | Detail |
|------|--------|
| **UI** | Logo, name, credits pill, profile avatar |
| **API** | `GET /v1/me/restaurants/:id/profile` |
| **Acceptance** | Credits match ledger; 401 → prompt OTP |
| **Phase** | P0 |
| **Tests** | TC-G-010 |

#### G-01.03 Packaging perks banner

| Item | Detail |
|------|--------|
| **Copy** | "You scanned our packaging — rewards inside." |
| **Acceptance** | No table number in Phase 1 packaging flow |
| **Phase** | P1 |
| **Tests** | TC-G-011 |

#### G-01.04 Offer carousel

| Item | Detail |
|------|--------|
| **API** | `GET /v1/restaurants/:id/offers/active` |
| **Acceptance** | Horizontal scroll; T&C link per offer |
| **Phase** | P1 |
| **Tests** | TC-G-012 |

#### G-01.05 Spin wheel

| Item | Detail |
|------|--------|
| **API** | `POST /v1/rewards/spin` body `{ restaurantId, scanId }` |
| **Rules** | Server-side outcome; max spins configurable per restaurant/day |
| **Acceptance** | Outcome logged; cannot spin after limit — show message |
| **Compliance** | Display promo T&C; not gambling copy |
| **Phase** | P1 |
| **Tests** | TC-G-020..022 |

#### G-01.06 Scratch card

| Item | Detail |
|------|--------|
| **API** | Same engine as spin, mode `scratch` |
| **Acceptance** | Tab switch spin/scratch; one reward path per session policy |
| **Phase** | P1 |
| **Tests** | TC-G-023 |

#### G-01.07 Win celebration & avail

| Item | Detail |
|------|--------|
| **UI** | Bottom sheet: prize, expiry, Avail CTA |
| **API** | `POST /v1/rewards/claim` |
| **Acceptance** | Claim idempotent; binds offer to guest+restaurant |
| **Phase** | P1 |
| **Tests** | TC-G-024..025 |

#### G-01.08 Skip to menu

| Item | Detail |
|------|--------|
| **Nav** | → `/r/:id/menu` without claim |
| **Phase** | P1 |
| **Tests** | TC-G-026 |

---

### 7.2 Profile & consent (modal)

#### G-02.01 One-time profile

| Item | Detail |
|------|--------|
| **Trigger** | First claim or first checkout |
| **Fields** | Name, phone (+91 OTP verify) |
| **API** | `POST /v1/me/profile`, `POST /v1/auth/otp/request`, `POST /v1/auth/otp/verify` |
| **Acceptance** | Phone verified before pay |
| **Phase** | P0 |
| **Tests** | TC-G-030..033 |

#### G-02.02 Consent toggles

| Item | Detail |
|------|--------|
| **Required** | Transactional (order updates) |
| **Optional separate** | Marketing WhatsApp; game/participation acknowledgement |
| **API** | `POST /v1/me/consents` with version ids |
| **Acceptance** | Stored with timestamp; marketing campaigns skip if false |
| **Phase** | P0 |
| **Tests** | TC-G-034..035 |

---

### 7.3 Menu (G-S2)

#### G-03.01 Category navigation

| API | `GET /v1/restaurants/:id/menu?version=published` |
| **Acceptance** | Sticky chips; empty category hidden |
| **Phase** | P0 |
| **Tests** | TC-G-040 |

#### G-03.02 Menu list

| Item | Detail |
|------|--------|
| **Acceptance** | Veg/non-veg icons; out-of-stock greyed |
| **Phase** | P0 |
| **Tests** | TC-G-041 |

#### G-03.03 Search

| API | Client filter or `?q=` |
| **Phase** | P1 |
| **Tests** | TC-G-042 |

#### G-03.04 Item bottom sheet

| Item | Detail |
|------|--------|
| **Fields** | Modifiers, qty, add |
| **API** | `POST /v1/cart/items` |
| **Acceptance** | Price updates with tabular nums |
| **Phase** | P0 |
| **Tests** | TC-G-043..044 |

#### G-03.05 Reference price chip

| Item | Detail |
|------|--------|
| **Source** | `menu_items.reference_price` optional |
| **Label** | "Est. reference ₹X" — no brand names |
| **Phase** | P2 |
| **Tests** | TC-G-045 |

#### G-03.06 Sticky cart bar

| API | `GET /v1/cart` |
| **Acceptance** | Shows count and subtotal; tap → checkout |
| **Phase** | P0 |
| **Tests** | TC-G-046 |

#### G-03.07 Kitchen paused (read-only)

| Item | Detail |
|------|--------|
| **UI** | `g15` — browse menu, ordering disabled |
| **API** | `restaurant.ordering_enabled=false` |
| **Acceptance** | Banner with resume time if set |
| **Phase** | P1 |
| **Tests** | TC-G-047 |

#### G-03.08 Back navigation

| Item | Detail |
|------|--------|
| **Rule** | Header back → `/orders` |
| **Phase** | P1 |
| **Tests** | TC-G-048 |

---

### 7.4 Checkout (G-S3)

#### G-04.01 Cart review

| API | `GET /v1/cart` |
| **Acceptance** | Apply sticker/claimed offer lines visible |
| **Phase** | P0 |
| **Tests** | TC-G-050 |

#### G-04.02 Delivery address

| Item | Detail |
|------|--------|
| **UI** | Map pin, address form, serviceability |
| **API** | `POST /v1/me/addresses`, `GET /v1/delivery/serviceability` |
| **Phase** | P1 |
| **Tests** | TC-G-051..053 |

#### G-04.03 Shiprocket quote

| Item | Detail |
|------|--------|
| **API** | `POST /v1/delivery/quote` → `{ carrier, shiprocket_rate, platform_markup: 5 }` |
| **Display** | "Delivery (Shiprocket + ₹5)" |
| **Acceptance** | Block checkout if not serviceable |
| **Phase** | P1 |
| **Tests** | TC-G-054..055 |

#### G-04.04 Bill summary

| Lines | Subtotal, discount, delivery, convenience ₹2, taxes per policy, total |
| **Phase** | P1 |
| **Tests** | TC-G-056 |

#### G-04.05 Create order + payment

| API | `POST /v1/orders` → Razorpay order/payment link |
| **Acceptance** | Idempotent; state `PAYMENT_PENDING` until webhook |
| **Phase** | P1 |
| **Tests** | TC-G-057..059 |

#### G-04.06 Payment success

| UI | `g12` — order id, track CTA |
| **Webhook** | `payment.captured` → `PAID` |
| **Side effect** | Kapso utility message if transactional opt-in |
| **Phase** | P1 |
| **Tests** | TC-G-060 |

#### G-04.07 Payment failed

| UI | `g11` — retry |
| **Phase** | P1 |
| **Tests** | TC-G-061 |

---

### 7.5 Track (G-S4)

#### G-05.01 Order timeline

| API | `GET /v1/orders/:id` + poll or WS |
| **States** | Placed → Accepted → Preparing → Dispatched → Delivered |
| **Phase** | P1 |
| **Tests** | TC-G-070 |

#### G-05.02 Map / rider

| Source | Shiprocket webhook fields when available |
| **Phase** | P2 |
| **Tests** | TC-G-071 |

#### G-05.03 Help

| Action | Deep link WhatsApp utility thread (restaurant) |
| **Phase** | P2 |
| **Tests** | TC-G-072 |

---

### 7.6 Orders home (G-S5)

#### G-06.01 Active / past tabs

| API | `GET /v1/me/orders?status=active|past` |
| **Acceptance** | Multi-restaurant list |
| **Phase** | P1 |
| **Tests** | TC-G-080 |

#### G-06.02 Track / reorder

| Reorder | Navigate to `/r/:id/menu` |
| **Phase** | P1 |
| **Tests** | TC-G-081 |

#### G-06.03 Profile & consents management

| API | `GET/PATCH /v1/me/consents` |
| **Phase** | P2 |
| **Tests** | TC-G-082 |

---

### 7.7 Discover hub (G-S6)

#### G-07.01 Kitchen list (pilot)

| API | `GET /v1/hub/restaurants?city=bangalore` |
| **Acceptance** | Curated; no fake wait-times Phase 1 |
| **Phase** | P2 |
| **Tests** | TC-G-090 |

#### G-07.02 Search

| Phase | P2 |
| **Tests** | TC-G-091 |

#### G-07.03 Switch kitchen modal

| Rule | Confirm clears cart |
| **Phase** | P2 |
| **Tests** | TC-G-092 |

#### G-07.04 Hub entry without spin

| Rule | No game on hub unless policy changes |
| **Phase** | P2 |
| **Tests** | TC-G-093 |

---

### 7.8 Error & edge states

| ID | Screen | Copy / behavior |
|----|--------|-----------------|
| G-ERR-01 | Invalid QR | Support contact |
| G-ERR-02 | Expired sticker batch | Explain 10–15 day batch policy; hub CTA |
| G-ERR-03 | Revoked | Admin revoked |
| G-ERR-04 | Consumed token | If single-use policy enabled |
| G-ERR-05 | Restaurant inactive | Read-only or block |

---

## 8. Guest API surface (summary)

See [API-CONTRACTS-OVERVIEW.md](../architecture/API-CONTRACTS-OVERVIEW.md) for full list.

| Domain | Endpoints |
|--------|-----------|
| Auth | `/v1/auth/otp/*`, `/v1/me` |
| Scan | `/v1/scan/resolve` |
| Catalog | `/v1/restaurants/:id/menu`, `/offers` |
| Cart | `/v1/cart` |
| Orders | `/v1/orders`, `/v1/me/orders` |
| Delivery | `/v1/delivery/quote`, `/serviceability` |
| Rewards | `/v1/rewards/spin`, `/claim` |

---

## 9. Non-functional requirements

| NFR | Target |
|-----|--------|
| TTI on 4G | < 3s first contentful paint on menu |
| Accessibility | Tap targets ≥ 44px; contrast AA |
| Security | HTTPS only; CSRF on cookie auth; rate limit OTP |
| Privacy | Minimal PII; retention policy in privacy notice |
| Analytics | Events: scan, spin, menu_view, add_cart, pay_success |

---

## 10. Phase mapping (guest)

| Phase | Features |
|-------|----------|
| **P0** | G-01.01, G-02.*, G-03.01-04,06, G-04.01 |
| **P1** | Full scan/rewards, checkout, pay, track, orders home |
| **P2** | Hub, reference price, map, profile manage |
| **P3** | Per-order QR, advanced personalization |

---

## 11. Open decisions (guest)

See [DECISION-LOG.md](../tracking/DECISION-LOG.md). Critical: single-use vs multi-scan token; game mandatory or not.

---

## Appendix A — Event analytics schema

| Event | Properties |
|-------|------------|
| `scan_resolved` | restaurant_id, batch_id, token_id |
| `reward_spin` | outcome_id |
| `order_paid` | order_id, amount, restaurant_id |

---

*End of Guest PRD v1.0*
