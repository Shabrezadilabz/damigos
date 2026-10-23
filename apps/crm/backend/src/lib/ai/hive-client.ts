import { hiveApiKey } from "@damigos/domain";
import type { ChatMessage } from "./deepseek-client.js";
import { aiChatTimeoutMs, fetchWithTimeout } from "./ai-fetch-timeout.js";
import {
  hiveMessageHasVision,
  sanitizeMessagesForHive,
  type HiveSafeMessage,
} from "./hive-messages.js";

const HIVE_MAX_CHAT_BODY_CHARS = Number(process.env.HIVE_MAX_CHAT_BODY_CHARS ?? 3_500_000);

export function hiveConfigured(): boolean {
  return Boolean(hiveApiKey());
}

export function hiveTextModel(): string {
  return process.env.HIVE_TEXT_MODEL ?? "deepseek-ai/deepseek-v4.1-flash";
}

export function hiveImageModelPath(): string {
  return process.env.HIVE_IMAGE_MODEL ?? "black-forest-labs/flux-schnell";
}

/** Flux on Hive only accepts specific (height, width) pairs — not 1080×1080. */
const HIVE_ALLOWED_SIZES: { width: number; height: number }[] = [
  { width: 768, height: 1344 },
  { width: 960, height: 1280 },
  { width: 1024, height: 1024 },
  { width: 1280, height: 960 },
  { width: 1344, height: 768 },
];

export function normalizeHiveImageSize(
  width: number,
  height: number,
): { width: number; height: number } {
  const exact = HIVE_ALLOWED_SIZES.find((s) => s.width === width && s.height === height);
  if (exact) return exact;

  const square = width === height;
  if (square) return { width: 1024, height: 1024 };

  const portrait = height > width;
  if (portrait) return { width: 960, height: 1280 };
  return { width: 1280, height: 960 };
}

const HIVE_CHAT_BASE =
  (process.env.HIVE_CHAT_BASE_URL ?? "https://api-cdn.thehive.ai/api/v3").replace(/\/$/, "");

const HIVE_TASK_BASE =
  (process.env.HIVE_TASK_BASE_URL ?? "https://api.thehive.ai/api/v3").replace(/\/$/, "");

/** OpenAI-compatible chat — DeepSeek V4.1 Flash on Hive ([docs](https://docs.thehive.ai/docs/chat-completions-openai-compatible-llms)). */
export async function hiveChatCompletion(input: {
  model?: string;
  messages: ChatMessage[] | HiveSafeMessage[];
  maxTokens?: number;
  jsonMode?: boolean;
  timeoutMs?: number;
}): Promise<string> {
  const apiKey = hiveApiKey();
  if (!apiKey) {
    throw new Error("HIVE_API_KEY is not set (see docs/architecture/HIVE-AI.md)");
  }

  const messages = sanitizeMessagesForHive(input.messages as ChatMessage[]);
  const hasVision = hiveMessageHasVision(messages);
  const useJsonMode = Boolean(input.jsonMode) && !hasVision;

  const body: Record<string, unknown> = {
    model: input.model ?? hiveTextModel(),
    messages,
    max_tokens: input.maxTokens ?? 4096,
    stream: false,
  };
  if (useJsonMode) {
    body.response_format = { type: "json_object" };
  }

  let text = await hiveChatPost(apiKey, body, input.timeoutMs);
  if (!text && useJsonMode) {
    const retryBody = { ...body };
    delete retryBody.response_format;
    text = await hiveChatPost(apiKey, retryBody, input.timeoutMs);
  }

  if (!text?.trim()) {
    const model = input.model ?? hiveTextModel();
    throw new Error(
      `Hive chat returned empty content (model=${model}). ` +
        "Try a clearer menu photo, check Hive credits, or set HIVE_VISION_MODEL to a vision-capable model.",
    );
  }
  return text;
}

async function hiveChatPost(
  apiKey: string,
  body: Record<string, unknown>,
  timeoutMs?: number,
): Promise<string> {
  let payload: string;
  try {
    payload = JSON.stringify(body);
  } catch {
    throw new Error("Could not encode Hive request — menu image may be corrupted; re-upload");
  }
  if (payload.length > HIVE_MAX_CHAT_BODY_CHARS) {
    throw new Error(
      "Menu photo too large for Hive vision API — use a smaller JPG (CRM compresses automatically; try another photo)",
    );
  }

  let res: Response;
  try {
    res = await fetchWithTimeout(
      `${HIVE_CHAT_BASE}/chat/completions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: payload,
      },
      timeoutMs ?? aiChatTimeoutMs(),
    );
  } catch (err) {
    if (err instanceof Error && err.name === "TimeoutError") {
      throw new Error(
        `Hive vision timed out after ${Math.round((timeoutMs ?? aiChatTimeoutMs()) / 1000)}s — retry with a smaller photo`,
      );
    }
    throw err;
  }

  const data = (await res.json()) as HiveChatResponse;

  if (!res.ok) {
    const msg = data.error?.message ?? data.message ?? `Hive chat HTTP ${res.status}`;
    if (/bad json/i.test(msg)) {
      throw new Error(
        `${msg} — Hive rejected the vision payload (usually image too large or unsupported fields). Retry with a smaller menu photo.`,
      );
    }
    throw new Error(msg);
  }

  return extractHiveMessageText(data.choices?.[0]);
}

type HiveContentPart = { type?: string; text?: string };
type HiveChatChoice = {
  finish_reason?: string;
  message?: {
    content?: string | null | HiveContentPart[];
    reasoning_content?: string;
  };
};
type HiveChatResponse = {
  error?: { message?: string };
  message?: string;
  choices?: HiveChatChoice[];
};

function extractHiveMessageText(choice: HiveChatChoice | undefined): string {
  if (!choice?.message) return "";
  const c = choice.message.content;
  if (typeof c === "string" && c.trim()) return c;
  if (Array.isArray(c)) {
    const joined = c
      .map((part) => (typeof part === "string" ? part : (part.text ?? "")))
      .join("")
      .trim();
    if (joined) return joined;
  }
  const reasoning = choice.message.reasoning_content;
  if (typeof reasoning === "string" && reasoning.trim()) return reasoning;
  return "";
}

/** Flux image gen — square posters use 1024×1024 ([Image Generation](https://docs.thehive.ai/docs/image-generation-models)). */
export async function hiveGenerateImages(input: {
  prompt: string;
  width?: number;
  height?: number;
  numImages?: number;
}): Promise<string[]> {
  const apiKey = hiveApiKey();
  if (!apiKey) return [];

  const requestedW = input.width ?? 1024;
  const requestedH = input.height ?? 1024;
  const image_size = normalizeHiveImageSize(requestedW, requestedH);
  const numImages = Math.min(4, Math.max(1, input.numImages ?? 1));

  const modelPath = hiveImageModelPath();
  const res = await fetch(`${HIVE_TASK_BASE}/${modelPath}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      input: {
        prompt: input.prompt,
        image_size,
        num_images: numImages,
        num_inference_steps: Number(process.env.HIVE_IMAGE_STEPS ?? 12),
        output_format: "jpeg",
        output_quality: 90,
      },
    }),
  });

  const data = (await res.json()) as {
    message?: string;
    return_code?: number;
    status?: string | number;
    output?: Array<{ url?: string } | { images?: Array<{ url?: string }> }>;
  };

  if (!res.ok) {
    throw new Error(data.message ?? `Hive image HTTP ${res.status}`);
  }
  if (data.return_code === 451 || data.status === 451) {
    throw new Error("Hive image blocked by moderation — adjust prompt");
  }

  const urls: string[] = [];
  for (const item of data.output ?? []) {
    if ("url" in item && typeof item.url === "string" && item.url) {
      urls.push(item.url);
      continue;
    }
    if ("images" in item && Array.isArray(item.images)) {
      for (const img of item.images) {
        if (typeof img?.url === "string" && img.url) urls.push(img.url);
      }
    }
  }
  return [...new Set(urls)].slice(0, numImages);
}

export async function hiveGenerateImage(input: {
  prompt: string;
  width?: number;
  height?: number;
  numImages?: number;
}): Promise<string | null> {
  const urls = await hiveGenerateImages(input);
  return urls[0] ?? null;
}
