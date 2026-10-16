# Environments — local, staging, production

All backend apps load **`damigos_main/.env`** via `@damigos/domain` `loadMonorepoEnv()`.

## `DAMIGOS_ENV`

| Value | When |
|--------|------|
| `local` (default) | Dev laptops, `npm run dev` |
| `staging` | Pre-prod host / CI staging |
| `production` | Live kitchens |

Set explicitly in stage/prod host env:

```env
DAMIGOS_ENV=staging
# or
DAMIGOS_ENV=production
```

## DeepSeek (pilot: one key everywhere)

**Do not commit keys.** Set on the server or in local `.env` only.

```env
# Used for local + staging + production unless overrides below are set
DEEPSEEK_API_KEY=

# Optional later split (override per env)
# DEEPSEEK_API_KEY_STAGING=
# DEEPSEEK_API_KEY_PRODUCTION=

DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL_VISION=deepseek-flash
DEEPSEEK_MODEL_TEXT=deepseek-v4-pro

MENU_IMPORT_MODE=mock
POSTER_AI_MODE=mock
POSTER_IMAGE_MODE=svg
```

| Env | Typical `MENU_IMPORT_MODE` | Typical `POSTER_AI_MODE` |
|-----|----------------------------|---------------------------|
| local | `mock` (E2E) or `live` (your key) | `mock` or `live` |
| staging | `live` | `live` |
| production | `live` | `live` |

Code reads modes through `@damigos/domain` (`menuImportMode()`, `posterAiMode()`, `deepseekApiKey()`).

## Frontends

Next.js apps use **`NEXT_PUBLIC_*`** only for API URLs (already in `.env.local.example`). **Never** put `DEEPSEEK_API_KEY` in frontend env.

## CI / GitHub Actions

Inject `DEEPSEEK_API_KEY` as a **repository secret** for staging deploy workflows; E2E should keep `MENU_IMPORT_MODE=mock` and `POSTER_AI_MODE=mock`.
