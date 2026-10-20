# D'aMigo's — Phase Roadmap (v2.0)

**Companion:** [MASTER-PLAN-V2.md](../MASTER-PLAN-V2.md)  
**Rule:** Complete PLAN-0…PLAN-5 sign-off before starting new build scope.

---

## Planning track (docs only)

| Plan Phase | Goal | Exit |
|------------|------|------|
| PLAN-0 | Harness, Decisions DEC-009…015, Apple Design, Stitch Map | Docs reviewed |
| PLAN-1 | Guest + CRM PRD v2 addenda | AC frozen |
| PLAN-2 | Data Model v2, Integrations v2, API, Flows | Schema/contracts frozen |
| PLAN-3 | Roadmap + task IDs + Feature Traceability | Feature IDs complete |
| PLAN-4 | Test Strategy + TC catalogs | TC IDs assigned |
| PLAN-5 | Tracking rhythm ready | **Build may resume** |

---

## Build track

| Phase | Timeline (target) | Goal |
|-------|-------------------|------|
| **P0 Foundation** | Weeks 1–3 (mostly complete) | Skeleton E2E + residual Apple tokens |
| **P1 MVP Pilot** | Weeks 4–10 | Spark loop, payments, kitchen timers/penalty, dual WA, single-restaurant checkout |
| **P1.5 Cross-By** | Weeks 10–14 | 2-kitchen cart, 1 km rule, checkout_groups, dual toggler, concurrent orders |
| **P2 Density** | Weeks 15–22 | Hub + Direct Perks, Food HI, analytics/payout, AI harden, WS kitchen |
| **P3 Scale** | Weeks 23+ | Multi-city, optional per-order QR, WABA ops scale |

---

## Exit criteria

### PLAN exit

- [ ] MASTER-PLAN-V2 + addenda reviewed
- [ ] DEC-009…015 LOCKED
- [ ] Sign-off table in MASTER-PLAN-V2 §9 complete

### P0 exit

- [ ] Admin mint + owner activate
- [ ] Guest scan → menu → cart
- [ ] CRM login + publish
- [ ] Design tokens: SF Pro stack wired (P0-C04)
- [ ] Zero "Table 04" in packaging guest shells

### P1 exit

- [ ] Spark opt-in → game → Sparkle Win → menu
- [ ] Razorpay live + Shiprocket on Accept
- [ ] Kitchen Accept timer 10m/15m + +5m once
- [ ] Waiting penalty ledger writes
- [ ] Dual Kapso agents + 7-day marketing cap
- [ ] Wallet top-up path
- [ ] Restaurant GPS required
- [ ] Scan→order ≥ 8% pilot; WARE ≥ 10 for 2 weeks

### P1.5 exit

- [ ] Cross-By max 2 kitchens
- [ ] Haversine ≤1 km single rider / >1 km split verified in staging
- [ ] checkout_groups single UPI → N orders
- [ ] Track toggler [1st|2nd]
- [ ] Concurrent ordering E2E PASS

### P2 exit

- [ ] Hub + Your Direct Perks live
- [ ] Food HI lookup returning/new paths
- [ ] Analytics + payout/penalty export
- [ ] Menu AI import ≥ 80% owner sat
- [ ] Kitchen WS primary; poll fallback tested

### P3 exit

- [ ] Second city playbook
- [ ] 150+ WARE trajectory

---

## Task checklists

- [PHASE-0-TASKS.md](./PHASE-0-TASKS.md)
- [PHASE-1-TASKS.md](./PHASE-1-TASKS.md)
- [PHASE-1.5-TASKS.md](./PHASE-1.5-TASKS.md)
- [PHASE-2-TASKS.md](./PHASE-2-TASKS.md)
- [PHASE-3-TASKS.md](./PHASE-3-TASKS.md)
