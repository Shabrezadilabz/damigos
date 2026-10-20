# D'aMigo's — Local development

**Phase:** P0 · See [docs/phases/PHASE-0-TASKS.md](./docs/phases/PHASE-0-TASKS.md)

## Prerequisites

- Node 20+
- Docker (Postgres + Redis)

## Setup

```powershell
cd d:\ADC\prosols\damigos_main
copy .env.example .env
docker compose up -d   # Postgres + Redis (kitchen SSE) — or `npm run dev:infra`
npm run redis:ping     # fail fast if Redis is down
npm install
npm run db:migrate
npm run db:seed
npm run db:seed-food-catalog   # global dish → image catalog for menu thumbnails
```

**Food catalog (dish photos for menu rows):**

| Command | Purpose |
|--------|---------|
| `npm run db:seed-food-catalog` | Load built-in + `packages/db/data/food-catalog.bulk.json` (+ optional `food-catalog.custom.json`) |
| `npm run db:import-food-catalog -- path\to\extra.json` | Merge more dishes (see `packages/db/data/food-catalog.custom.json.example`) |
| `npm run food-catalog:flux -- --limit 25` | Hive Flux photos for menu items still unmatched (needs `HIVE_API_KEY`) |

Flux options: `--dry-run`, `--restaurant-id <uuid>`, `--min-score 300`, env `FOOD_CATALOG_FLUX_DELAY_MS=1200`.

If CRM **Menu** returns **500** (`reference_price_paise` / `import_confidence` does not exist), run:

```powershell
docker compose up -d
npm run db:patch-menu
```

Restart CRM API (`npm run dev:crm-api`) and refresh `/menu`.

Ensure root `.env` includes `JWT_SECRET` (see `.env.example`).

**UI / Stitch validation:** after seed, use [docs/UI-DEMO-ACCOUNTS.md](./docs/UI-DEMO-ACCOUNTS.md) — CRM owner + guest Priya with orders, kitchen, grow, hub, and cart pre-filled.

**CRM menu demo rows:** in non-production, the first load of `/menu` auto-seeds Stitch-style draft + live items when the restaurant has fewer than 8 menu records (see `apps/crm/backend/src/lib/menu-demo-seed.ts`). Disable with `MENU_DEMO_SEED=false`.

### APIs failing / “network error” in the browser

1. **Not prosols-portal** — D'aMigo's APIs are **`damigos_main`** on **4000** (guest) and **4001** (crm), not the Vite app on another port.
2. **CRM crash on start** — run `npm install` in `damigos_main` (needs `@fastify/websocket`). CRM now starts without it (SSE only) if install is incomplete.
3. **Port already in use** — stale `node` processes: `npm run stop:ports` then `npm run dev:api`.
4. **Verify:** `npm run check:apis` or open http://localhost:4000/health and http://localhost:4001/health in the browser.
5. Frontends must have `apps/*/frontend/.env.local` with `NEXT_PUBLIC_*_API_URL` pointing at those ports (restart Next after editing).

Optional: copy `restaurantId` from seed into frontends (CRM menu uses JWT `/me` by default):

```
NEXT_PUBLIC_DEMO_RESTAURANT_ID=<restaurantId>
```

Copy env for frontends:

```powershell
copy apps\guest\frontend\.env.local.example apps\guest\frontend\.env.local
copy apps\crm\frontend\.env.local.example apps\crm\frontend\.env.local
```

## Run (all four processes)

**One command** (Docker + migrate/seed + both APIs + both frontends):

```powershell
npm run dev:all
# or: .\scripts\start-dev.ps1
```

**Two terminals** (if infra is already up):

```powershell
npm run dev:api    # guest :4000, crm :4001
npm run dev:web    # guest :3000, crm :3001
```

**Single terminal** (APIs + web together, after migrate/seed):

```powershell
npm run dev
```

| App | URL |
|-----|-----|
| Guest web | http://localhost:3000 |
| CRM web | http://localhost:3001/start |
| Guest API | http://localhost:4000/health |
| CRM API | http://localhost:4001/health |

## P0 happy path (manual)

1. `npm run db:migrate` (includes through `0015_restaurant_payout_pos`)
2. CRM owner login (`9876543210` / OTP `000000`) → publish menu if needed
3. **Settings → Activate batch** for new mints (seed `DEV-BATCH-001` is auto-activated)
4. Guest `/s/{token}` → **spin/scratch** → Avail (OTP + game consent) → menu → checkout → track
5. CRM **Orders → Kitchen mode** — Accept → prep → ready → out (live board uses **SSE** + Redis; **WS** at `/v1/ws/kitchen` for the same refresh channel)

**Razorpay stub:** set `PAYMENT_MODE=stub` in `.env`, restart guest-api — checkout uses prepare → confirm-stub, or signed `POST /v1/webhooks/razorpay` (guest-api parses JSON with a raw-body scope for HMAC). Set `RAZORPAY_WEBHOOK_SECRET` to match CI/E2E when testing signatures.

**Razorpay live (pilot):** `PAYMENT_MODE=razorpay`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` — guest checkout opens Razorpay Checkout.js; server verifies via `POST /v1/checkout/verify-razorpay`. `RAZORPAY_WEBHOOK_SECRET` required in prod; terminate TLS at a proxy that forwards **unmodified body** to guest-api (or use the same raw-body parser pattern).

**Delivery:** `DELIVERY_MODE=mock` — fake 560xxx rates + ₹5. `sandbox` / `live` — real Shiprocket API (`SHIPROCKET_EMAIL` / `PASSWORD`); see [docs/architecture/SHIPROCKET-RAZORPAY-SETUP.md](./docs/architecture/SHIPROCKET-RAZORPAY-SETUP.md). E2E defaults to `off` unless set.

**Razorpay test:** `PAYMENT_MODE=razorpay` + `RAZORPAY_KEY_ID` / `SECRET` (Test Mode `rzp_test_…`). Same setup doc.

**Grow scheduler:** `CAMPAIGN_SCHEDULER_ENABLED=true` on **crm-api** — polls due `Scheduled` campaigns and runs mock Kapso dispatch (7-day cap already applied when recipients were built).

**Kitchen load smoke:** with crm-api + Redis running, `node scripts/kitchen-stream-load.mjs --connections=8` (optional `--restaurantId=`). Tune cap via `KITCHEN_STREAM_MAX_PER_RESTAURANT`.
6. Platform admin (`9876543211`) can mint batches in Settings; owner must activate before scans work

## Repo layout (split-friendly)

```
apps/guest/frontend   → future damigos-guest-web
apps/guest/backend    → future damigos-guest-api
apps/crm/frontend     → future damigos-crm-web
apps/crm/backend      → future damigos-crm-api
packages/db           → shared schema
packages/domain       → shared types
```

Harness: [docs/harness/DEVELOPMENT-HARNESS.md](./docs/harness/DEVELOPMENT-HARNESS.md)

**P0 exit QA:** [docs/testing/P0-EXIT-SMOKE.md](./docs/testing/P0-EXIT-SMOKE.md) · **E2E:** `npm run test:e2e` ([e2e/README.md](./e2e/README.md))
