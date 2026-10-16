# CRM App — Test Plan

## Scope

All routes in [CRM-APP-PRD.md](../prd/CRM-APP-PRD.md).

## Suites

| Suite | Cases | Phase |
|-------|-------|-------|
| Onboarding & auth | TC-C-001..004 | P0 |
| Dashboard | TC-C-010..014 | P1-P2 |
| Menu | TC-C-020..029 | P0-P1 |
| Grow | TC-C-040..054 | P1-P2 |
| Orders & kitchen | TC-C-060..069 | P1 |
| Settings & admin | TC-C-070..084 | P0-P1 |

Execute from [test-cases/CRM-TC.md](./test-cases/CRM-TC.md).

## RBAC tests

Verify kitchen role cannot access wallet, admin routes, or campaign schedule.

## Tablet

Kitchen mode on 768px width — touch targets, column scroll.
