import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import {
  campaignRecipients,
  campaigns,
  consentRecords,
  customers,
  db,
  messageDeliveryLog,
  orders,
  restaurants,
} from "@damigos/db";
import { kapsoMode as kapsoModeFromLib, sendSparkMarketingText } from "./kapso.js";
import { getWalletSnapshot, WHATSAPP_MSG_COST_PAISE } from "./wallet.js";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export type CampaignAudience = "all" | "marketing_opt_in";

export type CampaignDto = {
  id: string;
  restaurantId: string;
  name: string;
  status: string;
  audience: CampaignAudience;
  templateKey: string | null;
  scheduledAt: string | null;
  estimatedRecipients: number;
  skippedSevenDayCap: number;
  skippedOptIn: number;
  sentCount: number;
  createdAt: string;
};

function rowToDto(row: typeof campaigns.$inferSelect): CampaignDto {
  return {
    id: row.id,
    restaurantId: row.restaurantId,
    name: row.name,
    status: row.status,
    audience: row.audience as CampaignAudience,
    templateKey: row.templateKey,
    scheduledAt: row.scheduledAt?.toISOString() ?? null,
    estimatedRecipients: row.estimatedRecipients,
    skippedSevenDayCap: row.skippedSevenDayCap,
    skippedOptIn: row.skippedOptIn,
    sentCount: row.sentCount,
    createdAt: row.createdAt.toISOString(),
  };
}

async function distinctCustomerIds(restaurantId: string): Promise<string[]> {
  const rows = await db
    .selectDistinct({ customerId: orders.customerId })
    .from(orders)
    .where(eq(orders.restaurantId, restaurantId));
  return rows.map((r) => r.customerId);
}

async function hasMarketingOptIn(customerId: string): Promise<boolean> {
  const [row] = await db
    .select({ granted: consentRecords.granted })
    .from(consentRecords)
    .where(and(eq(consentRecords.customerId, customerId), eq(consentRecords.kind, "marketing")))
    .orderBy(desc(consentRecords.createdAt))
    .limit(1);
  return row?.granted === true;
}

async function hitSevenDayCap(restaurantId: string, customerId: string): Promise<boolean> {
  const since = new Date(Date.now() - SEVEN_DAYS_MS);
  const [row] = await db
    .select({ id: messageDeliveryLog.id })
    .from(messageDeliveryLog)
    .where(
      and(
        eq(messageDeliveryLog.restaurantId, restaurantId),
        eq(messageDeliveryLog.customerId, customerId),
        eq(messageDeliveryLog.messageClass, "marketing"),
        inArray(messageDeliveryLog.status, ["sent", "delivered", "read"]),
        gte(messageDeliveryLog.createdAt, since),
      ),
    )
    .limit(1);
  return Boolean(row);
}

export async function previewCampaignAudience(restaurantId: string, audience: CampaignAudience) {
  const customerIds = await distinctCustomerIds(restaurantId);
  let skippedOptIn = 0;
  let skippedSevenDayCap = 0;
  let willSend = 0;

  for (const customerId of customerIds) {
    if (audience === "marketing_opt_in") {
      const ok = await hasMarketingOptIn(customerId);
      if (!ok) {
        skippedOptIn += 1;
        continue;
      }
    }
    if (await hitSevenDayCap(restaurantId, customerId)) {
      skippedSevenDayCap += 1;
      continue;
    }
    willSend += 1;
  }

  const wallet = await getWalletSnapshot(restaurantId);
  const estimatedCostPaise = willSend * WHATSAPP_MSG_COST_PAISE;
  const balanceAfterPaise = wallet.balancePaise - estimatedCostPaise;

  return {
    audience,
    eligibleCount: customerIds.length,
    skippedSevenDayCap,
    skippedOptIn,
    willSend,
    sevenDayCapEnabled: true,
    costPerMessagePaise: WHATSAPP_MSG_COST_PAISE,
    estimatedCostPaise,
    balancePaise: wallet.balancePaise,
    balanceAfterPaise,
    canAfford: balanceAfterPaise >= 0,
  };
}

export async function listCampaignsForRestaurant(restaurantId: string) {
  const rows = await db
    .select()
    .from(campaigns)
    .where(eq(campaigns.restaurantId, restaurantId))
    .orderBy(desc(campaigns.createdAt));
  return rows.map(rowToDto);
}

export async function createCampaignRecord(input: {
  restaurantId: string;
  name: string;
  audience: CampaignAudience;
  templateKey?: string;
}) {
  const preview = await previewCampaignAudience(input.restaurantId, input.audience);
  const [row] = await db
    .insert(campaigns)
    .values({
      restaurantId: input.restaurantId,
      name: input.name,
      status: "Draft",
      audience: input.audience,
      templateKey: input.templateKey ?? null,
      estimatedRecipients: preview.willSend,
      skippedSevenDayCap: preview.skippedSevenDayCap,
      skippedOptIn: preview.skippedOptIn,
    })
    .returning();
  return rowToDto(row);
}

async function buildRecipientRows(campaignId: string, restaurantId: string, audience: CampaignAudience) {
  const customerIds = await distinctCustomerIds(restaurantId);
  const rows: (typeof campaignRecipients.$inferInsert)[] = [];
  let skippedSevenDayCap = 0;
  let skippedOptIn = 0;
  let pending = 0;

  for (const customerId of customerIds) {
    if (audience === "marketing_opt_in") {
      if (!(await hasMarketingOptIn(customerId))) {
        rows.push({ campaignId, customerId, status: "skipped_opt_in" });
        skippedOptIn += 1;
        continue;
      }
    }
    if (await hitSevenDayCap(restaurantId, customerId)) {
      rows.push({ campaignId, customerId, status: "skipped_seven_day_cap" });
      skippedSevenDayCap += 1;
      continue;
    }
    rows.push({ campaignId, customerId, status: "pending" });
    pending += 1;
  }

  if (rows.length > 0) {
    await db.insert(campaignRecipients).values(rows);
  }

  return { pending, skippedSevenDayCap, skippedOptIn };
}

export async function getCampaignById(campaignId: string, restaurantId: string) {
  const [row] = await db
    .select()
    .from(campaigns)
    .where(and(eq(campaigns.id, campaignId), eq(campaigns.restaurantId, restaurantId)))
    .limit(1);
  return row ? rowToDto(row) : null;
}

export async function markCampaignScheduled(
  campaignId: string,
  restaurantId: string,
  scheduledAt: Date,
) {
  const [existing] = await db
    .select()
    .from(campaigns)
    .where(and(eq(campaigns.id, campaignId), eq(campaigns.restaurantId, restaurantId)))
    .limit(1);
  if (!existing) return null;

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(campaignRecipients)
    .where(eq(campaignRecipients.campaignId, campaignId));
  if ((count ?? 0) === 0) {
    const built = await buildRecipientRows(
      campaignId,
      restaurantId,
      existing.audience as CampaignAudience,
    );
    await db
      .update(campaigns)
      .set({
        estimatedRecipients: built.pending,
        skippedSevenDayCap: built.skippedSevenDayCap,
        skippedOptIn: built.skippedOptIn,
        scheduledAt,
        status: "Scheduled",
      })
      .where(eq(campaigns.id, campaignId));
  } else {
    await db
      .update(campaigns)
      .set({ scheduledAt, status: "Scheduled" })
      .where(eq(campaigns.id, campaignId));
  }

  return getCampaignById(campaignId, restaurantId);
}

export function kapsoMode(): "mock" | "live" | "off" {
  return kapsoModeFromLib();
}

function guestWebOrigin(): string {
  return (
    process.env.GUEST_WEB_URL?.replace(/\/$/, "") ||
    process.env.GUEST_WEB_ORIGIN?.replace(/\/$/, "") ||
    "http://localhost:3000"
  );
}

/** Dispatch Grow campaign via Spark Kapso (mock or live). */
export async function dispatchCampaignMock(campaignId: string, restaurantId: string) {
  const mode = kapsoMode();
  if (mode === "off") return { ok: false as const, reason: "kapso_off" };

  const campaign = await getCampaignById(campaignId, restaurantId);
  if (!campaign) return { ok: false as const, reason: "not_found" };
  if (campaign.status !== "Scheduled" && campaign.status !== "Sending") {
    return { ok: false as const, reason: "invalid_status" };
  }

  const [kitchen] = await db
    .select()
    .from(restaurants)
    .where(eq(restaurants.id, restaurantId))
    .limit(1);

  await db.update(campaigns).set({ status: "Sending" }).where(eq(campaigns.id, campaignId));

  const pending = await db
    .select()
    .from(campaignRecipients)
    .where(and(eq(campaignRecipients.campaignId, campaignId), eq(campaignRecipients.status, "pending")));

  let sent = 0;
  for (const recipient of pending) {
    const [customer] = await db
      .select()
      .from(customers)
      .where(eq(customers.id, recipient.customerId))
      .limit(1);

    const phone = customer?.phoneE164;
    if (!phone) {
      await db
        .update(campaignRecipients)
        .set({ status: "skipped_no_phone", errorMessage: "No phone_e164" })
        .where(eq(campaignRecipients.id, recipient.id));
      continue;
    }

    const body =
      `📣 *${kitchen?.name ?? "Your kitchen"}*\n\n` +
      `${campaign.name}\n` +
      (campaign.templateKey ? `Offer: ${campaign.templateKey}\n\n` : "\n") +
      `Order direct: ${guestWebOrigin()}/r/${restaurantId}`;

    const result = await sendSparkMarketingText(phone, body);
    if (!result.ok) {
      await db
        .update(campaignRecipients)
        .set({
          status: "failed",
          errorMessage: (result.error ?? "send failed").slice(0, 255),
        })
        .where(eq(campaignRecipients.id, recipient.id));
      continue;
    }

    const kapsoId = result.messageId ?? `kapso_${mode}_${randomUUID().slice(0, 8)}`;
    await db
      .update(campaignRecipients)
      .set({ status: "sent", kapsoMessageId: kapsoId })
      .where(eq(campaignRecipients.id, recipient.id));
    await db.insert(messageDeliveryLog).values({
      restaurantId,
      customerId: recipient.customerId,
      campaignId,
      templateKey: campaign.templateKey,
      kapsoMessageId: kapsoId,
      status: "sent",
      messageClass: "marketing",
    });
    sent += 1;
  }

  await db
    .update(campaigns)
    .set({ status: "Sent", sentCount: sent })
    .where(eq(campaigns.id, campaignId));

  return { ok: true as const, sent, mode, campaign: await getCampaignById(campaignId, restaurantId) };
}
