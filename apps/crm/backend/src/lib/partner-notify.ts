export type PartnerEmailAttachment = {
  filename: string;
  /** Base64 content (no data: prefix) */
  content: string;
  contentType?: string;
};

/**
 * Ops alerts for bank / settlement / sticker print requests.
 * Always logs; optionally POSTs JSON to PARTNER_NOTIFY_WEBHOOK_URL or Resend if configured.
 */
export async function notifyPartnersEmail(input: {
  subject: string;
  body: string;
  html?: string;
  meta?: Record<string, unknown>;
  attachments?: PartnerEmailAttachment[];
}): Promise<{ emailed: boolean; logged: true }> {
  const to = process.env.PARTNERS_NOTIFY_EMAIL?.trim() || "partners@damigos.in";
  console.info(
    "[partners-notify]",
    to,
    input.subject,
    input.body.slice(0, 500),
    input.meta ?? {},
    `attachments=${input.attachments?.length ?? 0}`,
  );

  const webhook = process.env.PARTNER_NOTIFY_WEBHOOK_URL?.trim();
  if (webhook) {
    try {
      await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to,
          subject: input.subject,
          body: input.body,
          html: input.html,
          meta: input.meta,
          attachmentCount: input.attachments?.length ?? 0,
        }),
      });
    } catch (err) {
      console.warn("[partners-notify] webhook failed", err);
    }
  }

  let emailed = false;
  const resendKey = process.env.RESEND_API_KEY?.trim();
  if (resendKey) {
    try {
      const payload: Record<string, unknown> = {
        from: process.env.RESEND_FROM?.trim() || "Damigos Ops <ops@damigos.in>",
        to: [to],
        subject: input.subject,
        text: input.body,
      };
      if (input.html) payload.html = input.html;
      if (input.attachments?.length) {
        payload.attachments = input.attachments.map((a) => ({
          filename: a.filename,
          content: a.content,
          content_type: a.contentType ?? "application/octet-stream",
        }));
      }
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      emailed = res.ok;
      if (!res.ok) {
        console.warn("[partners-notify] Resend HTTP", res.status, await res.text().catch(() => ""));
      }
    } catch (err) {
      console.warn("[partners-notify] Resend failed", err);
    }
  }

  return { emailed, logged: true };
}

/** Fetch a QuickChart QR PNG as base64 for email attachments. */
export async function fetchQrPngBase64(scanUrl: string, size = 360): Promise<string | null> {
  try {
    const url = `https://quickchart.io/qr?size=${size}&margin=2&text=${encodeURIComponent(scanUrl)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer()).toString("base64");
  } catch {
    return null;
  }
}

