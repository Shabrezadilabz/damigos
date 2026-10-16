/** Platform ops key required to mint sticker batches (admin only). */
export function verifyStickerOpsKey(provided: string | undefined): boolean {
  const expected =
    process.env.STICKER_OPS_MINT_KEY?.trim() ||
    (process.env.NODE_ENV !== "production" ? "DEV-STICKER-OPS-KEY" : "");
  if (!expected) return false;
  return (provided ?? "").trim() === expected;
}
