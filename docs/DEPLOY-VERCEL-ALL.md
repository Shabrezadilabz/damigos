# All on Vercel (4 projects)

| Vercel project | Root directory | Public URL (aliases) |
|----------------|----------------|----------------------|
| `damigos-crm-web` | `apps/crm/frontend` | https://damigos-crm-web.vercel.app |
| `damigos-guest-web` | `apps/guest/frontend` | https://damigos-guest-web.vercel.app |
| `damigos-crm-api` | `apps/crm/backend` | https://damigos-crm-api.vercel.app |
| `damigos-guest-api` | `apps/guest/backend` | https://damigos-guest-api.vercel.app |

Repo: [Shabrezadilabz/damigos](https://github.com/Shabrezadilabz/damigos)

## 1. Database (required — fixes “Unexpected token 'A' / not valid JSON”)

That error means the **API Vercel functions are crashing** (HTML/plain “A server error…”), not your frontend. The CRM web proxy forwards to `damigos-crm-api`; without `DATABASE_URL` the function fails.

Use **Vercel Postgres**, **Neon**, or any hosted Postgres. Copy `DATABASE_URL` into **both** API projects (`damigos-crm-api` + `damigos-guest-api`). Use the **same** `JWT_SECRET` on both.

From your machine (once per environment):

```powershell
cd d:\ADC\prosols\damigos_main
$env:DATABASE_URL="postgresql://..."
npm run db:migrate
npm run db:seed
```

## 2. Deploy API projects

In Vercel → each API project → **Settings → General**:

- **Root Directory:** `apps/crm/backend` or `apps/guest/backend`
- **Output Directory:** `.` (not `public`)

CLI from **monorepo root** (after `vercel link` per project):

```powershell
cd d:\ADC\prosols\damigos_main
vercel deploy --prod --yes --project damigos-crm-api
vercel deploy --prod --yes --project damigos-guest-api
```

Each uses [`vercel.json`](../apps/crm/backend/vercel.json) — Fastify runs as one serverless function (`serverless-http`).

### If Git push does not start a deployment

1. Vercel → **damigos-crm-api** → **Settings → Git** — confirm repo `Shabrezadilabz/damigos`, branch **main**, root **`apps/crm/backend`**.
2. On [Deployments](https://vercel.com/shabrezadilabzs-projects/damigos-crm-api/deployments), open the **Production** row — the commit must match [latest `main`](https://github.com/Shabrezadilabz/damigos/commits/main). If you still see an older SHA (e.g. `05046ae`), production never picked up the push (quota, disconnected Git, or wrong root).
3. Force a production deploy from your machine (linked project):

   ```powershell
   cd d:\ADC\prosols\damigos_main\apps\crm\backend
   npx vercel deploy --prod --yes
   ```

### Build log: `TS7016` on `./bundle.mjs`

Vercel type-checks `api/*.ts` before serving. The main app entry is **`api/index.js`** (re-export of esbuild `api/bundle.mjs`) so that error should not appear. If it does, you are still on an old deployment that used `api/index.ts`.

A log line alone does not mean the deploy failed — Vercel can still mark **Ready** while serving an **old** commit. Always check the deployment **commit SHA**.

The `buildCommand` must run `node apps/crm/backend/scripts/bundle-vercel.mjs` (from monorepo root). A wrong path skips rebundling; the build then uses whatever `bundle.mjs` is already in git.

### API env (both services)

| Variable | Notes |
|----------|--------|
| `DATABASE_URL` | Same on CRM + Guest |
| `JWT_SECRET` | **Same** on both |
| `OTP_BYPASS_CODE` | `000000` (pilot) |
| `ENABLE_DEV_FIXTURES` | `true` |
| `ONBOARDING_AUTO_APPROVE` | `true` on CRM only |
| `CRM_CORS_ORIGINS` | `*` or CRM web URL |
| `GUEST_CORS_ORIGINS` | `*` or Guest web URL |

## 3. Map frontends → APIs

**CRM web** (`damigos-crm-web`):

- `CRM_API_PROXY_TARGET` = `https://damigos-crm-api.vercel.app` (no trailing slash)

**Guest web** (`damigos-guest-web`):

- `NEXT_PUBLIC_GUEST_API_URL` = `https://damigos-guest-api.vercel.app`

Redeploy both frontends after setting env.

## 4. Limitations (serverless pilot)

- No long-lived **kitchen WebSocket/SSE** on Vercel — use kitchen board refresh / polling.
- **Campaign scheduler** does not run in CRM API serverless — trigger campaigns manually or add Vercel Cron later.
- **Menu import** large payloads: Pro plan may be needed for 60s+ / body size.

Health: `GET https://damigos-crm-api.vercel.app/health`

Testing logins: [TESTING-PHASE.md](./TESTING-PHASE.md)
