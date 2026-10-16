export type DamigosEnv = "local" | "staging" | "production";

/** DAMIGOS_ENV wins; else NODE_ENV=production → production, else local */
export function damigosEnv(): DamigosEnv {
  const explicit = process.env.DAMIGOS_ENV?.trim().toLowerCase();
  if (explicit === "production" || explicit === "prod") return "production";
  if (explicit === "staging" || explicit === "stage") return "staging";
  if (process.env.NODE_ENV === "production" && !explicit) return "production";
  return "local";
}

/**
 * Single DeepSeek key for local, staging, and production (pilot).
 * Later: DEEPSEEK_API_KEY_STAGING / _PRODUCTION overrides per env.
 */
export function deepseekApiKey(): string | undefined {
  const env = damigosEnv();
  if (env === "staging" && process.env.DEEPSEEK_API_KEY_STAGING?.trim()) {
    return process.env.DEEPSEEK_API_KEY_STAGING.trim();
  }
  if (env === "production" && process.env.DEEPSEEK_API_KEY_PRODUCTION?.trim()) {
    return process.env.DEEPSEEK_API_KEY_PRODUCTION.trim();
  }
  return process.env.DEEPSEEK_API_KEY?.trim();
}

export function menuImportMode(): "mock" | "live" {
  return process.env.MENU_IMPORT_MODE === "live" ? "live" : "mock";
}

export function posterAiMode(): "mock" | "live" {
  return process.env.POSTER_AI_MODE === "live" ? "live" : "mock";
}

/** @deprecated use posterImageProvider */
export function posterImageMode(): "none" | "svg" {
  const p = posterImageProvider();
  if (p === "none") return "none";
  return "svg";
}

/** Poster raster: local SVG layout, or Hive Flux (see docs/architecture/HIVE-AI.md). */
export function posterImageProvider(): "none" | "svg" | "hive" {
  const explicit = process.env.POSTER_IMAGE_PROVIDER?.trim().toLowerCase();
  if (explicit === "hive") return "hive";
  if (explicit === "none") return "none";
  const legacy = process.env.POSTER_IMAGE_MODE?.trim().toLowerCase();
  if (legacy === "none") return "none";
  if (legacy === "hive") return "hive";
  return "svg";
}

/** Hive V3 key — [Getting Started](https://docs.thehive.ai/docs/getting-started). Pilot: falls back to DEEPSEEK_API_KEY slot. */
export function hiveApiKey(): string | undefined {
  const env = damigosEnv();
  if (env === "staging" && process.env.HIVE_API_KEY_STAGING?.trim()) {
    return process.env.HIVE_API_KEY_STAGING.trim();
  }
  if (env === "production" && process.env.HIVE_API_KEY_PRODUCTION?.trim()) {
    return process.env.HIVE_API_KEY_PRODUCTION.trim();
  }
  const explicit = process.env.HIVE_API_KEY?.trim();
  if (explicit) return explicit;
  return deepseekApiKey();
}

/** Text + vision: Hive OpenAI-compatible chat, or direct DeepSeek API. */
export function aiTextProvider(): "hive" | "deepseek" {
  const p = process.env.AI_TEXT_PROVIDER?.trim().toLowerCase();
  if (p === "deepseek") return "deepseek";
  if (p === "hive") return "hive";
  if (process.env.HIVE_API_KEY?.trim()) return "hive";
  return "deepseek";
}
