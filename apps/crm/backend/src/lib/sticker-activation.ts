/** S2.5 — sticker validity window (days) enforced on mint, generate and activation. */
export const STICKER_VALID_DAYS_MIN = 10;
export const STICKER_VALID_DAYS_MAX = 15;

function isProductionRuntime(): boolean {
  return process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production";
}

/**
 * Owner "Generate" may auto-activate the batch ONLY for testing:
 * - STICKER_AUTO_ACTIVATE=true  → allowed (explicit opt-in, any env)
 * - STICKER_AUTO_ACTIVATE=false → never
 * - unset                        → allowed in non-production only; production requires explicit activate
 */
export function stickerAutoActivateAllowed(): boolean {
  const flag = process.env.STICKER_AUTO_ACTIVATE?.trim().toLowerCase();
  if (flag === "true" || flag === "1") return true;
  if (flag === "false" || flag === "0") return false;
  return !isProductionRuntime();
}

/**
 * Activation starts the validity clock: keep the batch's original window length
 * (clamped to 10–15 days) and re-base validTo on the activation time, so a batch
 * activated days after minting is not silently shortened below 10 days.
 */
export function rebaseValidityOnActivation(
  validFrom: Date,
  validTo: Date,
  activatedAt: Date,
): { validFrom: Date; validTo: Date } {
  const windowDays = Math.round((validTo.getTime() - validFrom.getTime()) / 86_400_000);
  const days = Math.min(STICKER_VALID_DAYS_MAX, Math.max(STICKER_VALID_DAYS_MIN, windowDays));
  const nextTo = new Date(activatedAt);
  nextTo.setDate(nextTo.getDate() + days);
  return { validFrom: activatedAt, validTo: nextTo };
}
