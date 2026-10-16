# Deploy backends on Railway (+ Vercel frontends)

**Recommended** when Render free tier blocks pre-deploy hooks. Use [Railway New Project](https://railway.com/new).

Repo: **[Shabrezadilabz/damigos](https://github.com/Shabrezadilabz/damigos)** (check spelling — not `Shabrezadilbaz`).

Frontends: [DEPLOY-VERCEL.md](./DEPLOY-VERCEL.md).

## 1. Create project

1. [railway.com/new](https://railway.com/new) → **Deploy from GitHub repo** → `Shabrezadilabz/damigos`, branch **`main`**.
2. **+ New** → **Database** → **PostgreSQL**. Open the Postgres service → **Connect** → copy **`DATABASE_URL`**.

## 2. CRM API service

1. **+ New** → **GitHub Repo** → same repo (or **Empty Service** → connect repo).
2. **Settings** → **Config-as-code** → path: `deploy/railway.crm-api.toml`.
3. **Variables** (service or shared project variables):

| Variable | Value |
|----------|--------|
| `DATABASE_URL` | From Postgres (reference `${{Postgres.DATABASE_URL}}` if using Railway references) |
| `JWT_SECRET` | Long random string (32+ chars) — **copy same value to guest API** |
| `OTP_BYPASS_CODE` | `000000` |
| `ENABLE_DEV_FIXTURES` | `true` |
| `ONBOARDING_AUTO_APPROVE` | `true` |
| `DAMIGOS_ENV` | `staging` |
| `CRM_CORS_ORIGINS` | `*` |
| `CRM_WEB_URL` | `https://damigos-crm-web.vercel.app` (after Vercel) |

4. **Settings** → **Networking** → **Generate domain** → save URL (e.g. `https://damigos-crm-api-production.up.railway.app`).

Migrations run **on container start** (`deploy/docker-entrypoint.sh`), not via Railway release command.

## 3. Guest API service

1. Duplicate service or add second service from same repo.
2. Config file: `deploy/railway.guest-api.toml`.
3. **Same** `DATABASE_URL` and **same** `JWT_SECRET` as CRM.
4. Add `GUEST_CORS_ORIGINS=*`, `GUEST_WEB_URL` = Guest Vercel URL.
5. Generate public domain.

Optional: on guest only set `DAMIGOS_SKIP_MIGRATE=1` so only CRM runs migrations on boot (both is also fine).

## 4. Seed (once)

Railway **Shell** on either API service:

```bash
npm run db:seed
```

## 5. Wire Vercel

| Vercel project | Env |
|----------------|-----|
| `damigos-crm-web` | `CRM_API_PROXY_TARGET` = CRM Railway URL |
| `damigos-guest-web` | `NEXT_PUBLIC_GUEST_API_URL` = Guest Railway URL |

Redeploy Vercel after APIs are live.

## 6. Verify

```text
GET <crm-railway-url>/health
GET <guest-railway-url>/health
```

Pilot logins: [TESTING-PHASE.md](./TESTING-PHASE.md).

## CLI (optional)

```powershell
npm i -g @railway/cli
railway login
cd d:\ADC\prosols\damigos_main
railway link
railway up
```

Use separate services in the dashboard for CRM vs Guest Docker configs.
