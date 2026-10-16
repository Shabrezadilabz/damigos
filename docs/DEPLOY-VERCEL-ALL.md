# All on Vercel (4 projects)

| Vercel project | Root directory | Public URL (aliases) |
|----------------|----------------|----------------------|
| `damigos-crm-web` | `apps/crm/frontend` | https://damigos-crm-web.vercel.app |
| `damigos-guest-web` | `apps/guest/frontend` | https://damigos-guest-web.vercel.app |
| `damigos-crm-api` | `apps/crm/backend` | https://damigos-crm-api.vercel.app |
| `damigos-guest-api` | `apps/guest/backend` | https://damigos-guest-api.vercel.app |

Repo: [Shabrezadilabz/damigos](https://github.com/Shabrezadilabz/damigos)

## 1. Database (once)

Use **Vercel Postgres**, **Neon**, or any hosted Postgres. Copy `DATABASE_URL` into **both** API projects.

From your machine (once per environment):

```powershell
cd d:\ADC\prosols\damigos_main
$env:DATABASE_URL="postgresql://..."
npm run db:migrate
npm run db:seed
```

## 2. Deploy API projects

Import repo twice (or use CLI):

```powershell
cd apps/crm/backend
vercel link    # project name: damigos-crm-api
vercel --prod

cd ../../guest/backend
vercel link    # damigos-guest-api
vercel --prod
```

Each uses [`vercel.json`](../apps/crm/backend/vercel.json) — Fastify runs as one serverless function (`serverless-http`).

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
