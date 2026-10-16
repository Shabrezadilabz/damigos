import { aiTextProvider } from "@damigos/domain";
import {
  deepseekChatCompletion,
  deepseekConfigured,
  deepseekTextModel,
  deepseekVisionModel,
  type ChatMessage,
} from "./deepseek-client.js";
import { hiveChatCompletion, hiveConfigured, hiveTextModel } from "./hive-client.js";

export type { ChatMessage };

export function aiTextConfigured(): boolean {
  if (aiTextProvider() === "hive") return hiveConfigured();
  return deepseekConfigured();
}

export function aiTextModel(): string {
  return aiTextProvider() === "hive" ? hiveTextModel() : deepseekTextModel();
}

export function aiVisionModel(): string {
  if (aiTextProvider() === "hive") {
    return process.env.HIVE_VISION_MODEL ?? hiveTextModel();
  }
  return deepseekVisionModel();
}

export async function aiChatCompletion(input: {
  model?: string;
  messages: ChatMessage[];
  maxTokens?: number;
  jsonMode?: boolean;
  thinking?: "enabled" | "disabled";
  timeoutMs?: number;
}): Promise<string> {
  const model = input.model ?? aiTextModel();
  if (aiTextProvider() === "hive" && hiveConfigured()) {
    const hasVision = input.messages.some(
      (m) =>
        m.role === "user" &&
        Array.isArray(m.content) &&
        m.content.some((p) => p.type === "image_url"),
    );
    return hiveChatCompletion({
      model,
      messages: input.messages,
      maxTokens: input.maxTokens,
      jsonMode: hasVision ? false : input.jsonMode,
      timeoutMs: input.timeoutMs,
    });
  }
  return deepseekChatCompletion({ ...input, model });
}
