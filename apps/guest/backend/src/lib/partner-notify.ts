/**
 * Guest feedback / ops mail → partners@damigos.in (same pattern as CRM partner-notify).
 */
export async function notifyPartnersEmail(input: {
  subject: string;
  body: string;
  html?: string;
  meta?: Record<string, unknown>;
}): Promise<{ emailed: boolean; logged: true }> {
  const to = process.env.PARTNERS_NOTIFY_EMAIL?.trim() || "partners@damigos.in";
  console.info(
    "[partners-notify:guest]",
    to,
    input.subject,
    input.body.slice(0, 500),
    input.meta ?? {},
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
        }),
      });
    } catch (err) {
      console.warn("[partners-notify:guest] webhook failed", err);
    }
  }

  let emailed = false;
  const resendKey = process.env.RESEND_API_KEY?.trim();
  if (resendKey) {
    try {
      const payload: Record<string, unknown> = {
        from: process.env.RESEND_FROM?.trim() || "Damigos Guest <ops@damigos.in>",
        to: [to],
        subject: input.subject,
        text: input.body,
      };
      if (input.html) payload.html = input.html;
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
        console.warn(
          "[partners-notify:guest] Resend HTTP",
          res.status,
          await res.text().catch(() => ""),
        );
      }
    } catch (err) {
      console.warn("[partners-notify:guest] Resend failed", err);
    }
  }

  return { emailed, logged: true };
}
