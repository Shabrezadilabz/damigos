# E2E (Playwright)

Requires **Postgres + Redis**, **APIs + web** running locally.

## Setup

```powershell
cd d:\ADC\prosols\damigos_main
copy .env.example .env
# ENABLE_DEV_FIXTURES=true in .env
npm install
npm run dev:infra
npm run redis:ping
npm run db:migrate
npm run db:seed
npx playwright install chromium
```

## Run

**One-shot (PowerShell):** `.\scripts\run-e2e.ps1` — checks ports, Docker, migrate/seed, starts API/web if needed.

Or manually — terminal 1–2:

```powershell
npm run dev:api
npm run dev:web
```

Terminal 3:

```powershell
npm run test:e2e
```

**Port 3000 must be the guest app.** If another dev server owns `:3000`, scan tests time out (wrong app / HTTP 500). Free the port or set `GUEST_WEB_URL` to the correct base URL.

Optional env: `GUEST_WEB_URL`, `CRM_WEB_URL`, `GUEST_API_URL`, `DEV_GUEST_SPIN_PHONE` (isolates TC-G-021 from checkout guest).

**Auth in tests:** `fixtures.ts` seeds guest/CRM sessions via OTP API + `localStorage` (not flaky UI OTP). Root `.env` is loaded in `playwright.config.ts` (e.g. `RAZORPAY_WEBHOOK_SECRET`).

Maps to [P0-EXIT-SMOKE.md](../docs/testing/P0-EXIT-SMOKE.md) and `e2e/guest/*.spec.ts`, `e2e/crm/*.spec.ts`.

| Spec | Cases |
|------|--------|
| `guest/scan.spec.ts` | TC-G-001, TC-G-002 (Spark bridge → play) |
| `guest/spark-flow.spec.ts` | TC-G-027 Spark unlock webhook + redeem menu |
| `guest/spin-daily-limit.spec.ts` | TC-G-021 daily spin cap |
| `guest/checkout-reward-claim.spec.ts` | TC-G-023 scratch, TC-G-024 checkout offer |
| `guest/checkout.spec.ts` | TC-G-040/046/050 (mock pay) |
| `guest/checkout-stub.spec.ts` | TC-G-058 (`PAYMENT_MODE=stub`) |
| `guest/razorpay-webhook.spec.ts` | TC-G-058 webhook HMAC + PAID capture |
| `guest/orders-home.spec.ts` | TC-G-080/081 active + reorder |
| `guest/checkout-delivery.spec.ts` | TC-G-054 (`DELIVERY_MODE=mock`) |
| `guest/checkout-delivery-unserviceable.spec.ts` | TC-G-055 pincode `000000` blocks pay |
| `guest/error-states.spec.ts` | TC-G-003/004, G-11 payment failed, G-15 paused menu |
| `guest/hub.spec.ts` | TC-G-090 hub curated list, TC-G-092 switch kitchen |
| `guest/hub-search.spec.ts` | TC-G-091 hub search |
| `guest/reference-price.spec.ts` | TC-G-045 reference price chip |
| `crm/login-menu.spec.ts` | TC-C-002 |
| `crm/publish-menu.spec.ts` | TC-C-027 |
| `crm/menu-import.spec.ts` | TC-C-022..025 PDF import + review UI |
| `crm/menu-item-edit.spec.ts` | TC-C-026 edit drawer, TC-C-028 86 |
| `crm/grow-tabs.spec.ts` | TC-C-044/045 Grow tabs + wizard step 1 |
| `crm/grow-customer-detail.spec.ts` | TC-C-043 customer drawer |
| `crm/grow-poster.spec.ts` | TC-C-054 AI poster mock approve |
| `crm/wallet-topup.spec.ts` | TC-C-050 stub top-up ₹999 |
| `crm/campaign-schedule.spec.ts` | TC-C-049/051 wallet + schedule |
| `crm/campaign-auto-dispatch.spec.ts` | TC-C-052 scheduled auto-send |

Full map: [docs/testing/P1-E2E-REGRESSION.md](../docs/testing/P1-E2E-REGRESSION.md) (**43 tests**).

| `cross/kitchen-flow.spec.ts` | P0-T30-e mock pay → CRM Accept → guest track |

CI: repo workflow [`.github/workflows/damigos-e2e.yaml`](../../.github/workflows/damigos-e2e.yaml) (on `damigos_main/**` changes).
