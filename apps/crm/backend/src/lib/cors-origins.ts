/** Comma-separated list, or `*` for pilot (reflect request Origin). */
export function resolveCorsOrigin(envValue: string | undefined, fallback: string): boolean | string | string[] {
  const raw = envValue?.trim();
  if (raw === "*") return true;
  if (raw) {
    const list = raw.split(",").map((s) => s.trim()).filter(Boolean);
    if (list.length === 1) return list[0]!;
    if (list.length > 1) return list;
  }
  return fallback;
}
