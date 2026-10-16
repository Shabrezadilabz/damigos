/** Pilot / testing — accept OTP_BYPASS_CODE and common 5-digit shorthand (00000 → 000000). */
export function isOtpBypassCode(code: string): boolean {
  const entered = code.replace(/\D/g, "");
  if (!entered) return false;

  const bypass = (process.env.OTP_BYPASS_CODE ?? "000000").replace(/\D/g, "");
  if (entered === bypass) return true;

  const six = entered.padStart(6, "0").slice(-6);
  const bypassSix = bypass.padStart(6, "0").slice(-6);
  return six === bypassSix;
}
