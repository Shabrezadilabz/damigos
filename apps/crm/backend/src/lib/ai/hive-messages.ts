import type { ChatMessage } from "./deepseek-client.js";

type HivePart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

export type HiveSafeMessage =
  | { role: "system" | "user" | "assistant"; content: string }
  | { role: "user"; content: HivePart[] };

export function hiveMessageHasVision(messages: HiveSafeMessage[]): boolean {
  return messages.some(
    (m) =>
      m.role === "user" &&
      Array.isArray(m.content) &&
      m.content.some((p) => p.type === "image_url"),
  );
}

/** Hive chat API is strict — strip unsupported OpenAI fields and fold system into vision user text. */
export function sanitizeMessagesForHive(messages: ChatMessage[]): HiveSafeMessage[] {
  let systemPrefix = "";
  const out: HiveSafeMessage[] = [];

  for (const m of messages) {
    if (m.role === "system" && typeof m.content === "string") {
      systemPrefix += `${m.content.trim()}\n\n`;
      continue;
    }

    if (m.role === "user" && Array.isArray(m.content)) {
      const parts: HivePart[] = m.content.map((part, idx) => {
        if (part.type === "text") {
          const text =
            idx === 0 && systemPrefix ? `${systemPrefix}${part.text}` : part.text;
          return { type: "text", text };
        }
        const url = part.image_url?.url?.trim();
        if (!url) {
          throw new Error("Menu image URL missing — re-upload the photo");
        }
        return { type: "image_url", image_url: { url } };
      });
      systemPrefix = "";
      out.push({ role: "user", content: parts });
      continue;
    }

    if (typeof m.content === "string") {
      const content =
        m.role === "user" && systemPrefix ? `${systemPrefix}${m.content}` : m.content;
      if (m.role === "user") systemPrefix = "";
      out.push({ role: m.role, content });
    }
  }

  if (out.length === 0) {
    throw new Error("No messages to send to Hive");
  }
  return out;
}
