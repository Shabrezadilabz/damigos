# Deploy — Vercel (frontends) + Render (APIs)

**Backends:** [Render Dashboard](https://dashboard.render.com/) — see **[DEPLOY-RENDER.md](./DEPLOY-RENDER.md)** (Blueprint `render.yaml`).

**Frontends:** Vercel (this doc).

Repo: [Shabrezadilabz/damigos](https://github.com/Shabrezadilabz/damigos)

## Architecture

| Service | Host | Root / config |
|---------|------|----------------|
| CRM web | Vercel | `apps/crm/frontend` + `vercel.json` |
| Guest web | Vercel | `apps/guest/frontend` + `vercel.json` |
| CRM API | Render | `deploy/Dockerfile.crm-api`, [`render.yaml`](../render.yaml) |
| Guest API | Render | `deploy/Dockerfile.guest-api`, [`render.yaml`](../render.yaml) |
| Postgres | Render | `damigos-db` in Blueprint |

## 1. Render (APIs + DB)

Follow **[DEPLOY-RENDER.md](./DEPLOY-RENDER.md)** first. You need CRM and Guest API public URLs before wiring Vercel.

## 2. Vercel — two projects

### CRM web

1. [vercel.com](https://vercel.com) → Import `Shabrezadilabz/damigos` → **Root Directory**: `apps/crm/frontend`
2. Environment:
   - `CRM_API_PROXY_TARGET` = `https://damigos-crm-api.onrender.com` (your Render URL)
   - Or `NEXT_PUBLIC_CRM_API_URL` = same URL
3. Deploy

### Guest web

1. Second project → **Root Directory**: `apps/guest/frontend`
2. Environment (build-time):
   - `NEXT_PUBLIC_GUEST_API_URL` = Guest Render URL
   - `NEXT_PUBLIC_SHOW_UI_DEMO=true`
3. Deploy

## 3. Link CORS

On Render, set `CRM_WEB_URL` / `GUEST_WEB_URL` to your Vercel URLs (`CRM_CORS_ORIGINS=*` is fine for pilot).

## 4. CLI (optional)

```powershell
cd d:\ADC\prosols\damigos_main\apps\crm\frontend
vercel link
vercel --prod

cd ..\..\guest\frontend
vercel link
vercel --prod
```

## 5. Smoke test

[TESTING-PHASE.md](./TESTING-PHASE.md) — phones + OTP `000000` on production URLs.
