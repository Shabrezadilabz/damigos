# Guest App — Test Plan

## Scope

All routes in [GUEST-APP-PRD.md](../prd/GUEST-APP-PRD.md).

## Priority

| Priority | Meaning |
|----------|---------|
| P0 | Block release |
| P1 | MVP pilot |
| P2 | Post-pilot |

## Suites

| Suite | Cases | Phase |
|-------|-------|-------|
| Scan & token | TC-G-001..004 | P0 |
| Spark opt-in | TC-G-027 | P1 |
| Auth & consent | TC-G-030..035 | P0 |
| Rewards / Sparkle Win | TC-G-020..026 | P1 |
| Menu & cart | TC-G-040..048 | P0-P1 |
| Checkout & pay | TC-G-050..061 | P1 |
| Offer scope & free delivery | TC-G-056..059, TC-G-068 | P1 |
| Cross-By & checkout_groups | TC-G-062..067 | P1.5 |
| Track countdown | TC-G-070..072 | P1 |
| Dual toggler | TC-G-073..074 | P1.5 |
| Orders + concurrent | TC-G-080..083 | P1–P1.5 |
| Hub + Direct Perks | TC-G-090..093 | P2 |
| Design feel | TC-D-001..010 | Every UI |
| Errors | TC-G-100..105 | P1 |

Execute from [test-cases/GUEST-TC.md](./test-cases/GUEST-TC.md) + stubs in [TEST-CASE-INDEX.md](./TEST-CASE-INDEX.md).

## Webview-specific

- iOS WA in-app browser: safe area, scroll bounce, SF Pro rendering
- Android WA: back button behavior vs G-R02
- Low network: checkout timeout messaging
- Apple feel: press scale, sheet rubber-band, tabular-nums on ₹/timers
