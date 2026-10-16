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
| Auth & consent | TC-G-030..035 | P0 |
| Menu & cart | TC-G-040..048 | P0-P1 |
| Checkout & pay | TC-G-050..061 | P1 |
| Track & orders | TC-G-070..082 | P1-P2 |
| Hub | TC-G-090..093 | P2 |
| Errors | TC-G-100..105 | P1 |

Execute from [test-cases/GUEST-TC.md](./test-cases/GUEST-TC.md).

## Webview-specific

- iOS WA in-app browser: safe area, scroll bounce
- Android WA: back button behavior vs G-R02
- Low network: checkout timeout messaging
