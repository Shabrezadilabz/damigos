# Test Case Index (v2.0)

**Strategy:** [TEST-STRATEGY.md](./TEST-STRATEGY.md)  
**Plans:** [GUEST-TEST-PLAN.md](./GUEST-TEST-PLAN.md), [CRM-TEST-PLAN.md](./CRM-TEST-PLAN.md)  
**Catalogs:** [test-cases/GUEST-TC.md](./test-cases/GUEST-TC.md), [test-cases/CRM-TC.md](./test-cases/CRM-TC.md), [test-cases/INTEGRATION-TC.md](./test-cases/INTEGRATION-TC.md)

---

## Priority

| Priority | Meaning |
|----------|---------|
| P0 | Block release / phase gate |
| P1 | MVP pilot required |
| P2 | Post-pilot / density |

---

## Design feel (every UI PR)

| ID | Title | Phase | Pri |
|----|-------|-------|-----|
| TC-D-001 | SF Pro stack + tabular-nums on ₹ | P0+ | P0 |
| TC-D-002 | pointerdown scale(0.97) ≤100ms on primary CTAs | P0+ | P0 |
| TC-D-003 | Sparkle Win sheet spring + haptic path | P1 | P0 |
| TC-D-004 | Dish sheet rubber-band c=0.55 | P1 | P1 |
| TC-D-005 | Single glass header (no glass-on-glass) | P0+ | P1 |
| TC-D-006 | WA chrome lock + verified + refresh/close | P0+ | P0 |
| TC-D-007 | Zero Table 04 / Dine-in copy | P0+ | P0 |
| TC-D-008 | prefers-reduced-motion cross-fade | P1 | P1 |
| TC-D-009 | Kitchen 44px targets + countdown tabular | P1 | P0 |
| TC-D-010 | 60s feel gate 390×844 / 1024×768 | Gate | P0 |

---

## Guest suites

| Suite | Cases | Phase |
|-------|-------|-------|
| Scan & token | TC-G-001..004 | P0 |
| Spark opt-in | TC-G-027 | P1 |
| Auth & consent | TC-G-030..035 | P0 |
| Rewards | TC-G-020..026 | P1 |
| Menu & cart | TC-G-040..048 | P0–P1 |
| Checkout & pay | TC-G-050..061 | P1 |
| Offer scope & free delivery | TC-G-056..059, TC-G-068 | P1 |
| Cross-By | TC-G-062..067 | P1.5 |
| Track & countdown | TC-G-070..072 | P1 |
| Dual toggler | TC-G-073..074 | P1.5 |
| Orders home | TC-G-080..082 | P1 |
| Concurrent order | TC-G-083 | P1.5 |
| Hub & perks | TC-G-090..093 | P2 |
| Errors | TC-G-100..105 | P1 |

---

## CRM suites

| Suite | Cases | Phase |
|-------|-------|-------|
| Onboarding & GPS | TC-C-001..005 | P0–P1 |
| Dashboard | TC-C-010..015 | P1–P2 |
| Menu + prep category | TC-C-020..030 | P0–P1 |
| Grow | TC-C-040..054 | P1–P2 |
| Kitchen timer & penalty | TC-C-060..069 | P1 |
| Settings & admin | TC-C-070..084 | P0–P1 |

---

## Integration suites

| Suite | Cases | Phase |
|-------|-------|-------|
| Razorpay | TC-P-001..003, TC-P-012 (checkout_group) | P1 / P1.5 |
| Shiprocket | TC-P-004..007 | P1 |
| Cross-By logistics | TC-I-CB-001..003 | P1.5 |
| Kapso Spark / Food | TC-P-008..011, TC-I-WA-001..012 | P1–P2 |
| Waiting penalty | TC-I-PEN-001..003 | P1 |

---

## New case stubs (to flesh in catalogs before P1 build)

### TC-G-027 — Spark opt-in unlocks game
Given scan token; when guest completes Spark "Yes, Unlock My Reward"; then webview opens play with marketing_opt_in=true.

### TC-G-062 — Add 2nd kitchen to cart
Given cart with R1; when guest adds R2 via Cross-By; then cart has 2 legs; 3rd rejected.

### TC-G-066 — Rider mode by distance
Given R1–R2 ≤1.0 km → SINGLE fee; >1.0 km → SPLIT 2× fee.

### TC-G-067 — checkout_group pay
One UPI capture creates 2 PAID orders with same checkout_group_id.

### TC-G-072 — Prep countdown
After Accept, track shows 10:00 or 15:00; +5m updates deadline once.

### TC-G-073 — Dual toggler
Group with 2 legs; segmented control switches timelines without reload flash.

### TC-G-083 — Concurrent order
With Active order, guest can complete new checkout.

### TC-C-005 — GPS required
Ordering_enabled blocked without lat/lng.

### TC-C-030 — Prep category publish
Publish fails if any live item missing prep_category.

### TC-C-066 — Accept starts timer + rider
Accept sets committed_prep_minutes and creates Shiprocket shipment.

### TC-C-069 — Waiting penalty debit
Rider at pickup + overtime past grace → WAITING_PENALTY_DEBIT ≤ ₹60.

### TC-I-WA-001 — Spark opt-in webhook
Kapso Spark interactive reply creates opt-in record + returns play URL.

### TC-I-WA-010 — Food HI returning
Returning phone gets 3-card carousel + 3 quick replies.

### TC-I-CB-001 — ≤1 km single rider
Staging: two kitchens 0.7 km → one multi-pickup AWB path.

### TC-I-PEN-001 — Penalty finalize
Simulated clock: 24m handover on 15+5 with rider wait → expected paise.
