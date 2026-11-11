import { and, desc, eq, gte, isNull, sql } from "drizzle-orm";
import { db, restaurants, walletAccounts, walletTransactions } from "@damigos/db";
import { ensureWalletSchema } from "./ensure-wallet-schema.js";

export const WALLET_TOPUP_PACK_PAISE = 99900;
/** S1.1 — one-time Grow wallet gift on first ACTIVE tenant (₹1000). NOT the spend floor below. */
export const WELCOME_CREDIT_PAISE = 100_000;
export const WELCOME_CREDIT_KIND = "WELCOME_CREDIT";
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

function isUniqueViolation(err: unknown): boolean {
  const e = err as { code?: string; cause?: { code?: string } } | null;
  return e?.code === "23505" || e?.cause?.code === "23505";
}

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

  try {
    await db.transaction(async (tx) => {
      // Atomic increment — never overwrite with a stale read-modify-write balance
      await tx
        .update(walletAccounts)
        .set({
          balancePaise: sql`${walletAccounts.balancePaise} + ${input.amountPaise}`,
          updatedAt: new Date(),
        })
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
  } catch (err) {
    // Concurrent replay of the same idempotency key → unique violation rolled the credit back; treat as done
    if (!isUniqueViolation(err)) throw err;
  }

  return getWalletSnapshot(input.restaurantId);
}

let welcomeSchemaReady: Promise<void> | null = null;

export type WelcomeCreditResult = {
  granted: boolean;
  amountPaise: number;
  balancePaise: number | null;
  reason?: "NOT_ACTIVE" | "ALREADY_GRANTED" | "NOT_FOUND";
};

/**
 * S1.1 — credit ₹1000 (100000 paise) WELCOME_CREDIT once per restaurant, only when ACTIVE
 * (hub listed + onboarding completed). Idempotent via `restaurants.welcome_credit_granted_at`
 * (atomic compare-and-set inside the transaction) and a unique ledger idempotency key.
 */
export async function grantWelcomeCreditIfEligible(restaurantId: string): Promise<WelcomeCreditResult> {
  welcomeSchemaReady ??= ensureWalletSchema();
  await welcomeSchemaReady;

  const [row] = await db
    .select({
      hubListed: restaurants.hubListed,
      onboardingCompletedAt: restaurants.onboardingCompletedAt,
      welcomeCreditGrantedAt: restaurants.welcomeCreditGrantedAt,
    })
    .from(restaurants)
    .where(eq(restaurants.id, restaurantId))
    .limit(1);

  if (!row) return { granted: false, amountPaise: 0, balancePaise: null, reason: "NOT_FOUND" };
  if (row.welcomeCreditGrantedAt) {
    return { granted: false, amountPaise: 0, balancePaise: null, reason: "ALREADY_GRANTED" };
  }
  if (!row.hubListed || !row.onboardingCompletedAt) {
    return { granted: false, amountPaise: 0, balancePaise: null, reason: "NOT_ACTIVE" };
  }

  const idempotencyKey = `welcome-credit:${restaurantId}`;

  return db.transaction(async (tx) => {
    // Atomic claim — only one concurrent login/activation wins the flag.
    const [claimed] = await tx
      .update(restaurants)
      .set({ welcomeCreditGrantedAt: new Date() })
      .where(and(eq(restaurants.id, restaurantId), isNull(restaurants.welcomeCreditGrantedAt)))
      .returning({ id: restaurants.id });
    if (!claimed) {
      return { granted: false, amountPaise: 0, balancePaise: null, reason: "ALREADY_GRANTED" as const };
    }

    await tx
      .insert(walletAccounts)
      .values({ restaurantId, balancePaise: 0 })
      .onConflictDoNothing({ target: walletAccounts.restaurantId });
    const [account] = await tx
      .select()
      .from(walletAccounts)
      .where(eq(walletAccounts.restaurantId, restaurantId))
      .limit(1);

    const [dup] = await tx
      .select({ id: walletTransactions.id })
      .from(walletTransactions)
      .where(eq(walletTransactions.idempotencyKey, idempotencyKey))
      .limit(1);
    if (dup) {
      return {
        granted: false,
        amountPaise: 0,
        balancePaise: account.balancePaise,
        reason: "ALREADY_GRANTED" as const,
      };
    }

    const [updated] = await tx
      .update(walletAccounts)
      .set({
        balancePaise: sql`${walletAccounts.balancePaise} + ${WELCOME_CREDIT_PAISE}`,
        updatedAt: new Date(),
      })
      .where(eq(walletAccounts.id, account.id))
      .returning({ balancePaise: walletAccounts.balancePaise });

    await tx.insert(walletTransactions).values({
      walletAccountId: account.id,
      kind: WELCOME_CREDIT_KIND,
      amountPaise: WELCOME_CREDIT_PAISE,
      reference: "welcome_grow_1000",
      meta: stringifyMeta({
        paymentMethod: "wallet",
        totalPaise: WELCOME_CREDIT_PAISE,
        transactionId: idempotencyKey,
        note: "Welcome gift — ₹1000 Grow credit",
      }),
      idempotencyKey,
    });

    return {
      granted: true,
      amountPaise: WELCOME_CREDIT_PAISE,
      balancePaise: updated.balancePaise,
    };
  });
}

export async function debitForCampaign(input: {
  restaurantId: string;
  campaignId: string;
  amountPaise: number;
}): Promise<{ ok: true; balancePaise: number } | { ok: false; balancePaise: number; reason?: string }> {
  const account = await ensureWalletAccount(input.restaurantId);
  const idempotencyKey = `campaign-debit:${input.campaignId}`;

  // Idempotent replay FIRST — a retry after a successful debit must not trip the min-balance floor
  const [dup] = await db
    .select({ id: walletTransactions.id })
    .from(walletTransactions)
    .where(eq(walletTransactions.idempotencyKey, idempotencyKey))
    .limit(1);
  if (dup) {
    return { ok: true, balancePaise: account.balancePaise };
  }

  // Nothing to charge (0 recipients) — no ledger noise, no floor check
  if (input.amountPaise <= 0) {
    return { ok: true, balancePaise: account.balancePaise };
  }

  if (!canDebitLeavingMin(account.balancePaise, input.amountPaise)) {
    return { ok: false, balancePaise: account.balancePaise, reason: "MIN_BALANCE" };
  }

  try {
    return await db.transaction(async (tx) => {
      // Atomic guard: the floor is re-checked inside the UPDATE so concurrent debits cannot overspend
      const [updated] = await tx
        .update(walletAccounts)
        .set({
          balancePaise: sql`${walletAccounts.balancePaise} - ${input.amountPaise}`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(walletAccounts.id, account.id),
            gte(walletAccounts.balancePaise, input.amountPaise + WALLET_MIN_BALANCE_PAISE),
          ),
        )
        .returning({ balancePaise: walletAccounts.balancePaise });
      if (!updated) {
        const [fresh] = await tx
          .select({ balancePaise: walletAccounts.balancePaise })
          .from(walletAccounts)
          .where(eq(walletAccounts.id, account.id))
          .limit(1);
        return {
          ok: false as const,
          balancePaise: fresh?.balancePaise ?? account.balancePaise,
          reason: "MIN_BALANCE",
        };
      }
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
      return { ok: true as const, balancePaise: updated.balancePaise };
    });
  } catch (err) {
    if (!isUniqueViolation(err)) throw err;
    // Concurrent duplicate won the race; its debit stands and ours rolled back
    const fresh = await ensureWalletAccount(input.restaurantId);
    return { ok: true, balancePaise: fresh.balancePaise };
  }
}

/**
 * Refund the unsent portion of a campaign debit (recipients skipped: no phone / send failed).
 * Idempotent via `campaign-refund:<campaignId>`; no-op if the campaign was never debited.
 */
export async function refundUnsentCampaign(input: {
  restaurantId: string;
  campaignId: string;
  sentCount: number;
}): Promise<{ refundedPaise: number }> {
  const account = await ensureWalletAccount(input.restaurantId);
  const [debit] = await db
    .select({ amountPaise: walletTransactions.amountPaise })
    .from(walletTransactions)
    .where(
      and(
        eq(walletTransactions.walletAccountId, account.id),
        eq(walletTransactions.idempotencyKey, `campaign-debit:${input.campaignId}`),
      ),
    )
    .limit(1);
  if (!debit) return { refundedPaise: 0 };

  const debited = Math.abs(debit.amountPaise);
  const refundPaise = Math.max(0, debited - input.sentCount * WHATSAPP_MSG_COST_PAISE);
  if (refundPaise <= 0) return { refundedPaise: 0 };

  const idempotencyKey = `campaign-refund:${input.campaignId}`;
  try {
    await db.transaction(async (tx) => {
      await tx.insert(walletTransactions).values({
        walletAccountId: account.id,
        kind: "campaign_refund",
        amountPaise: refundPaise,
        reference: input.campaignId,
        meta: stringifyMeta({
          paymentMethod: "wallet",
          transactionId: input.campaignId,
          totalPaise: refundPaise,
          note: "Unsent WhatsApp recipients refunded",
        }),
        idempotencyKey,
      });
      await tx
        .update(walletAccounts)
        .set({
          balancePaise: sql`${walletAccounts.balancePaise} + ${refundPaise}`,
          updatedAt: new Date(),
        })
        .where(eq(walletAccounts.id, account.id));
    });
  } catch (err) {
    if (isUniqueViolation(err)) return { refundedPaise: 0 };
    throw err;
  }
  return { refundedPaise: refundPaise };
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

  const meta: WalletTxnMeta = {
    paymentMethod: "wallet",
    batchId: input.batchId,
    batchCode: input.batchCode,
    totalPaise: input.amountPaise,
    transactionId: idempotencyKey,
    note: "Sticker print & ship (wallet)",
    ...input.meta,
  };

  try {
    const result = await db.transaction(async (tx) => {
      // Atomic guard: floor re-checked inside the UPDATE (no stale read-modify-write)
      const [updated] = await tx
        .update(walletAccounts)
        .set({
          balancePaise: sql`${walletAccounts.balancePaise} - ${input.amountPaise}`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(walletAccounts.id, account.id),
            gte(walletAccounts.balancePaise, input.amountPaise + WALLET_MIN_BALANCE_PAISE),
          ),
        )
        .returning({ balancePaise: walletAccounts.balancePaise });
      if (!updated) return null;
      const [row] = await tx
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
      return { balancePaise: updated.balancePaise, txnId: row.id };
    });
    if (!result) {
      const fresh = await ensureWalletAccount(input.restaurantId);
      return { ok: false, balancePaise: fresh.balancePaise, reason: "MIN_BALANCE" };
    }
    return { ok: true, balancePaise: result.balancePaise, txnId: result.txnId };
  } catch (err) {
    if (!isUniqueViolation(err)) throw err;
    return { ok: false, balancePaise: account.balancePaise, reason: "DUPLICATE" };
  }
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
