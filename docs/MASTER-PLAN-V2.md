# D'aMigo's — Master Planning Suite v2.0

**Status:** ✅ **FINALIZED** (2026-10-18) · 🚧 **BUILD STARTED** — Guest UI P0/P1 surfaces in progress; Kapso WA agents deferred  
**Date:** 2026-10-18  
**North star alignment:** Interactive canvas `damigos-e2e-master-blueprint` + Stitch `g*` / `crm_*` + Apple Design (SF Pro + 17 WWDC principles) + **Ownly.food WhatsApp UI pack (DEC-016)**

---

## 0. What this suite locks

| Artifact | Path | Role |
|----------|------|------|
| Apple Design System | [design/APPLE-DESIGN-SYSTEM.md](./design/APPLE-DESIGN-SYSTEM.md) | SF Pro stack, 17 principles, WA chrome, colors |
| Ownly WA UI Reference | [design/WA-OWNLY-GUEST-UI-REFERENCE.md](./design/WA-OWNLY-GUEST-UI-REFERENCE.md) | Hub/menu/checkout/profile patterns from WA images |
| Stitch Screen Map | [design/STITCH-SCREEN-MAP.md](./design/STITCH-SCREEN-MAP.md) | `g1`–`g18` / `crm_1`–`crm_6` → routes |
| Decision Log | [tracking/DECISION-LOG.md](./tracking/DECISION-LOG.md) | DEC-001…DEC-016 locked |
| Harness | [harness/DEVELOPMENT-HARNESS.md](./harness/DEVELOPMENT-HARNESS.md) | DoD, gates, PR template |
| Guest PRD v2 | [prd/GUEST-APP-PRD.md](./prd/GUEST-APP-PRD.md) | Guest product + acceptance |
| CRM PRD v2 | [prd/CRM-APP-PRD.md](./prd/CRM-APP-PRD.md) | CRM / kitchen / grow |
| Architecture | [architecture/*](./architecture/) | System, data, integrations, APIs, flows |
| Phases | [phases/PHASE-ROADMAP.md](./phases/PHASE-ROADMAP.md) + `PHASE-*-TASKS.md` | Execution order |
| Traceability | [tracking/FEATURE-TRACEABILITY.md](./tracking/FEATURE-TRACEABILITY.md) | Feature ↔ TC ↔ phase |
| Testing | [testing/*](./testing/) | Plans + TC catalogs |

**External design references (not in repo):**
- `SORRY-STEVE-apple-design-skill_261018_110337.pdf` — Apple fonts & motion
- `stitch_d_amigo_s_food_hospitality_platform/…` — Guest `g*` + CRM screens
- WhatsApp webview chrome pattern from Stitch headers (`lock` + `d-amigos.in` + `verified` + refresh/close)

---

## 1. Product truth (9-stage E2E loop)

```text
1. Packaging QR scan (?t=token)
2. Spark by D'aMigo WA Opt-In ("Yes, Unlock My Reward")
3. Fortune Wheel / Scratch → Dashing Sparkle Win Sheet
4. Menu + dish customizer (Apple sheet) + scoped reward pill
5. Cart + Cross-By 2nd kitchen (≤1 km / >1 km rider rule)
6. Consolidated Tax Invoice (scoped vs platform offers, 1st-order FREE delivery)
7. Razorpay UPI → checkout_group → 1–2 child orders
8. Kitchen Accept → auto rider + 10m/15m timer (+5m once) + waiting penalty
9. Guest Track toggler [1st|2nd] + D'aMigo Food WA bill/track + concurrent reorder
```

**Dual agents (DEC-005):**
- **Spark by D'aMigo** — marketing, opt-in, game launch, campaigns
- **D'aMigo Food** — utility HI lookup, bill, track, status

---

## 2. Planning phases (do these before any build)

| Plan Phase | Deliverable | Exit |
|------------|-------------|------|
| **PLAN-0** | Harness + Decisions + Apple Design + Stitch Map | This suite reviewed |
| **PLAN-1** | PRDs v2.0 (Guest + CRM) signed | Acceptance criteria frozen |
| **PLAN-2** | Architecture + Data Model + API + Flows | Schema + contracts frozen |
| **PLAN-3** | Phase Roadmap + Task IDs + Traceability | Feature IDs complete |
| **PLAN-4** | Test Strategy + TC catalogs + E2E scripts plan | P0/P1 TC IDs assigned |
| **PLAN-5** | Tracking (PROGRESS, BUG-LOG, FEATURE matrix) ready | Build may start at P0 residual / P1 |

> Application code changes for Cross-By, kitchen penalty, Apple fonts, etc. start **only after PLAN-5 sign-off**.

---

## 3. Build phases (after planning sign-off)

### Phase P0 — Foundation (mostly done; residual polish)

| Case ID | Plan case | Feature IDs | Tests |
|---------|-----------|-------------|-------|
| P0-C01 | Scan resolve + sticker activate | G-01.01, C-06.04/05 | TC-G-001..004, TC-C-075 |
| P0-C02 | OTP guest + staff | G-02.01, C-01.02 | TC-G-030..033, TC-C-002..003 |
| P0-C03 | Menu CRUD publish + guest menu/cart | C-03.*, G-03.* | TC-C-020..027, TC-G-040..046 |
| P0-C04 | Apple Design baseline tokens (fonts/CSS vars only — no full redesign) | P-DES-01 | TC-D-001 (visual checklist) |

**P0 exit residual:** Design tokens package stub; no Table 04 copy in guest shells.

### Phase P1 — MVP Pilot (core v2 product)

| Case ID | Plan case | Feature IDs | Tests |
|---------|-----------|-------------|-------|
| P1-C01 | Spark opt-in → auto game → Sparkle Win sheet | G-01.05..08, G-01.10 | TC-G-020..026, TC-I-WA-001 |
| P1-C02 | Scoped rewards + platform 1st-order free delivery | G-04.08, G-04.09, DEC-007/008 | TC-G-056..059 |
| P1-C03 | Razorpay live + webhook idempotency | G-04.05, P-Razorpay | TC-P-001..003 |
| P1-C04 | Shiprocket quote + AWB on Accept | G-04.03, P-Shiprocket | TC-P-004..007 |
| P1-C05 | Kitchen board + Accept + audio + SSE | C-05.02, C-05.03 | TC-C-061..065 |
| P1-C06 | Prep category READY_10M / COOKED_15M + timer + +5m | C-03.09, C-05.06, G-05.03 | TC-C-066, TC-G-072 |
| P1-C07 | Waiting penalty ledger | C-05.07, P-Penalty | TC-C-069, TC-I-PEN-001 |
| P1-C08 | Dual Kapso agents + 7-day cap + wallet | P-Kapso, C-04.05/06 | TC-P-008..011, TC-C-045..052 |
| P1-C09 | Track + Orders home (single order) | G-05.01, G-06.* | TC-G-070, TC-G-080..082 |
| P1-C10 | Restaurant GPS lat/lng at onboarding/settings | C-01.04, C-06.08 | TC-C-005, TC-C-076 |

### Phase P1.5 — Cross-By & Concurrent (pilot densification)

| Case ID | Plan case | Feature IDs | Tests |
|---------|-----------|-------------|-------|
| P1.5-C01 | Multi-restaurant cart (max 2) + Cross-By modal | G-R01b, G-04.10, G-07.04 | TC-G-062..065 |
| P1.5-C02 | Haversine ≤1 km → 1 rider; >1 km → 2 riders | G-04.11, P-Shiprocket-Multi | TC-G-066, TC-I-CB-001..003 |
| P1.5-C03 | `checkout_groups` single UPI → N child orders | G-04.12 | TC-G-067, TC-P-012 |
| P1.5-C04 | Dual-order track toggler [1st\|2nd] | G-05.04 | TC-G-073..074 |
| P1.5-C05 | Concurrent ordering (new order while active) | G-06.03 | TC-G-083 |

### Phase P2 — Hub, Conversational Commerce, Analytics

| Case ID | Plan case | Feature IDs | Tests |
|---------|-----------|-------------|-------|
| P2-C01 | Hub marketplace + Your Direct Perks rail | G-07.01..03 | TC-G-090..093 |
| P2-C02 | D'aMigo Food smart HI lookup carousel | G-08.01 | TC-I-WA-010..012 |
| P2-C03 | Dashboard analytics + payout/penalty summary | C-02.04, C-02.05 | TC-C-013..015 |
| P2-C04 | AI poster + menu import harden | C-04.07, C-03.03 | TC-C-022..025, TC-C-054 |
| P2-C05 | Kitchen WS primary + poll fallback | C-05.02b | TC-C-064 |

### Phase P3 — Scale

| Case ID | Plan case | Feature IDs | Tests |
|---------|-----------|-------------|-------|
| P3-C01 | Multi-city playbook | Ops | — |
| P3-C02 | Per-order packaging QR optional | G-01.09 | TC-G-005 |
| P3-C03 | Dedicated WABA scale ops | P-Kapso | — |

---

## 4. Design alignment checklist (every Guest/CRM UI PR)

- [ ] Fonts: SF Pro Display/Text/Mono — **not** Plus Jakarta / Inter
- [ ] `tabular-nums` on ₹ and timers
- [ ] `pointerdown` → `scale(0.97)` ≤100ms
- [ ] Springs (`damping` 0.8–1.0); sheets rubber-band `c=0.55`
- [ ] Single glass layer `blur(20px) saturate(180%)`
- [ ] WA chrome: lock + d-amigos.in + verified + refresh/close
- [ ] Zero "Table 04" / "Dine-in" in packaging flows
- [ ] Crimson `#B7122A` / `#E23744` + Gold `#D4A338` / `#F3BF51` + Charcoal `#161616` game zone
- [ ] 60s feel gate on 390×844 (guest) / 1024×768 (kitchen)

---

## 5. Schema additions (plan freeze — implement in P1 / P1.5 migrations)

| Table / Column | Purpose | Phase |
|----------------|---------|-------|
| `restaurants.lat`, `restaurants.lng` | Cross-By Haversine + Shiprocket pickup | P1 |
| `menu_items.prep_category` (`READY_10M`\|`COOKED_15M`) | Kitchen SLA | P1 |
| `menu_items.prep_minutes` | Override minutes | P1 |
| `offers.scope` (`RESTAURANT_SCOPED`\|`PLATFORM_WIDE`) | Offer scoping | P1 |
| `checkout_groups` | Multi-leg checkout parent | P1.5 |
| `orders.checkout_group_id`, `leg_index` | Child order link | P1.5 |
| `orders.committed_prep_minutes`, `extended_prep_minutes` | Timer | P1 |
| `orders.waiting_penalty_paise` | Penalty accrual | P1 |
| `orders.rider_arrived_at`, `ready_for_pickup_at` | Penalty clock | P1 |
| `restaurant_payout_ledger` | Settlement + `WAITING_PENALTY_DEBIT` | P1 |
| `customer_restaurant_profiles.marketing_opt_in_source` | Spark opt-in evidence | P1 |

---

## 6. API additions (plan freeze)

### Guest

| Method | Path | Feature |
|--------|------|---------|
| POST | `/v1/wa/spark/opt-in` | G-01.10 |
| GET | `/v1/cart/cross-by/nearby?restaurantId=&lat=&lng=` | G-04.10 |
| POST | `/v1/checkout-groups` | G-04.12 |
| GET | `/v1/checkout-groups/:id` | G-04.12 |
| GET | `/v1/orders/group/:groupId` | G-05.04 |
| GET | `/v1/hub/perks` | G-07.02 |

### CRM

| Method | Path | Feature |
|--------|------|---------|
| PATCH | `/v1/settings/location` `{lat,lng}` | C-06.08 |
| PATCH | `/v1/menu/items/:id` `{prepCategory}` | C-03.09 |
| POST | `/v1/orders/:id/accept` → starts timer + Shiprocket | C-05.06 |
| POST | `/v1/orders/:id/extend-prep` `{minutes:5}` once | C-05.06 |
| POST | `/v1/orders/:id/ready-for-pickup` | C-05.07 |
| GET | `/v1/payouts/ledger` | C-02.05 |

### Platform webhooks

| Source | Event | Handler |
|--------|-------|---------|
| Kapso Spark | inbound opt-in / campaign status | marketing worker |
| Kapso Food | inbound HI / utility status | HI lookup + order push |
| Shiprocket | rider_at_pickup, delivered | timer + penalty + guest track |
| Razorpay | payment.captured | split to checkout_group legs |

---

## 7. Test plan matrix (by phase)

| Suite | New / extended cases | Phase |
|-------|----------------------|-------|
| Design feel | TC-D-001..010 | Every UI PR |
| Guest Cross-By | TC-G-062..067 | P1.5 |
| Guest Track toggler | TC-G-073..074 | P1.5 |
| Guest Concurrent | TC-G-083 | P1.5 |
| CRM Prep timer | TC-C-066..069 | P1 |
| Integration WA | TC-I-WA-001..012 | P1–P2 |
| Integration Cross-By | TC-I-CB-001..003 | P1.5 |
| Integration Penalty | TC-I-PEN-001..003 | P1 |

Full IDs live in [testing/TEST-CASE-INDEX.md](./testing/TEST-CASE-INDEX.md).

---

## 8. Tracking operating rhythm

| Cadence | Artifact |
|---------|----------|
| Daily | `PROGRESS-DASHBOARD.md` — % features Done |
| Per PR | Feature IDs + TC IDs + Design checklist in PR body |
| Per bug | `BUG-LOG.md` Sev + feature link |
| Per gate | Phase checklist in `PHASE-N-TASKS.md` + harness §4 |

---

## 9. Design triad (FINAL)

```text
Apple SF Pro + 17 motion rules
        ×
Stitch g* (restaurant game, CRED charcoal win, WA chrome)
        ×
Ownly WA patterns (Hub rails, sticky dock, Best Value menu, honest bill, profile)
        =
D'aMigo Guest Webview (crimson/gold brand)
```

## 10. Sign-off

| Role | PLAN-0…5 | P1 build start |
|------|----------|----------------|
| Product | ☐ | ☐ |
| Design (Apple + Stitch + Ownly WA) | ☐ | ☐ |
| Engineering | ☐ | ☐ |
| QA | ☐ | ☐ |

**Planning is FINAL.** Build starts only after §10 sign-off: P0-C04 tokens → P1-C01 Spark loop → … Cross-By only in P1.5.
