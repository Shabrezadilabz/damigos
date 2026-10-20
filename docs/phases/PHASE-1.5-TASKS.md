# Phase 1.5 — Cross-By & Concurrent Ordering

**Status legend:** ⬜ Todo | 🔄 In progress | ✅ Done | ⏸ Deferred  
**Prerequisite:** P1 exit criteria met (or waived with product sign-off)  
**Plan cases:** P1.5-C01…C05 in [MASTER-PLAN-V2.md](../MASTER-PLAN-V2.md)

---

## Backend

| ID | Task | Owner | Status | Feature IDs |
|----|------|-------|--------|-------------|
| P15-T01 | Migration `checkout_groups` + `cart_legs` + order leg fields | BE | ✅ | ensure-schema + drizzle; cart_legs via 2 OPEN carts |
| P15-T02 | Cart API: max 2 restaurants; reject 3rd | BE | ✅ | G-R01b `CROSS_BY_LIMIT` |
| P15-T03 | `GET /v1/cart/cross-by/nearby` Haversine filter | BE | ✅ | G-04.10 |
| P15-T04 | Rider mode SINGLE vs SPLIT + fee calc | BE | ✅ | G-04.11 preview + mock-pay |
| P15-T05 | `POST /v1/checkout-groups` + Razorpay single intent → N orders | BE | ✅ | prepare / stub / razorpay / mock-pay |
| P15-T06 | Shiprocket multi-pickup vs dual create | BE | ✅ | SINGLE shared AWB; SPLIT dual AWB |
| P15-T07 | `GET /v1/orders/group/:groupId` for track toggler | BE | ✅ | G-05.04 |

## Guest web

| ID | Task | Owner | Status | Feature IDs |
|----|------|-------|--------|-------------|
| P15-T10 | Cart Cross-By strip + distance badge (Apple motion) | FE-G | ✅ | G-04.10, G-04.11 |
| P15-T11 | Switch kitchen modal → Add as 2nd / Replace | FE-G | ✅ | G-07.04 / g18 |
| P15-T12 | Bill `g10` multi-section + consolidated pay | FE-G | ✅ | mock + stub + Razorpay group |
| P15-T13 | Track segmented `[1st Order \| 2nd Order]` | FE-G | ✅ | active-orders toggler |
| P15-T14 | Concurrent order: allow new cart with active | FE-G | ✅ | hub + orders CTA; unpaid not in Active |
| P15-T15 | Orders home multi-active cards | FE-G | ✅ | Cross-By badges + group track links |

## QA

| ID | Task | Owner | Status |
|----|------|-------|--------|
| P15-T20 | TC-G-062..067, TC-G-073..074, TC-G-083 | QA | ✅ | e2e/guest/cross-by.spec.ts |
| P15-T21 | TC-I-CB-001..003 staging Shiprocket | QA | ⬜ |
| P15-T22 | Apple feel gate on cart/sheet/toggler | QA | ⬜ |

## Exit

- [ ] All P15-T* Done or Deferred documented
- [ ] No Sev-1/2 open
- [ ] Demo: 2 kitchens ≤1 km single rider + >1 km split recorded
