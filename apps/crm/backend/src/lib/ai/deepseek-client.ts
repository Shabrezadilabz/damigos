export type ChatMessage =
  | { role: "system" | "user" | "assistant"; content: string }
  | {
      role: "user";
      content: Array<
        | { type: "text"; text: string }
        | { type: "image_url"; image_url: { url: string } }
      >;
    };

import { deepseekApiKey } from "@damigos/domain";
import { aiChatTimeoutMs, fetchWithTimeout } from "./ai-fetch-timeout.js";

export function deepseekConfigured(): boolean {
  return Boolean(deepseekApiKey());
}

export function deepseekVisionModel(): string {
  return process.env.DEEPSEEK_MODEL_VISION ?? "deepseek-flash";
}

export function deepseekTextModel(): string {
  return process.env.DEEPSEEK_MODEL_TEXT ?? "deepseek-v4-pro";
}

export async function deepseekChatCompletion(input: {
  model: string;
  messages: ChatMessage[];
  maxTokens?: number;
  jsonMode?: boolean;
  thinking?: "enabled" | "disabled";
  timeoutMs?: number;
}): Promise<string> {
  const apiKey = deepseekApiKey();
  if (!apiKey) {
    throw new Error("DEEPSEEK_API_KEY is not set (see docs/architecture/ENVIRONMENTS.md)");
  }

  const base = (process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com").replace(/\/$/, "");
  const body: Record<string, unknown> = {
    model: input.model,
    messages: input.messages,
    max_tokens: input.maxTokens ?? 4096,
    stream: false,
  };
  if (input.jsonMode) {
    body.response_format = { type: "json_object" };
  }
  if (input.thinking) {
    body.thinking = { type: input.thinking };
  }

  let res: Response;
  try {
    res = await fetchWithTimeout(
      `${base}/chat/completions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      },
      input.timeoutMs ?? aiChatTimeoutMs(),
    );
  } catch (err) {
    if (err instanceof Error && err.name === "TimeoutError") {
      throw new Error(`DeepSeek vision timed out after ${Math.round((input.timeoutMs ?? aiChatTimeoutMs()) / 1000)}s`);
    }
    throw err;
  }

  const data = (await res.json()) as {
    error?: { message?: string };
    choices?: { message?: { content?: string } }[];
  };

  if (!res.ok) {
    throw new Error(data.error?.message ?? `DeepSeek HTTP ${res.status}`);
  }

  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error("DeepSeek returned empty content");
  return text;
}

function extractJsonObjectSubstring(text: string): string | null {
  const start = text.indexOf("{");
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < text.length; i += 1) {
    const ch = text[i]!;
    if (inString) {
      if (escape) escape = false;
      else if (ch === "\\") escape = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

function loosenJsonForParse(json: string): string {
  return json
    .replace(/^\uFEFF/, "")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/,\s*([}\]])/g, "$1");
}

function tryParseJson(candidate: string): unknown | null {
  const variants = [candidate, loosenJsonForParse(candidate)];
  for (const v of variants) {
    try {
      return JSON.parse(v);
    } catch {
      /* next variant */
    }
  }
  return null;
}

/** Pull JSON object from model output (raw JSON, fences, or prose wrapping `{...}`). */
export function parseJsonFromModel(text: string): unknown {
  const trimmed = text.trim();
  const candidates: string[] = [trimmed];

  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence?.[1]) candidates.push(fence[1].trim());

  const objectSlice = extractJsonObjectSubstring(trimmed);
  if (objectSlice) candidates.push(objectSlice);

  for (const c of candidates) {
    const parsed = tryParseJson(c);
    if (parsed !== null) return parsed;
  }

  throw new Error("Model did not return valid JSON");
}
