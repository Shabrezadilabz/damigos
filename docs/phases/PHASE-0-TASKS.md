# Phase 0 — Task Checklist

**Status legend:** ⬜ Todo | 🔄 In progress | ✅ Done | ⏸ Deferred

## Platform

| ID | Task | Owner | Status | Feature IDs |
|----|------|-------|--------|-------------|
| P0-T01 | Monorepo scaffold (apps + packages) | BE | ✅ | — |
| P0-T02 | Postgres schema v1 + migrations | BE | ✅ | `packages/db/drizzle/0000_initial.sql` + `npm run db:migrate` |
| P0-T03 | OTP auth guest + staff | BE | ✅ | JWT via @damigos/auth |
| P0-T04 | RBAC middleware CRM | BE | ✅ | Tenant scope + /me; menu + stickers |
| P0-T05 | Admin mint sticker batch API | BE | ✅ | C-06.05 — auth protected |
| P0-T06 | Scan resolve API | BE | ✅ | G-01.01 — activation gate |

## Guest web

| ID | Task | Owner | Status | Feature IDs |
|----|------|-------|--------|-------------|
| P0-T10 | Routes G-S1..S3 shell | FE-G | ✅ | G-01 landing + menu + checkout routes |
| P0-T11 | Menu list + item sheet | FE-G | ✅ | G-03 — sheet + cart API |
| P0-T12 | Profile/consent modal | FE-G | ✅ | G-02 — checkout gate + sheet |

## CRM web

| ID | Task | Owner | Status | Feature IDs |
|----|------|-------|--------|-------------|
| P0-T20 | Login + layout sidebar | FE-C | ✅ | /start OTP + token |
| P0-T21 | Menu CRUD + publish | FE-C | ✅ | C-03 — MenuManager + API |
| P0-T22 | Settings profile | FE-C | ✅ | C-06.04 activate + admin mint UI |

## QA

| ID | Task | Owner | Status |
|----|------|-------|--------|
| P0-T30 | Execute TC-G-001, 030, 040, 046, 050, TC-C-002, 020, 027 | QA | ✅ | `npm run test:e2e` (5 pass + stub skip) |

## v2.0 residual (planning → small polish only after PLAN sign-off)

| ID | Task | Owner | Status | Feature IDs |
|----|------|-------|--------|-------------|
| P0-T40 | Wire Apple SF Pro CSS tokens (no full screen rebuild) | FE | ⬜ | P-DES-01 |
| P0-T41 | Remove Table 04 / Dine-in copy from guest shells | FE-G | ⬜ | STITCH-SCREEN-MAP |
