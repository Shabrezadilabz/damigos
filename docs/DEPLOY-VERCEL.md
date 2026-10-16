# Deploy on Vercel

**Recommended:** **[DEPLOY-VERCEL-ALL.md](./DEPLOY-VERCEL-ALL.md)** — 4 projects (2 frontends + 2 Fastify APIs).

Alternatives: [DEPLOY-RAILWAY.md](./DEPLOY-RAILWAY.md) · [DEPLOY-RENDER.md](./DEPLOY-RENDER.md)

Repo: [Shabrezadilabz/damigos](https://github.com/Shabrezadilabz/damigos)

## Architecture (all Vercel)

| Service | Root |
|---------|------|
| CRM web | `apps/crm/frontend` |
| Guest web | `apps/guest/frontend` |
| CRM API | `apps/crm/backend` |
| Guest API | `apps/guest/backend` |

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
