# Neon Postgres + Vercel APIs

Console: [Neon — cold-meadow org](https://console.neon.tech/app/org-cold-meadow-58377747/projects)

## 1. Create connection string

1. Open your Neon project → **Connect**.
2. Copy **Connection string** (PostgreSQL).
3. For **Vercel serverless**, prefer the **pooled** host (often contains `-pooler`) or enable **Pooled connection** in the UI.
4. Append if missing: `?sslmode=require`

Example shape (not a real secret):

```text
postgresql://USER:PASS@ep-xxx-pooler.region.aws.neon.tech/neondb?sslmode=require
```

## 2. Vercel env (both API projects)

Set on **damigos-crm-api** and **damigos-guest-api** (same values except CRM-only keys):

| Variable | Value |
|----------|--------|
| `DATABASE_URL` | Neon pooled URL |
| `JWT_SECRET` | Long random string (**identical** on both APIs) |
| `OTP_BYPASS_CODE` | `000000` |
| `ENABLE_DEV_FIXTURES` | `true` |
| `ONBOARDING_AUTO_APPROVE` | `true` (CRM) |
| `DAMIGOS_ENV` | `staging` |
| `CRM_CORS_ORIGINS` | `*` |
| `GUEST_CORS_ORIGINS` | `*` |

### AI (CRM API only — menu import / posters)

| Variable | Purpose |
|----------|---------|
| `AI_TEXT_PROVIDER` | `hive` or `deepseek` |
| `HIVE_API_KEY` | Required if provider is `hive` |
| `DEEPSEEK_API_KEY` | Required if provider is `deepseek` |
| `MENU_IMPORT_MODE` | `live` for real AI import; `mock` without keys |

Check after deploy: `GET https://damigos-crm-api.vercel.app/health` → JSON field `ai.textConfigured: true` when keys are set.

Redeploy both API projects after saving env.

## 3. Migrate + seed (once, from your PC)

```powershell
cd d:\ADC\prosols\damigos_main
$env:DATABASE_URL="postgresql://..."   # Neon URL
npm run db:migrate
npm run db:seed
```

## 4. Verify

```text
GET https://damigos-crm-api.vercel.app/health
GET https://damigos-guest-api.vercel.app/health
```

Expect `"ok": true` and `"database": "configured"`.

Then CRM login: https://damigos-crm-web.vercel.app/start — `9876543210` / `000000` (after seed).

Frontends are already mapped — see [DEPLOY-VERCEL-ALL.md](./DEPLOY-VERCEL-ALL.md).
