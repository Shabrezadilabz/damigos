import { desc, eq } from "drizzle-orm";
import { db, walletAccounts, walletTransactions } from "@damigos/db";

export const WALLET_TOPUP_PACK_PAISE = 99900;
export const WALLET_LOW_BALANCE_PAISE = 25_000;
export const WHATSAPP_MSG_COST_PAISE = 250;

export async function ensureWalletAccount(restaurantId: string) {
  const [existing] = await db
    .select()
    .from(walletAccounts)
    .where(eq(walletAccounts.restaurantId, restaurantId))
    .limit(1);
  if (existing) return existing;

  const [created] = await db
    .insert(walletAccounts)
    .values({ restaurantId, balancePaise: 0 })
    .returning();
  return created;
}

export async function getWalletSnapshot(restaurantId: string) {
  const account = await ensureWalletAccount(restaurantId);
  const ledger = await db
    .select({
      id: walletTransactions.id,
      kind: walletTransactions.kind,
      amountPaise: walletTransactions.amountPaise,
      reference: walletTransactions.reference,
      createdAt: walletTransactions.createdAt,
    })
    .from(walletTransactions)
    .where(eq(walletTransactions.walletAccountId, account.id))
    .orderBy(desc(walletTransactions.createdAt))
    .limit(20);

  return {
    balancePaise: account.balancePaise,
    /** Approx WhatsApp broadcast sends remaining at WHATSAPP_MSG_COST_PAISE */
    approxBroadcastCredits: Math.floor(account.balancePaise / WHATSAPP_MSG_COST_PAISE),
    msgCostPaise: WHATSAPP_MSG_COST_PAISE,
    lowBalance: account.balancePaise < WALLET_LOW_BALANCE_PAISE,
    ledger: ledger.map((row) => ({
      id: row.id,
      kind: row.kind,
      amountPaise: row.amountPaise,
      reference: row.reference,
      createdAt: row.createdAt.toISOString(),
    })),
  };
}

export async function creditTopUp(input: {
  restaurantId: string;
  amountPaise: number;
  idempotencyKey: string;
}) {
  const [dup] = await db
    .select({ id: walletTransactions.id })
    .from(walletTransactions)
    .where(eq(walletTransactions.idempotencyKey, input.idempotencyKey))
    .limit(1);
  if (dup) {
    return getWalletSnapshot(input.restaurantId);
  }

  const account = await ensureWalletAccount(input.restaurantId);
  const newBalance = account.balancePaise + input.amountPaise;

  await db.transaction(async (tx) => {
    await tx
      .update(walletAccounts)
      .set({ balancePaise: newBalance, updatedAt: new Date() })
      .where(eq(walletAccounts.id, account.id));
    await tx.insert(walletTransactions).values({
      walletAccountId: account.id,
      kind: "topup",
      amountPaise: input.amountPaise,
      reference: `pack_${Math.round(input.amountPaise / 100)}`,
      idempotencyKey: input.idempotencyKey,
    });
  });

  return getWalletSnapshot(input.restaurantId);
}

export async function debitForCampaign(input: {
  restaurantId: string;
  campaignId: string;
  amountPaise: number;
}): Promise<{ ok: true; balancePaise: number } | { ok: false; balancePaise: number }> {
  const account = await ensureWalletAccount(input.restaurantId);
  if (account.balancePaise < input.amountPaise) {
    return { ok: false, balancePaise: account.balancePaise };
  }

  const idempotencyKey = `campaign-debit:${input.campaignId}`;
  const [dup] = await db
    .select({ id: walletTransactions.id })
    .from(walletTransactions)
    .where(eq(walletTransactions.idempotencyKey, idempotencyKey))
    .limit(1);
  if (dup) {
    return { ok: true, balancePaise: account.balancePaise };
  }

  const newBalance = account.balancePaise - input.amountPaise;
  await db.transaction(async (tx) => {
    await tx
      .update(walletAccounts)
      .set({ balancePaise: newBalance, updatedAt: new Date() })
      .where(eq(walletAccounts.id, account.id));
    await tx.insert(walletTransactions).values({
      walletAccountId: account.id,
      kind: "campaign_debit",
      amountPaise: -input.amountPaise,
      reference: input.campaignId,
      idempotencyKey,
    });
  });

  return { ok: true, balancePaise: newBalance };
}
