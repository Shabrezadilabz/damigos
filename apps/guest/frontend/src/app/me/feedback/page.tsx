"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { MeSubpageShell } from "@/components/me-subpage-shell";
import { MaterialIcon } from "@/components/material-icon";
import { sendGuestFeedback } from "@/lib/api";
import { getGuestToken } from "@/lib/session";

export default function MeFeedbackPage() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [rating, setRating] = useState<number | null>(5);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (message.trim().length < 8) {
      setError("Tell us a bit more (at least 8 characters).");
      return;
    }
    setSending(true);
    setError(null);
    try {
      await sendGuestFeedback({
        message: message.trim(),
        rating: rating ?? undefined,
        email: email.trim() || undefined,
        token: getGuestToken(),
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send feedback");
    } finally {
      setSending(false);
    }
  }

  return (
    <MeSubpageShell title="Feedback">
      {done ? (
        <div className="rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-black/5">
          <MaterialIcon name="check_circle" className="text-[40px] text-[#24963F]" />
          <p className="mt-2 text-[16px] font-bold">Thanks — we got it</p>
          <p className="mt-1 text-[13px] text-on-surface-variant">
            Your note was sent to partners@damigos.in
          </p>
          <button
            type="button"
            className="pressable mt-4 text-[14px] font-bold text-primary"
            onClick={() => router.replace("/me")}
          >
            Back to profile
          </button>
        </div>
      ) : (
        <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
          <p className="text-[13px] text-on-surface-variant">
            Share what&apos;s working or broken — we read every message at{" "}
            <span className="font-semibold text-foreground">partners@damigos.in</span>.
          </p>

          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
            <p className="mb-2 text-[12px] font-bold uppercase tracking-wide text-on-surface-variant">
              Rating
            </p>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`pressable flex h-10 w-10 items-center justify-center rounded-full text-[18px] ${
                    rating === n ? "bg-primary text-on-primary" : "bg-surface-container-low"
                  }`}
                  onClick={() => setRating(n)}
                  aria-label={`${n} stars`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <label className="block rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
            <span className="text-[12px] font-bold uppercase tracking-wide text-on-surface-variant">
              Your message
            </span>
            <textarea
              className="mt-2 min-h-[120px] w-full resize-y rounded-xl border border-outline-variant/50 bg-surface-container-low px-3 py-2.5 text-[14px] outline-none focus:border-primary"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="What should we fix or improve?"
              maxLength={4000}
              disabled={sending}
              data-testid="feedback-message"
            />
          </label>

          <label className="block rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
            <span className="text-[12px] font-bold uppercase tracking-wide text-on-surface-variant">
              Email (optional)
            </span>
            <input
              type="email"
              className="mt-2 w-full rounded-xl border border-outline-variant/50 bg-surface-container-low px-3 py-2.5 text-[14px]"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="so we can reply"
              disabled={sending}
            />
          </label>

          {error ? <p className="text-center text-sm text-red-700">{error}</p> : null}

          <button
            type="submit"
            disabled={sending}
            className="pressable flex h-12 w-full items-center justify-center rounded-xl bg-primary text-[15px] font-bold text-on-primary disabled:opacity-60"
            data-testid="feedback-send"
          >
            {sending ? "Sending…" : "Send to partners@damigos.in"}
          </button>

          <a
            href={`mailto:partners@damigos.in?subject=${encodeURIComponent("Guest app feedback")}`}
            className="block text-center text-[12px] font-semibold text-on-surface-variant underline"
          >
            Or open mail app instead
          </a>

          <Link href="/me" className="block py-2 text-center text-[14px] font-semibold text-on-surface-variant">
            Cancel
          </Link>
        </form>
      )}
    </MeSubpageShell>
  );
}
