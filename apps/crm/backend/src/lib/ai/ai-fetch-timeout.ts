export function aiChatTimeoutMs(): number {
  const raw = process.env.MENU_IMPORT_VISION_TIMEOUT_MS ?? process.env.AI_CHAT_TIMEOUT_MS ?? "120000";
  const n = Number(raw);
  return Number.isFinite(n) && n > 10_000 ? n : 120_000;
}

export async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs = aiChatTimeoutMs(),
): Promise<Response> {
  const signal = AbortSignal.timeout(timeoutMs);
  return fetch(url, { ...init, signal });
}
