import { sql } from "drizzle-orm";
import { db } from "@damigos/db";

/** Wallet ledger meta (UTR / Razorpay ids / sticker payment refs) + S1.1 welcome-credit flag. */
export async function ensureWalletSchema() {
  try {
    await db.execute(sql`ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS meta text`);
    await db.execute(
      sql`ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS welcome_credit_granted_at timestamptz`,
    );
  } catch (err) {
    console.warn("[ensure-wallet-schema]", err);
  }
}
