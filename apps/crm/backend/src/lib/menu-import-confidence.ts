export function lowImportConfidenceThreshold(): number {
  const n = Number(process.env.MENU_IMPORT_LOW_CONFIDENCE ?? 70);
  return Number.isFinite(n) ? Math.min(100, Math.max(0, Math.floor(n))) : 70;
}

export function isLowImportConfidence(score: number | null | undefined): boolean {
  if (score == null) return false;
  return score < lowImportConfidenceThreshold();
}
