/** Soft refresh for CRM client panels (header sync / ⌘K actions). */
const EVENT = "damigos:crm-refresh";

export function emitCrmRefresh() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function subscribeCrmRefresh(handler: () => void) {
  if (typeof window === "undefined") return () => undefined;
  const fn = () => handler();
  window.addEventListener(EVENT, fn);
  return () => window.removeEventListener(EVENT, fn);
}
