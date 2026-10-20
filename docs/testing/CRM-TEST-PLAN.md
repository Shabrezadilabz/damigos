# CRM App — Test Plan

## Scope

All routes in [CRM-APP-PRD.md](../prd/CRM-APP-PRD.md).

## Suites

| Suite | Cases | Phase |
|-------|-------|-------|
| Onboarding & auth + GPS | TC-C-001..005 | P0–P1 |
| Dashboard + payout | TC-C-010..015 | P1–P2 |
| Menu + prep category | TC-C-020..030 | P0–P1 |
| Grow | TC-C-040..054 | P1–P2 |
| Orders & kitchen timer/penalty | TC-C-060..069 | P1 |
| Settings & admin + location | TC-C-070..084 | P0–P1 |
| Design feel kitchen | TC-D-009..010 | P1 |

Execute from [test-cases/CRM-TC.md](./test-cases/CRM-TC.md) + [TEST-CASE-INDEX.md](./TEST-CASE-INDEX.md).

## RBAC tests

Verify kitchen role cannot access wallet, admin routes, or campaign schedule.

## Tablet

Kitchen mode on 768–1024px — 44px targets, Accept/+5m/Ready springs, loud PAID chime, tabular countdown.
