import { sql } from "drizzle-orm";
import { db } from "@damigos/db";

/** Wallet ledger meta (UTR / Razorpay ids / sticker payment refs). */
export async function ensureWalletSchema() {
  try {
    await db.execute(sql`ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS meta text`);
  } catch (err) {
    console.warn("[ensure-wallet-schema]", err);
  }
}
