# Deploy D'aMigo's (GitHub + Vercel + API host)

Target GitHub org/user: [Shabrezadilabz](https://github.com/Shabrezadilabz).

## 1. Push `damigos_main` to GitHub

From `damigos_main` (monorepo root):

```powershell
git init   # only if this folder is not already a repo
git add .
git commit -m "Initial D'aMigo's CRM + guest monorepo for testing"
gh repo create Shabrezadilabz/damigos --private --source=. --remote=origin --push
```

Use a public repo only if you are sure no secrets are tracked (`.env` is gitignored).

## 2. What runs where

| App | Stack | Recommended host |
|-----|--------|------------------|
| CRM web | Next.js `apps/crm/frontend` | **Vercel** |
| Guest web | Next.js `apps/guest/frontend` | **Vercel** |
| CRM API | Fastify `apps/crm/backend` | **Railway**, **Render**, or **Fly.io** (long-lived Node) |
| Guest API | Fastify `apps/guest/backend` | Same as CRM API (second service) |

Fastify + Postgres + Redis + kitchen SSE/WebSocket is **not** a good fit for Vercel serverless alone. Use Vercel for the two Next apps and a small Node host for each API.

## 3. Vercel — CRM frontend

1. Import repo → **Root Directory**: `apps/crm/frontend`.
2. Framework: Next.js (default).
3. Environment variables:
   - `NEXT_PUBLIC_CRM_API_URL` = `https://<your-crm-api-host>` (no trailing slash)
4. Deploy. Remove or adjust local rewrite in `next.config.ts` when using a public API URL.

## 4. Vercel — Guest frontend

1. Second Vercel project → **Root Directory**: `apps/guest/frontend`.
2. `NEXT_PUBLIC_GUEST_API_URL` = `https://<your-guest-api-host>`.

## 5. API services (Railway / Render example)

Each API needs:

- **Build**: from monorepo root, e.g. `npm install && npm run build -w @damigos/crm-api`
- **Start**: `node apps/crm/backend/dist/index.js` (or workspace start script)
- **Env** (minimum):
  - `DATABASE_URL` (managed Postgres)
  - `JWT_SECRET` (32+ chars)
  - `OTP_BYPASS_CODE=000000` (testing only; remove for real SMS later)
  - `ENABLE_DEV_FIXTURES=true` / `ONBOARDING_AUTO_APPROVE=true` for pilot
  - `CRM_WEB_URL`, `GUEST_WEB_URL` → your Vercel URLs (CORS/cookies if added later)
  - `REDIS_URL` if using kitchen realtime features

Run migrations against production DB once: `npm run db:migrate` (from CI or local with prod `DATABASE_URL`).

## 6. Post-deploy testing

Use the same phones/OTP as [TESTING-PHASE.md](./TESTING-PHASE.md), but hit your Vercel URLs instead of localhost.
