import { desc, eq } from "drizzle-orm";
import { db, walletAccounts, walletTransactions } from "@damigos/db";

export const WALLET_TOPUP_PACK_PAISE = 99900;
/** Soft low-balance cue in UI */
export const WALLET_LOW_BALANCE_PAISE = 100_000;
/** Hard floor — balance must stay ≥ ₹1000 after wallet debits */
export const WALLET_MIN_BALANCE_PAISE = 100_000;
export const WHATSAPP_MSG_COST_PAISE = 250;

export type WalletTxnMeta = {
  paymentMethod?: "wallet" | "razorpay" | "stub" | "external";
  razorpayOrderId?: string | null;
  razorpayPaymentId?: string | null;
  razorpaySignature?: string | null;
  utr?: string | null;
  transactionId?: string | null;
  orderId?: string | null;
  batchId?: string | null;
  batchCode?: string | null;
  quantity?: number | null;
  designName?: string | null;
  stickersPaise?: number | null;
  deliveryPaise?: number | null;
  gstPaise?: number | null;
  totalPaise?: number | null;
  note?: string | null;
  [key: string]: unknown;
};

function stringifyMeta(meta?: WalletTxnMeta | null) {
  if (!meta) return null;
  return JSON.stringify(meta);
}

function parseMeta(raw: string | null): WalletTxnMeta | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as WalletTxnMeta;
  } catch {
    return null;
  }
}

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

export function canDebitLeavingMin(balancePaise: number, amountPaise: number) {
  return balancePaise - amountPaise >= WALLET_MIN_BALANCE_PAISE;
}

export async function getWalletSnapshot(restaurantId: string) {
  const account = await ensureWalletAccount(restaurantId);
  const ledger = await db
    .select({
      id: walletTransactions.id,
      kind: walletTransactions.kind,
      amountPaise: walletTransactions.amountPaise,
      reference: walletTransactions.reference,
      meta: walletTransactions.meta,
      createdAt: walletTransactions.createdAt,
    })
    .from(walletTransactions)
    .where(eq(walletTransactions.walletAccountId, account.id))
    .orderBy(desc(walletTransactions.createdAt))
    .limit(50);

  return {
    balancePaise: account.balancePaise,
    approxBroadcastCredits: Math.floor(account.balancePaise / WHATSAPP_MSG_COST_PAISE),
    msgCostPaise: WHATSAPP_MSG_COST_PAISE,
    minBalancePaise: WALLET_MIN_BALANCE_PAISE,
    lowBalance: account.balancePaise < WALLET_LOW_BALANCE_PAISE,
    spendablePaise: Math.max(0, account.balancePaise - WALLET_MIN_BALANCE_PAISE),
    ledger: ledger.map((row) => ({
      id: row.id,
      kind: row.kind,
      amountPaise: row.amountPaise,
      reference: row.reference,
      meta: parseMeta(row.meta),
      createdAt: row.createdAt.toISOString(),
    })),
  };
}

export async function creditTopUp(input: {
  restaurantId: string;
  amountPaise: number;
  idempotencyKey: string;
  meta?: WalletTxnMeta;
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
  const meta: WalletTxnMeta = {
    paymentMethod: input.meta?.paymentMethod ?? "stub",
    orderId: input.meta?.orderId ?? input.meta?.razorpayOrderId ?? null,
    razorpayOrderId: input.meta?.razorpayOrderId ?? null,
    razorpayPaymentId: input.meta?.razorpayPaymentId ?? null,
    transactionId: input.meta?.transactionId ?? input.meta?.razorpayPaymentId ?? null,
    utr: input.meta?.utr ?? input.meta?.razorpayPaymentId ?? null,
    totalPaise: input.amountPaise,
    note: input.meta?.note ?? "Wallet top-up",
    ...input.meta,
  };

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
      meta: stringifyMeta(meta),
      idempotencyKey: input.idempotencyKey,
    });
  });

  return getWalletSnapshot(input.restaurantId);
}

export async function debitForCampaign(input: {
  restaurantId: string;
  campaignId: string;
  amountPaise: number;
}): Promise<{ ok: true; balancePaise: number } | { ok: false; balancePaise: number; reason?: string }> {
  const account = await ensureWalletAccount(input.restaurantId);
  if (!canDebitLeavingMin(account.balancePaise, input.amountPaise)) {
    return {
      ok: false,
      balancePaise: account.balancePaise,
      reason: "MIN_BALANCE",
    };
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
      meta: stringifyMeta({
        paymentMethod: "wallet",
        transactionId: input.campaignId,
        totalPaise: input.amountPaise,
        note: "WhatsApp campaign debit",
      }),
      idempotencyKey,
    });
  });

  return { ok: true, balancePaise: newBalance };
}

/** Debit wallet for sticker print (must leave ≥ ₹1000). */
export async function debitForStickerPrint(input: {
  restaurantId: string;
  batchId: string;
  batchCode: string;
  amountPaise: number;
  meta?: WalletTxnMeta;
}): Promise<
  | { ok: true; balancePaise: number; txnId: string }
  | { ok: false; balancePaise: number; reason: "INSUFFICIENT" | "MIN_BALANCE" | "DUPLICATE" }
> {
  const account = await ensureWalletAccount(input.restaurantId);
  if (account.balancePaise < input.amountPaise) {
    return { ok: false, balancePaise: account.balancePaise, reason: "INSUFFICIENT" };
  }
  if (!canDebitLeavingMin(account.balancePaise, input.amountPaise)) {
    return { ok: false, balancePaise: account.balancePaise, reason: "MIN_BALANCE" };
  }

  const idempotencyKey = `sticker-print-wallet:${input.batchId}`;
  const [dup] = await db
    .select({ id: walletTransactions.id })
    .from(walletTransactions)
    .where(eq(walletTransactions.idempotencyKey, idempotencyKey))
    .limit(1);
  if (dup) {
    return { ok: false, balancePaise: account.balancePaise, reason: "DUPLICATE" };
  }

  const newBalance = account.balancePaise - input.amountPaise;
  const meta: WalletTxnMeta = {
    paymentMethod: "wallet",
    batchId: input.batchId,
    batchCode: input.batchCode,
    totalPaise: input.amountPaise,
    transactionId: idempotencyKey,
    note: "Sticker print & ship (wallet)",
    ...input.meta,
  };

  const [row] = await db.transaction(async (tx) => {
    await tx
      .update(walletAccounts)
      .set({ balancePaise: newBalance, updatedAt: new Date() })
      .where(eq(walletAccounts.id, account.id));
    return tx
      .insert(walletTransactions)
      .values({
        walletAccountId: account.id,
        kind: "sticker_print",
        amountPaise: -input.amountPaise,
        reference: input.batchCode,
        meta: stringifyMeta(meta),
        idempotencyKey,
      })
      .returning({ id: walletTransactions.id });
  });

  return { ok: true, balancePaise: newBalance, txnId: row.id };
}

/** Record external (Razorpay/stub) sticker payment in ledger without changing balance. */
export async function recordStickerPrintPayment(input: {
  restaurantId: string;
  batchId: string;
  batchCode: string;
  amountPaise: number;
  meta?: WalletTxnMeta;
}): Promise<{ txnId: string }> {
  const account = await ensureWalletAccount(input.restaurantId);
  const idempotencyKey = `sticker-print-ext:${input.batchId}:${input.meta?.razorpayPaymentId ?? input.meta?.transactionId ?? "pay"}`;
  const [dup] = await db
    .select({ id: walletTransactions.id })
    .from(walletTransactions)
    .where(eq(walletTransactions.idempotencyKey, idempotencyKey))
    .limit(1);
  if (dup) return { txnId: dup.id };

  const meta: WalletTxnMeta = {
    paymentMethod: input.meta?.paymentMethod ?? "external",
    batchId: input.batchId,
    batchCode: input.batchCode,
    totalPaise: input.amountPaise,
    orderId: input.meta?.orderId ?? input.meta?.razorpayOrderId ?? null,
    transactionId: input.meta?.transactionId ?? input.meta?.razorpayPaymentId ?? null,
    utr: input.meta?.utr ?? input.meta?.razorpayPaymentId ?? null,
    razorpayOrderId: input.meta?.razorpayOrderId ?? null,
    razorpayPaymentId: input.meta?.razorpayPaymentId ?? null,
    note: "Sticker print & ship (paid)",
    ...input.meta,
  };

  const [row] = await db
    .insert(walletTransactions)
    .values({
      walletAccountId: account.id,
      kind: "sticker_print_paid",
      /** Display as spend; does not change wallet_accounts.balance */
      amountPaise: -input.amountPaise,
      reference: input.batchCode,
      meta: stringifyMeta(meta),
      idempotencyKey,
    })
    .returning({ id: walletTransactions.id });

  return { txnId: row.id };
}
