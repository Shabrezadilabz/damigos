# Deploy backends on Render (+ Vercel frontends)

Use [Render Dashboard](https://dashboard.render.com/) for **both APIs + Postgres**. Use **Vercel** for CRM and Guest Next.js apps.

Repo: [Shabrezadilabz/damigos](https://github.com/Shabrezadilabz/damigos)

## Quick start (Blueprint)

1. Open [dashboard.render.com](https://dashboard.render.com/) → **New** → **Blueprint**.
2. Connect GitHub → select **`Shabrezadilabz/damigos`** (branch `main`).
3. Render reads root [`render.yaml`](../render.yaml) and creates:
   - PostgreSQL **`damigos-db`**
   - Web **`damigos-crm-api`** (Docker)
   - Web **`damigos-guest-api`** (Docker)
4. Wait for first deploy (migrations run **on container start** — free tier does not support `preDeployCommand`).
5. Open each web service → **Settings** → note public URL (`https://damigos-crm-api.onrender.com`, etc.).

### Seed demo data (once)

CRM / Guest **Shell** (either API service, same `DATABASE_URL`):

```bash
npm run db:seed
```

Optional food catalog: `npm run db:seed-food-catalog`

### After Vercel frontends exist

Set on Render (Environment):

| Service | Variable | Value |
|---------|----------|--------|
| crm-api | `CRM_WEB_URL` | CRM Vercel URL |
| guest-api | `GUEST_WEB_URL` | Guest Vercel URL |

On Vercel CRM project: `CRM_API_PROXY_TARGET` = CRM Render URL (no trailing slash).

On Vercel Guest project: `NEXT_PUBLIC_GUEST_API_URL` = Guest Render URL.

Redeploy frontends after env changes.

**Important:** CRM and Guest APIs must share the same `JWT_SECRET`. The Blueprint sets it on `damigos-crm-api` and copies it to `damigos-guest-api`. If you create services manually, paste one secret into both.

## Manual setup (no Blueprint)

Two **Web Services** + one **PostgreSQL**, both from the same repo:

| Setting | CRM API | Guest API |
|---------|---------|-----------|
| Runtime | Docker | Docker |
| Dockerfile | `deploy/Dockerfile.crm-api` | `deploy/Dockerfile.guest-api` |
| Docker context | `.` (repo root) | `.` |
| Pre-deploy command | `npm run db:migrate` | `npm run db:migrate` |
| Health check | `/health` | `/health` |

Copy env from [`deploy/ENV.production.example`](../deploy/ENV.production.example).

## Optional Redis (kitchen live refresh)

Render **Key Value** (Redis) → add `REDIS_URL` on **crm-api** only. CRM runs without Redis (degraded kitchen SSE).

## Verify

```text
GET https://<crm-api-host>/health
GET https://<guest-api-host>/health
```

Pilot OTP: `000000` / `00000` — see [TESTING-PHASE.md](./TESTING-PHASE.md).

Frontends: [DEPLOY-VERCEL.md](./DEPLOY-VERCEL.md) (Vercel section only; ignore Railway).
