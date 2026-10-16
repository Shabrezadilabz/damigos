# DeepSeek AI — menu scrape, brand kit, posters

**Never commit `DEEPSEEK_API_KEY`.** Set it only in local `.env` at `damigos_main` repo root (loaded by CRM/guest APIs via `@damigos/domain`).

## Model map (recommended)

| Use case | Model | Why |
|----------|--------|-----|
| Menu photo / PDF screenshot → dishes, prices, veg, logo, colors, name | `deepseek-flash` | Official vision + long context ([Vision guide](https://api-docs.deepseek.com/guides/vision)) |
| Poster layout copy, headline/offer polish, JSON spec (no pixels) | `deepseek-v4-pro` | Strong text/JSON; **no image input** |
| Fast structured JSON only (fallback) | `deepseek-flash` with `thinking: disabled` | Cheaper when image already OCR’d |

Override via env:

```env
DEEPSEEK_API_KEY=your-key-here
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL_VISION=deepseek-flash
DEEPSEEK_MODEL_TEXT=deepseek-v4-pro
MENU_IMPORT_MODE=live
POSTER_AI_MODE=live
```

- `MENU_IMPORT_MODE=mock` — demo draft rows (E2E, no key).
- `MENU_IMPORT_MODE=live` — requires `DEEPSEEK_API_KEY` + menu import with `imageBase64` (or data URL).
- `POSTER_AI_MODE=mock` — text-only preview lines (E2E).
- `POSTER_AI_MODE=live` — **deepseek-v4-pro** → JSON (headline, offer, food hero line, image mood, colors) + **1080×1080 SVG poster image** (`POSTER_IMAGE_MODE=svg`) with branded background and explicit food-offer copy.
- DeepSeek does **not** emit photographic pixels; the “food feel” is AI-directed layout + mood text rendered into SVG. For photo-real posters later, add `POSTER_IMAGE_PROVIDER=…` (e.g. Flux/DALL·E) using the same `imageMood` / `foodHeroLine` prompts.

Env resolution: `@damigos/domain` → `deepseekApiKey()`, `damigosEnv()` — see [ENVIRONMENTS.md](./ENVIRONMENTS.md).

**Hive (thehive.ai):** If your key is from [Hive portal](https://docs.thehive.ai/docs/getting-started) (V3 Service API Key), use [HIVE-AI.md](./HIVE-AI.md) — `AI_TEXT_PROVIDER=hive`, not `api.deepseek.com`.

## Brand kit JSON (`restaurants.brand_kit`)

Stored after a successful vision extract:

- `displayName`, `primaryColor`, `backgroundColor`, `accentColor` (hex)
- `logoDataUrl` (optional inline PNG/JPEG from crop description — future: CDN URL)
- `dishes[]` with name, description, pricePaise, isVeg, confidence

Guest spin/scratch UI reads brand kit from `GET /v1/restaurants/:id/menu` → `restaurant.brand`.

## Security

- Keys only in `.env` / secret manager in production.
- Do not log prompts containing full base64 images.
- Rate-limit live import in production (not implemented in pilot).
