# Deploy — Vercel (frontends) + Railway (APIs)

**Backends:** [Railway](https://railway.com/new) — **[DEPLOY-RAILWAY.md](./DEPLOY-RAILWAY.md)** (primary).

**Render (optional):** [DEPLOY-RENDER.md](./DEPLOY-RENDER.md) — free tier works after `preDeployCommand` was removed; migrations run at container start.

Repo: [Shabrezadilabz/damigos](https://github.com/Shabrezadilabz/damigos)

## Architecture

| Service | Host | Config |
|---------|------|--------|
| CRM web | Vercel | `apps/crm/frontend` |
| Guest web | Vercel | `apps/guest/frontend` |
| CRM API | Railway | `deploy/railway.crm-api.toml` |
| Guest API | Railway | `deploy/railway.guest-api.toml` |
| Postgres | Railway | PostgreSQL plugin |

## Vercel projects (already linked)

| Project | URL (when deploy succeeds) |
|---------|----------------------------|
| `damigos-crm-web` | https://damigos-crm-web.vercel.app |
| `damigos-guest-web` | https://damigos-guest-web.vercel.app |

Root directory: `apps/crm/frontend` and `apps/guest/frontend`. Install/build use `vercel.json` (`cd ../.. && npm ci`).

Env after Railway APIs are up — see `deploy/ENV.production.example`.

## Redeploy frontends

```powershell
cd d:\ADC\prosols\damigos_main\apps\crm\frontend
vercel deploy --prod --yes

cd ..\..\guest\frontend
vercel deploy --prod --yes
```

## Smoke test

[TESTING-PHASE.md](./TESTING-PHASE.md)
