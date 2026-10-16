# Hive AI (thehive.ai) — D'aMigo's pilot

Hive is **not** the same as calling `api.deepseek.com` directly. Many keys from [Hive portal](https://portal.thehive.ai/signup) are **V3 Service API Keys** used as `Authorization: Bearer …` on Hive hosts.

Docs index: [docs.thehive.ai/llms.txt](https://docs.thehive.ai/llms.txt) · [Getting Started](https://docs.thehive.ai/docs/getting-started)

## What we use Hive for

| Feature | Hive product | Env |
|---------|----------------|-----|
| Menu image → dishes + brand colors | Chat Completions, model `deepseek-ai/deepseek-v4.1-flash` (vision) | `AI_TEXT_PROVIDER=hive`, `MENU_IMPORT_MODE=live` |
| Poster copy JSON | Same chat API | `POSTER_AI_MODE=live` |
| Poster **photo-style** background | [Image Generation](https://docs.thehive.ai/docs/image-generation-models) e.g. Flux Schnell | `POSTER_IMAGE_PROVIDER=hive` |

Flux only accepts fixed sizes (e.g. **1024×1024** for square — not 1080×1080). The API normalizes dimensions; the studio preview composites the JPEG **under** headline/offer text.

When Hive image gen fails or is off, CRM still renders **SVG** layout (`POSTER_IMAGE_PROVIDER=svg`).

## Env (local / staging / production)

Same pattern as [ENVIRONMENTS.md](./ENVIRONMENTS.md) — keys only in host `.env`, never commit.

```env
AI_TEXT_PROVIDER=hive
HIVE_API_KEY=your-v3-service-key
# Optional: keep legacy name (hiveApiKey() falls back to DEEPSEEK_API_KEY)
# DEEPSEEK_API_KEY=

HIVE_TEXT_MODEL=deepseek-ai/deepseek-v4.1-flash
HIVE_VISION_MODEL=deepseek-ai/deepseek-v4.1-flash
HIVE_CHAT_BASE_URL=https://api-cdn.thehive.ai/api/v3

POSTER_IMAGE_PROVIDER=hive
HIVE_IMAGE_MODEL=black-forest-labs/flux-schnell
HIVE_TASK_BASE_URL=https://api.thehive.ai/api/v3

MENU_IMPORT_MODE=live
POSTER_AI_MODE=live
```

Direct DeepSeek (no Hive): `AI_TEXT_PROVIDER=deepseek` + `DEEPSEEK_API_KEY=sk-…` on `DEEPSEEK_BASE_URL`.

## Code

- `@damigos/domain` — `hiveApiKey()`, `aiTextProvider()`, `posterImageProvider()`
- `apps/crm/backend/src/lib/ai/hive-client.ts` — chat + Flux image
- `apps/crm/backend/src/lib/ai/ai-text.ts` — routes text/vision to Hive or DeepSeek

Restart **CRM API (4001)** after changing env.

## Moderation

Hive image models run [text + visual moderation](https://docs.thehive.ai/docs/image-generation-models) by default; blocked prompts return HTTP 451-style payloads — adjust food/offer wording if needed.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|----------------|-----|
| **Hive chat returned empty content** | `response_format: json_object` not supported for vision on your model; zero balance; `finish_reason=content_filter` | CRM retries without JSON mode automatically. Use a clear menu JPG (&lt;2MB), confirm credits in [Hive portal](https://portal.thehive.ai), set `HIVE_VISION_MODEL=deepseek-ai/deepseek-v4.1-flash`. |
| **Received bad JSON request** | Hive rejects vision body (JSON mode + image, `detail: high`, or payload too large) | CRM now strips unsupported fields and disables JSON mode for photos. Re-upload after restart API; photos compress to 1280px JPEG. |
| **Model did not return valid JSON** | Vision model replied with prose/markdown instead of strict JSON | CRM extracts `{…}` from text, then runs a text-only JSON repair pass. Retry upload; use one clear menu page in the photo. |
| **Planning prose** (“We need… JSON…”) | Some Hive vision models plan aloud instead of answering | CRM runs **transcribe → local line parser → text JSON repair**, then auto-retries with **DeepSeek vision** if Hive failed and `DEEPSEEK_API_KEY` is set. Or set `MENU_IMPORT_VISION_PROVIDER=deepseek`. |
| **Could not parse menu from AI output** | All passes failed (blur, multi-page, or model never listed dishes) | One menu page, good light; restart API; `MENU_IMPORT_VISION_PROVIDER=deepseek`; crop so names + ₹ prices are readable. |
| Import stuck at 30–34% | Vision call in flight (normal 30–120s) | Wait for centered loader; on failure read red error under Menu header. |
