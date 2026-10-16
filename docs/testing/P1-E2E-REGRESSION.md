# Phase 1 — Playwright regression

**Task:** P1-T15 · **Command:** `npm run test:e2e` from `damigos_main/`

## Prerequisites

- Postgres migrated through `0015_restaurant_payout_pos.sql`, `npm run db:seed`
- Redis up (`npm run redis:ping` or CI service)
- Root `.env`: `JWT_SECRET`, `ENABLE_DEV_FIXTURES=true`, `OTP_BYPASS_CODE=000000`
- APIs + web on **3000** (guest), **3001** (crm), **4000**, **4001**
- CI parity: `PAYMENT_MODE=stub`, `DELIVERY_MODE=mock`, `WALLET_TOPUP_MODE=stub`, `REDIS_URL` (kitchen SSE)

## Suite map (43 tests)

| Project | Spec | Coverage |
|---------|------|----------|
| guest | `scan.spec.ts` | TC-G-001, TC-G-002 |
| guest | `spin-daily-limit.spec.ts` | TC-G-021 |
| guest | `checkout-reward-claim.spec.ts` | TC-G-023/024 |
| guest | `checkout.spec.ts` | Checkout smoke |
| guest | `checkout-stub.spec.ts` | TC-G-058 |
| guest | `razorpay-webhook.spec.ts` | TC-G-058 webhook capture |
| guest | `checkout-delivery.spec.ts` | TC-G-054 |
| guest | `checkout-delivery-unserviceable.spec.ts` | TC-G-055 |
| guest | `orders-home.spec.ts` | TC-G-080/081 |
| guest | `error-states.spec.ts` | TC-G-003/004, G-11, G-15 |
| guest | `hub.spec.ts` | TC-G-090/092 |
| guest | `hub-search.spec.ts` | TC-G-091 |
| guest | `reference-price.spec.ts` | TC-G-045 |
| crm | `dashboard.spec.ts` | TC-C-010..014 |
| crm | `kitchen-sse.spec.ts` | TC-C-063..064 SSE + WS |
| crm | `settings-payout.spec.ts` | TC-C-073..074 |
| integration | `redis-health.spec.ts` | CRM `/health` redis up |
| crm | `login-menu.spec.ts` | TC-C-002 |
| crm | `publish-menu.spec.ts` | TC-C-027 |
| crm | `menu-import.spec.ts` | TC-C-022..025 |
| crm | `menu-item-edit.spec.ts` | TC-C-026/028 drawer + 86 |
| crm | `grow-tabs.spec.ts` | TC-C-044/045 |
| crm | `grow-customer-detail.spec.ts` | TC-C-043 |
| crm | `grow-poster.spec.ts` | TC-C-054 |
| crm | `wallet-topup.spec.ts` | TC-C-050 |
| crm | `campaign-schedule.spec.ts` | TC-C-049/051 |
| crm | `campaign-auto-dispatch.spec.ts` | TC-C-052 scheduler |
| integration | `kitchen-flow.spec.ts` | P0-T30-e kitchen Accept |

**Target:** **36 passed** — `npm run test:e2e` (guest + crm + integration projects, 1 worker). Root `.env` is loaded in Playwright. CRM API needs `CAMPAIGN_SCHEDULER_ENABLED=true` for TC-C-052.

## Not automated (P1 backlog)

- Razorpay live / webhook raw body (P1-T02)
- Kapso send queue (P1-T06)
- Live Shiprocket (P1-T03)
- CRM onboarding form (TC-C-001)
