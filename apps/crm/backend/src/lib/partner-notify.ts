/**
 * Ops alerts for bank / settlement changes.
 * Always logs; optionally POSTs JSON to PARTNER_NOTIFY_WEBHOOK_URL or Resend if configured.
 */
export async function notifyPartnersEmail(input: {
  subject: string;
  body: string;
  meta?: Record<string, unknown>;
}): Promise<void> {
  const to = process.env.PARTNERS_NOTIFY_EMAIL?.trim() || "partners@damigos.in";
  console.info("[partners-notify]", to, input.subject, input.body.slice(0, 500), input.meta ?? {});

  const webhook = process.env.PARTNER_NOTIFY_WEBHOOK_URL?.trim();
  if (webhook) {
    try {
      await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, ...input }),
      });
    } catch (err) {
      console.warn("[partners-notify] webhook failed", err);
    }
  }

  const resendKey = process.env.RESEND_API_KEY?.trim();
  if (resendKey) {
    try {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM?.trim() || "Damigos Ops <ops@damigos.in>",
          to: [to],
          subject: input.subject,
          text: input.body,
        }),
      });
    } catch (err) {
      console.warn("[partners-notify] Resend failed", err);
    }
  }
}
