import { and, desc, eq, gt, isNull, or } from "drizzle-orm";
import { db, sparkPlaySessions } from "@damigos/db";
import { normalizeWaPhone } from "./kapso.js";

const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

export function playPathFor(restaurantId: string, scanId?: string | null) {
  return `/r/${restaurantId}${scanId ? `?scan=${scanId}` : ""}`;
}

export async function upsertSparkPlaySession(input: {
  restaurantId: string;
  scanEventId?: string | null;
  phoneE164?: string | null;
  playPath?: string;
}) {
  const playPath = input.playPath ?? playPathFor(input.restaurantId, input.scanEventId);
  const phone = input.phoneE164 ? normalizeWaPhone(input.phoneE164) : null;
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  if (phone) {
    const [existing] = await db
      .select()
      .from(sparkPlaySessions)
      .where(
        and(
          eq(sparkPlaySessions.phoneE164, phone),
          eq(sparkPlaySessions.restaurantId, input.restaurantId),
          eq(sparkPlaySessions.status, "pending"),
          gt(sparkPlaySessions.expiresAt, new Date()),
        ),
      )
      .orderBy(desc(sparkPlaySessions.createdAt))
      .limit(1);
    if (existing) {
      const [updated] = await db
        .update(sparkPlaySessions)
        .set({
          scanEventId: input.scanEventId ?? existing.scanEventId,
          playPath,
          expiresAt,
          phoneE164: phone,
        })
        .where(eq(sparkPlaySessions.id, existing.id))
        .returning();
      return updated;
    }
  }

  if (input.scanEventId) {
    const [byScan] = await db
      .select()
      .from(sparkPlaySessions)
      .where(
        and(
          eq(sparkPlaySessions.scanEventId, input.scanEventId),
          or(eq(sparkPlaySessions.status, "pending"), eq(sparkPlaySessions.status, "unlocked")),
        ),
      )
      .orderBy(desc(sparkPlaySessions.createdAt))
      .limit(1);
    if (byScan) {
      const [updated] = await db
        .update(sparkPlaySessions)
        .set({
          phoneE164: phone ?? byScan.phoneE164,
          playPath,
          expiresAt,
          status: "pending",
        })
        .where(eq(sparkPlaySessions.id, byScan.id))
        .returning();
      return updated;
    }
  }

  const [created] = await db
    .insert(sparkPlaySessions)
    .values({
      phoneE164: phone,
      restaurantId: input.restaurantId,
      scanEventId: input.scanEventId ?? null,
      playPath,
      status: "pending",
      expiresAt,
    })
    .returning();
  return created;
}

export async function findActiveSparkSessionByPhone(phoneRaw: string) {
  const phone = normalizeWaPhone(phoneRaw);
  const [row] = await db
    .select()
    .from(sparkPlaySessions)
    .where(
      and(
        eq(sparkPlaySessions.phoneE164, phone),
        gt(sparkPlaySessions.expiresAt, new Date()),
        or(eq(sparkPlaySessions.status, "pending"), eq(sparkPlaySessions.status, "unlocked")),
      ),
    )
    .orderBy(desc(sparkPlaySessions.createdAt))
    .limit(1);
  return row ?? null;
}

export async function markSparkSessionUnlocked(sessionId: string) {
  await db
    .update(sparkPlaySessions)
    .set({ status: "unlocked" })
    .where(eq(sparkPlaySessions.id, sessionId));
}

/** Attach phone to a scan-bound session (bridge opt-in before invite). */
export async function bindPhoneToScanSession(scanEventId: string, phoneRaw: string) {
  const phone = normalizeWaPhone(phoneRaw);
  const [row] = await db
    .select()
    .from(sparkPlaySessions)
    .where(
      and(
        eq(sparkPlaySessions.scanEventId, scanEventId),
        or(eq(sparkPlaySessions.status, "pending"), isNull(sparkPlaySessions.phoneE164)),
      ),
    )
    .orderBy(desc(sparkPlaySessions.createdAt))
    .limit(1);
  if (!row) return null;
  const [updated] = await db
    .update(sparkPlaySessions)
    .set({ phoneE164: phone })
    .where(eq(sparkPlaySessions.id, row.id))
    .returning();
  return updated;
}
