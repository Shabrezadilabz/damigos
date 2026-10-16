# Deploy — Vercel (frontends) + Railway (APIs)

Repo: [Shabrezadilabz/damigos](https://github.com/Shabrezadilabz/damigos)

## Architecture

| Service | Host | Root / config |
|---------|------|----------------|
| CRM web | Vercel | `apps/crm/frontend` + `vercel.json` |
| Guest web | Vercel | `apps/guest/frontend` + `vercel.json` |
| CRM API | Railway | `deploy/Dockerfile.crm-api`, `deploy/railway.crm-api.toml` |
| Guest API | Railway | `deploy/Dockerfile.guest-api`, `deploy/railway.guest-api.toml` |
| Postgres | Railway plugin | `DATABASE_URL` on **both** API services |
| Redis (optional) | Railway | `REDIS_URL` on CRM API only |

## 1. Railway — one project, three resources

1. [railway.app](https://railway.app) → **New project** → **Deploy from GitHub** → `Shabrezadilabz/damigos`.
2. Add **PostgreSQL** → copy `DATABASE_URL` into **both** API services.
3. **Service: crm-api**
   - Settings → **Config-as-code**: `deploy/railway.crm-api.toml`
   - Variables: see [`deploy/ENV.production.example`](../deploy/ENV.production.example)
   - Generate domain → note `https://….up.railway.app`
4. **Service: guest-api** (duplicate service from same repo)
   - Config: `deploy/railway.guest-api.toml`
   - Same `DATABASE_URL`, `JWT_SECRET`, pilot flags
   - Generate domain
5. First deploy runs `npm run db:migrate` as **release** command. Then once: Railway shell or local with prod URL:
   ```bash
   DATABASE_URL=... npm run db:seed
   ```

API health: `GET /health` on each Railway URL.

## 2. Vercel — two projects

### CRM web

1. Import `Shabrezadilabz/damigos` → **Root Directory**: `apps/crm/frontend`
2. Env:
   - `CRM_API_PROXY_TARGET` = CRM Railway URL (no trailing slash)
   - Or `NEXT_PUBLIC_CRM_API_URL` = same (direct browser calls)
3. Deploy

### Guest web

1. Second project → **Root Directory**: `apps/guest/frontend`
2. Env (required at build):
   - `NEXT_PUBLIC_GUEST_API_URL` = Guest Railway URL
   - `NEXT_PUBLIC_SHOW_UI_DEMO=true` (pilot)
3. Deploy

## 3. Wire CORS + public URLs

On Railway CRM API:

- `CRM_WEB_URL` = your CRM Vercel URL
- `CRM_CORS_ORIGINS=*` (pilot) or comma-list of Vercel URLs

On Railway Guest API:

- `GUEST_WEB_URL` = Guest Vercel URL
- `GUEST_CORS_ORIGINS=*`

Redeploy APIs after changing CORS.

## 4. CLI (optional)

```powershell
cd d:\ADC\prosols\damigos_main
git push origin main

# Vercel (after vercel login)
cd apps/crm/frontend
vercel link
vercel --prod

cd ../../guest/frontend
vercel link
vercel --prod

# Railway (after railway login)
railway link
railway up
```

## 5. Smoke test

See [TESTING-PHASE.md](./TESTING-PHASE.md) — same phones/OTP `000000`, on production URLs.
