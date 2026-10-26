import { randomBytes } from "node:crypto";
import { and, desc, eq, isNotNull, isNull } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db, restaurants, stickerBatches, stickerTokens } from "@damigos/db";
import {
  fetchQrPngBase64,
  notifyPartnersEmail,
} from "../lib/partner-notify.js";
import { enforceRestaurantScope, requireRoles } from "../lib/require-staff.js";
import { formatInrPaise, quoteStickerPrint } from "../lib/sticker-print-pricing.js";
import { debitForStickerPrint, recordStickerPrintPayment } from "../lib/wallet.js";
import {
  createRazorpayOrder,
  razorpayConfigured,
  razorpayKeyId,
} from "../lib/razorpay.js";
import { ensureStickerSchema } from "../lib/ensure-sticker-schema.js";

/** C-06.04 — owner activate / generate / print-request (no full download for owners) */
export async function registerStickerRoutes(app: FastifyInstance) {
  const ownerStickers = requireRoles("RESTAURANT_OWNER", "STAFF", "PLATFORM_ADMIN");
  const ownerMint = requireRoles("RESTAURANT_OWNER", "PLATFORM_ADMIN");

  // Warm sticker columns once when routes load (avoids first-request 500s / DDL races)
  void ensureStickerSchema().catch(() => undefined);



  app.get("/stickers/active", { preHandler: ownerStickers }, async (request, reply) => {

    const query = z

      .object({ restaurantId: z.string().uuid().optional() })

      .parse(request.query);



    const restaurantId = query.restaurantId ?? request.staff?.restaurantId;

    if (!restaurantId) {

      return reply.status(400).send({

        error: {

          code: "INVALID_REQUEST",

          message: "restaurantId required",

          correlationId: request.id,

        },

      });

    }



    await enforceRestaurantScope(request, reply, restaurantId);

    if (reply.sent) return;



    const batches = await db

      .select()

      .from(stickerBatches)

      .where(

        and(

          eq(stickerBatches.restaurantId, restaurantId),

          isNotNull(stickerBatches.activatedAt),

          isNull(stickerBatches.revokedAt),

        ),

      )

      .orderBy(desc(stickerBatches.activatedAt));



    return {
      batches: batches.map((b) => ({
        id: b.id,
        batchCode: b.batchCode,
        quantity: b.quantity,
        validFrom: b.validFrom,
        validTo: b.validTo,
        activatedAt: b.activatedAt,
        printRequestedAt: b.printRequestedAt ?? null,
        designId: b.designId ?? null,
        designName: b.designName ?? null,
      })),
    };
  });



  app.get("/stickers/batches", { preHandler: ownerStickers }, async (request, reply) => {
    const query = z
      .object({
        restaurantId: z.string().uuid().optional(),
        status: z.enum(["all", "active", "minted", "expired"]).default("all"),
      })
      .parse(request.query);

    const restaurantId = query.restaurantId ?? request.staff?.restaurantId;
    if (!restaurantId) {
      return reply.status(400).send({
        error: {
          code: "INVALID_REQUEST",
          message: "restaurantId required",
          correlationId: request.id,
        },
      });
    }

    await enforceRestaurantScope(request, reply, restaurantId);
    if (reply.sent) return;

    const now = new Date();
    const rows = await db
      .select()
      .from(stickerBatches)
      .where(eq(stickerBatches.restaurantId, restaurantId))
      .orderBy(desc(stickerBatches.validFrom));

    const filtered = rows.filter((b) => {
      const expired = b.validTo < now;
      const revoked = b.revokedAt != null;
      const active = b.activatedAt != null && !revoked && !expired;
      const minted = b.activatedAt == null && !revoked && !expired;
      switch (query.status) {
        case "active":
          return active;
        case "minted":
          return minted;
        case "expired":
          return expired || revoked;
        default:
          return true;
      }
    });

    return {
      batches: filtered.map((b) => ({
        id: b.id,
        batchCode: b.batchCode,
        quantity: b.quantity,
        validFrom: b.validFrom,
        validTo: b.validTo,
        activatedAt: b.activatedAt,
        revokedAt: b.revokedAt,
        printRequestedAt: b.printRequestedAt ?? null,
        designId: b.designId ?? null,
        designName: b.designName ?? null,
      })),
    };
  });



  app.get("/stickers/batches/:batchId/print-sheet", { preHandler: ownerStickers }, async (request, reply) => {
    const params = z.object({ batchId: z.string().uuid() }).parse(request.params);
    const query = z
      .object({
        restaurantId: z.string().uuid().optional(),
        limit: z.coerce.number().int().min(1).max(500).default(48),
      })
      .parse(request.query);

    const restaurantId = query.restaurantId ?? request.staff?.restaurantId;
    if (!restaurantId) {
      return reply.status(400).send({
        error: { code: "INVALID_REQUEST", message: "restaurantId required", correlationId: request.id },
      });
    }

    await enforceRestaurantScope(request, reply, restaurantId);
    if (reply.sent) return;

    // Owners may only preview up to 3 samples — no full sheet download / print gambling.
    const isPlatformAdmin = (request.staff?.roles ?? []).includes("PLATFORM_ADMIN");
    const limit = isPlatformAdmin ? query.limit : Math.min(query.limit, 3);

    const [batch] = await db
      .select()
      .from(stickerBatches)
      .where(and(eq(stickerBatches.id, params.batchId), eq(stickerBatches.restaurantId, restaurantId)))
      .limit(1);

    if (!batch) {
      return reply.status(404).send({
        error: { code: "NOT_FOUND", message: "Batch not found", correlationId: request.id },
      });
    }

    const [restaurant] = await db
      .select({ name: restaurants.name })
      .from(restaurants)
      .where(eq(restaurants.id, restaurantId))
      .limit(1);

    const tokens = await db
      .select({ id: stickerTokens.id, publicToken: stickerTokens.publicToken })
      .from(stickerTokens)
      .where(eq(stickerTokens.batchId, batch.id))
      .limit(limit);

    const guestWeb = (process.env.GUEST_WEB_ORIGIN ?? "http://localhost:3000").replace(/\/$/, "");

    return {
      restaurantName: restaurant?.name ?? "Restaurant",
      batchCode: batch.batchCode,
      validTo: batch.validTo,
      sampleOnly: !isPlatformAdmin,
      quantity: batch.quantity,
      stickers: tokens.map((t, i) => ({
        label: `TBL-${String(i + 1).padStart(2, "0")}`,
        scanPath: `/s/${t.publicToken}`,
        scanUrl: `${guestWeb}/s/${t.publicToken}`,
      })),
    };
  });

  /** Owner generates QR batch on their kitchen account (auto-activates for testing). */
  app.post("/stickers/generate", { preHandler: ownerMint }, async (request, reply) => {
    const body = z
      .object({
        restaurantId: z.string().uuid(),
        quantity: z.number().int().min(1).max(2000),
        validDays: z.number().int().min(10).max(15).default(12),
        designId: z.number().int().min(1).optional(),
        designName: z.string().max(120).optional(),
        notes: z.string().max(500).optional(),
      })
      .safeParse(request.body);

    if (!body.success) {
      return reply.status(400).send({
        error: { code: "INVALID_REQUEST", message: body.error.message, correlationId: request.id },
      });
    }

    const { restaurantId, quantity, validDays, designId, designName, notes } = body.data;
    await enforceRestaurantScope(request, reply, restaurantId);
    if (reply.sent) return;

    const validFrom = new Date();
    const validTo = new Date(validFrom);
    validTo.setDate(validTo.getDate() + validDays);
    const batchCode = `B-${randomBytes(4).toString("hex").toUpperCase()}`;
    const metaNote = [
      notes?.trim(),
      designId != null ? `designId=${designId}` : null,
      designName ? `design=${designName}` : null,
      "source=owner-generate",
    ]
      .filter(Boolean)
      .join(" · ");

    const [batch] = await db
      .insert(stickerBatches)
      .values({
        restaurantId,
        batchCode,
        quantity,
        validFrom,
        validTo,
        activatedAt: validFrom,
        designId: designId ?? null,
        designName: designName ?? null,
      })
      .returning();

    const tokenRows = Array.from({ length: quantity }, () => ({
      batchId: batch.id,
      publicToken: randomBytes(16).toString("base64url"),
    }));
    await db.insert(stickerTokens).values(tokenRows);

    const guestWeb = (process.env.GUEST_WEB_ORIGIN ?? "http://localhost:3000").replace(/\/$/, "");
    const sampleTokens = tokenRows.slice(0, 3);
    const samples = sampleTokens.map((t, i) => ({
      label: `TBL-${String(i + 1).padStart(2, "0")}`,
      scanPath: `/s/${t.publicToken}`,
      scanUrl: `${guestWeb}/s/${t.publicToken}`,
    }));

    const [restaurant] = await db
      .select({ name: restaurants.name })
      .from(restaurants)
      .where(eq(restaurants.id, restaurantId))
      .limit(1);

    return {
      batchId: batch.id,
      batchCode: batch.batchCode,
      quantity,
      validFrom: batch.validFrom,
      validTo: batch.validTo,
      activated: true,
      designId: designId ?? null,
      designName: designName ?? null,
      notes: metaNote || null,
      restaurantName: restaurant?.name ?? "Restaurant",
      samples,
      sampleOnly: true,
    };
  });

  /** Prepare Razorpay order for Pay & send (print & ship). */
  app.post("/stickers/print-prepare", { preHandler: ownerMint }, async (request, reply) => {
    const body = z
      .object({
        restaurantId: z.string().uuid(),
        batchId: z.string().uuid(),
        quantity: z.number().int().min(1).max(2000),
        totalPaise: z.number().int().min(1),
      })
      .safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({
        error: { code: "INVALID_REQUEST", message: body.error.message, correlationId: request.id },
      });
    }
    await enforceRestaurantScope(request, reply, body.data.restaurantId);
    if (reply.sent) return;

    const quote = quoteStickerPrint(body.data.quantity);
    if (body.data.totalPaise !== quote.totalPaise) {
      return reply.status(400).send({
        error: {
          code: "QUOTE_MISMATCH",
          message: `Expected total ${formatInrPaise(quote.totalPaise)}`,
          correlationId: request.id,
        },
      });
    }

    if (!razorpayConfigured()) {
      return {
        mode: "stub" as const,
        amountPaise: quote.totalPaise,
        razorpayOrderId: null,
        razorpayKeyId: null,
      };
    }

    const receipt = `stk_${body.data.batchId.slice(0, 8)}_${Date.now().toString(36)}`;
    const razorpayOrderId = await createRazorpayOrder({
      amountPaise: quote.totalPaise,
      receipt,
      notes: {
        restaurantId: body.data.restaurantId,
        batchId: body.data.batchId,
        purpose: "sticker_print_ship",
      },
    });

    return {
      mode: "live" as const,
      amountPaise: quote.totalPaise,
      razorpayOrderId,
      razorpayKeyId: razorpayKeyId(),
    };
  });

  /** Email D'aMigo's ops to print & ship — owners cannot download full sheets. */
  app.post("/stickers/print-request", { preHandler: ownerMint }, async (request, reply) => {
    const body = z
      .object({
        restaurantId: z.string().uuid(),
        batchId: z.string().uuid(),
        quantity: z.number().int().min(1).max(2000),
        designId: z.number().int().min(1),
        designName: z.string().min(1).max(120),
        sampleCount: z.number().int().min(1).max(3).default(3),
        notes: z.string().max(500).optional(),
        totalPaise: z.number().int().min(1),
        paymentConfirmed: z.literal(true),
        paymentMethod: z.enum(["wallet", "external"]).default("external"),
        razorpayOrderId: z.string().min(1).optional(),
        razorpayPaymentId: z.string().min(1).optional(),
      })
      .safeParse(request.body);

    if (!body.success) {
      return reply.status(400).send({
        error: { code: "INVALID_REQUEST", message: body.error.message, correlationId: request.id },
      });
    }

    const {
      restaurantId,
      batchId,
      quantity,
      designId,
      designName,
      sampleCount,
      notes,
      totalPaise,
      paymentMethod,
      razorpayOrderId,
      razorpayPaymentId,
    } = body.data;
    await enforceRestaurantScope(request, reply, restaurantId);
    if (reply.sent) return;

    const quote = quoteStickerPrint(quantity);
    if (totalPaise !== quote.totalPaise) {
      return reply.status(400).send({
        error: {
          code: "QUOTE_MISMATCH",
          message: `Expected total ${formatInrPaise(quote.totalPaise)} for ${quantity} stickers`,
          correlationId: request.id,
        },
      });
    }

    const [batch] = await db
      .select()
      .from(stickerBatches)
      .where(and(eq(stickerBatches.id, batchId), eq(stickerBatches.restaurantId, restaurantId)))
      .limit(1);

    if (!batch) {
      return reply.status(404).send({
        error: { code: "NOT_FOUND", message: "Batch not found", correlationId: request.id },
      });
    }

    const paymentMeta = {
      stickersPaise: quote.stickersPaise,
      deliveryPaise: quote.deliveryPaise,
      gstPaise: quote.gstPaise,
      totalPaise: quote.totalPaise,
      quantity,
      designName,
      batchId: batch.id,
      batchCode: batch.batchCode,
      razorpayOrderId: razorpayOrderId ?? null,
      razorpayPaymentId: razorpayPaymentId ?? null,
      orderId: razorpayOrderId ?? null,
      transactionId: razorpayPaymentId ?? null,
      utr: razorpayPaymentId ?? null,
    };

    let walletTxnId: string | null = null;
    let paymentLabel = "external";

    if (paymentMethod === "wallet") {
      const debit = await debitForStickerPrint({
        restaurantId,
        batchId: batch.id,
        batchCode: batch.batchCode,
        amountPaise: quote.totalPaise,
        meta: paymentMeta,
      });
      if (!debit.ok) {
        const msg =
          debit.reason === "MIN_BALANCE"
            ? "Wallet must keep at least ₹1,000 after this payment"
            : debit.reason === "DUPLICATE"
              ? "This batch was already paid from wallet"
              : "Insufficient wallet balance";
        return reply.status(400).send({
          error: { code: debit.reason, message: msg, correlationId: request.id },
        });
      }
      walletTxnId = debit.txnId;
      paymentLabel = "wallet";
    } else {
      const stubPayId = razorpayPaymentId ?? `pay_sticker_${Date.now().toString(36)}`;
      const stubOrderId = razorpayOrderId ?? `order_sticker_${batch.batchCode}`;
      const recorded = await recordStickerPrintPayment({
        restaurantId,
        batchId: batch.id,
        batchCode: batch.batchCode,
        amountPaise: quote.totalPaise,
        meta: {
          ...paymentMeta,
          paymentMethod: razorpayPaymentId ? "razorpay" : "stub",
          razorpayOrderId: stubOrderId,
          razorpayPaymentId: stubPayId,
          orderId: stubOrderId,
          transactionId: stubPayId,
          utr: stubPayId,
        },
      });
      walletTxnId = recorded.txnId;
      paymentLabel = razorpayPaymentId ? "razorpay" : "stub";
    }

    const [restaurant] = await db
      .select({ name: restaurants.name })
      .from(restaurants)
      .where(eq(restaurants.id, restaurantId))
      .limit(1);

    const tokens = await db
      .select({ publicToken: stickerTokens.publicToken })
      .from(stickerTokens)
      .where(eq(stickerTokens.batchId, batch.id))
      .limit(sampleCount);

    const guestWeb = (process.env.GUEST_WEB_ORIGIN ?? "http://localhost:3000").replace(/\/$/, "");
    const samples = tokens.map((t, i) => ({
      label: `TBL-${String(i + 1).padStart(2, "0")}`,
      scanUrl: `${guestWeb}/s/${t.publicToken}`,
    }));

    const attachments = [];
    for (const s of samples) {
      const content = await fetchQrPngBase64(s.scanUrl);
      if (content) {
        attachments.push({
          filename: `${batch.batchCode}-${s.label}.png`,
          content,
          contentType: "image/png",
        });
      }
    }

    const kitchen = restaurant?.name ?? restaurantId;
    const subject = `[Sticker print PAID ${formatInrPaise(quote.totalPaise)}] ${kitchen} · ${quantity} × ${designName}`;
    const text = [
      `Print & ship request from CRM Stickers (payment confirmed)`,
      ``,
      `Restaurant: ${kitchen}`,
      `Restaurant ID: ${restaurantId}`,
      `Batch code: ${batch.batchCode}`,
      `Batch ID: ${batch.id}`,
      `Quantity to print: ${quantity}`,
      `Sticker design: ${designName} (id ${designId})`,
      ``,
      `Payment quote:`,
      `  Stickers: ${quantity} × ${formatInrPaise(quote.unitPaise)} = ${formatInrPaise(quote.stickersPaise)}`,
      `  Delivery: ${formatInrPaise(quote.deliveryPaise)}`,
      `  GST (${Math.round(quote.gstRate * 100)}%): ${formatInrPaise(quote.gstPaise)}`,
      `  Total paid: ${formatInrPaise(quote.totalPaise)}`,
      `  Payment method: ${paymentLabel}`,
      `  Wallet ledger txn: ${walletTxnId ?? "—"}`,
      `  Payment status: confirmed`,
      ``,
      `Sample QRs attached: ${attachments.length} (testable scan URLs below)`,
      notes ? `Owner notes: ${notes}` : null,
      ``,
      ...samples.map((s) => `${s.label}: ${s.scanUrl}`),
      ``,
      `Owner cannot download full sheets — please print and courier physical stickers.`,
    ]
      .filter((line) => line !== null)
      .join("\n");

    const html = `
      <h2>Sticker print request (paid)</h2>
      <p><strong>${kitchen}</strong> paid and asked Damigos to print and ship stickers.</p>
      <ul>
        <li>Quantity: <strong>${quantity}</strong></li>
        <li>Design: <strong>${designName}</strong> (id ${designId})</li>
        <li>Batch: <code>${batch.batchCode}</code></li>
        <li>Restaurant ID: <code>${restaurantId}</code></li>
        <li>Stickers: ${formatInrPaise(quote.stickersPaise)}</li>
        <li>Delivery: ${formatInrPaise(quote.deliveryPaise)}</li>
        <li>GST: ${formatInrPaise(quote.gstPaise)}</li>
        <li>Total paid: <strong>${formatInrPaise(quote.totalPaise)}</strong> via ${paymentLabel}</li>
        <li>Wallet ledger: <code>${walletTxnId ?? "—"}</code></li>
      </ul>
      ${notes ? `<p>Notes: ${notes}</p>` : ""}
      <p>Sample scan URLs (also attached as PNG):</p>
      <ol>${samples.map((s) => `<li><a href="${s.scanUrl}">${s.label}</a></li>`).join("")}</ol>
      <p style="color:#666">Owner CRM blocks full download — print physically and ship.</p>
    `;

    const result = await notifyPartnersEmail({
      subject,
      body: text,
      html,
      attachments,
      meta: {
        type: "sticker_print_request",
        restaurantId,
        batchId: batch.id,
        batchCode: batch.batchCode,
        quantity,
        designId,
        designName,
        totalPaise: quote.totalPaise,
        paymentStatus: "confirmed",
        paymentMethod: paymentLabel,
        walletTxnId,
      },
    });

    const requestedAt = new Date();
    await db
      .update(stickerBatches)
      .set({
        printRequestedAt: requestedAt,
        designId,
        designName,
      })
      .where(eq(stickerBatches.id, batch.id));

    return {
      ok: true,
      emailed: result.emailed,
      to: process.env.PARTNERS_NOTIFY_EMAIL?.trim() || "partners@damigos.in",
      sampleAttached: attachments.length,
      printRequestedAt: requestedAt.toISOString(),
      quote,
      paymentStatus: "confirmed",
      paymentMethod: paymentLabel,
      walletTxnId,
    };
  });



  app.post("/stickers/activate", { preHandler: ownerStickers }, async (request, reply) => {

    const body = z

      .object({

        batchCode: z.string().min(4),

        restaurantId: z.string().uuid().optional(),

      })

      .safeParse(request.body);



    if (!body.success) {

      return reply.status(400).send({

        error: {

          code: "INVALID_REQUEST",

          message: "batchCode required",

          correlationId: request.id,

        },

      });

    }



    const restaurantId = body.data.restaurantId ?? request.staff?.restaurantId;

    if (!restaurantId) {

      return reply.status(400).send({

        error: {

          code: "INVALID_REQUEST",

          message: "restaurantId required",

          correlationId: request.id,

        },

      });

    }



    await enforceRestaurantScope(request, reply, restaurantId);

    if (reply.sent) return;



    const [batch] = await db

      .select()

      .from(stickerBatches)

      .where(eq(stickerBatches.batchCode, body.data.batchCode.trim()))

      .limit(1);



    if (!batch) {

      return reply.status(404).send({

        error: {

          code: "BATCH_NOT_FOUND",

          message: "Unknown batch code",

          correlationId: request.id,

        },

      });

    }



    if (batch.restaurantId !== restaurantId) {

      return reply.status(403).send({

        error: {

          code: "FORBIDDEN",

          message: "Batch belongs to another kitchen",

          correlationId: request.id,

        },

      });

    }



    if (batch.revokedAt) {

      return reply.status(410).send({

        error: {

          code: "BATCH_REVOKED",

          message: "This batch was revoked",

          correlationId: request.id,

        },

      });

    }



    if (batch.activatedAt) {

      return {

        alreadyActive: true,

        batchId: batch.id,

        batchCode: batch.batchCode,

        validFrom: batch.validFrom,

        validTo: batch.validTo,

        activatedAt: batch.activatedAt,

      };

    }



    const activatedAt = new Date();

    const [updated] = await db

      .update(stickerBatches)

      .set({ activatedAt, validFrom: activatedAt })

      .where(eq(stickerBatches.id, batch.id))

      .returning();



    return {

      activated: true,

      batchId: updated.id,

      batchCode: updated.batchCode,

      validFrom: updated.validFrom,

      validTo: updated.validTo,

      activatedAt: updated.activatedAt,

    };

  });

}

