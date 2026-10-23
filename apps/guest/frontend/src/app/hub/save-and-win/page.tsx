"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { MaterialIcon } from "@/components/material-icon";
import { fetchWaStatus } from "@/lib/api";

/** Hub “Save your friend · WIN UP TO ₹600” — share / WhatsApp invite */
export default function SaveAndWinPage() {
  const [friendPhone, setFriendPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const shareUrl = useMemo(() => {
    if (typeof window === "undefined") return "https://damigos-guest-web.vercel.app/hub";
    return `${window.location.origin}/hub`;
  }, []);

  const shareText =
    `Join me on D'aMigo's — order direct from local kitchens & unlock Spark rewards.\n` +
    `Win up to ₹600 when friends order after your invite.\n${shareUrl}`;

  async function onShare() {
    setErr(null);
    setMsg(null);
    try {
      if (navigator.share) {
        await navigator.share({
          title: "D'aMigo's — Save & Win",
          text: shareText,
          url: shareUrl,
        });
        setMsg("Shared — thanks!");
        return;
      }
      await navigator.clipboard.writeText(shareText);
      setMsg("Invite link copied. Paste it in WhatsApp.");
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return;
      try {
        await navigator.clipboard.writeText(shareText);
        setMsg("Invite link copied.");
      } catch {
        setErr("Could not share — copy the link below manually.");
      }
    }
  }

  async function onWhatsAppOpen() {
    const wa = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(wa, "_blank", "noopener,noreferrer");
  }

  async function onSendSparkInvite(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    const digits = friendPhone.replace(/\D/g, "");
    const e164 = digits.length === 10 ? `91${digits}` : digits;
    if (e164.length < 12) {
      setErr("Enter friend’s 10-digit Indian mobile.");
      return;
    }
    setBusy(true);
    try {
      const status = await fetchWaStatus();
      const inviteText = encodeURIComponent(
        `Hi — try D'aMigo's with me. Order direct & play Spark: ${shareUrl}`,
      );
      if (status.sparkWaMeE164) {
        window.open(
          `https://wa.me/${status.sparkWaMeE164}?text=${inviteText}`,
          "_blank",
          "noopener,noreferrer",
        );
        setMsg("Opened WhatsApp to Spark — ask your friend to say HI.");
      } else {
        window.open(`https://wa.me/91${digits.slice(-10)}?text=${inviteText}`, "_blank", "noopener,noreferrer");
        setMsg(`Opened chat with ${e164}.`);
      }
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Invite failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-dvh bg-surface-container-low pb-10">
      <div className="relative overflow-hidden bg-gradient-to-br from-[#1e3a8a] via-[#2563eb] to-[#f59e0b] px-4 pb-14 pt-safe text-white">
        <div className="flex items-center justify-between py-3">
          <Link
            href="/hub"
            className="pressable flex h-11 w-11 items-center justify-center rounded-full bg-white/15"
            aria-label="Back to hub"
          >
            <MaterialIcon name="arrow_back" className="text-[22px]" />
          </Link>
          <span className="text-[12px] font-bold uppercase tracking-wider text-white/80">Save &amp; Win</span>
          <span className="w-11" aria-hidden />
        </div>
        <p className="text-[13px] font-extrabold uppercase tracking-wide text-white/90">Save your friend</p>
        <h1 className="mt-1 font-display text-[32px] font-black leading-tight">
          Win up to ₹600
        </h1>
        <p className="mt-2 max-w-sm text-[14px] text-white/90">
          Share D&apos;aMigo&apos;s. When friends order direct after your invite, you both unlock Spark rewards.
        </p>
      </div>

      <div className="-mt-8 space-y-3 px-4">
        <div className="rounded-2xl bg-white p-4 shadow-md ring-1 ring-black/5">
          <p className="text-[13px] font-bold">Share invite</p>
          <p className="mt-1 break-all text-[11px] text-on-surface-variant">{shareUrl}</p>
          <div className="mt-3 flex flex-col gap-2">
            <button
              type="button"
              className="pressable flex h-12 items-center justify-center gap-2 rounded-xl bg-primary text-[15px] font-bold text-on-primary"
              onClick={() => void onShare()}
              data-testid="save-win-share"
            >
              <MaterialIcon name="ios_share" className="text-[20px]" />
              Share / copy link
            </button>
            <button
              type="button"
              className="pressable flex h-12 items-center justify-center gap-2 rounded-xl bg-[#25D366] text-[15px] font-bold text-white"
              onClick={() => void onWhatsAppOpen()}
              data-testid="save-win-whatsapp"
            >
              <MaterialIcon name="chat" className="text-[20px]" />
              Open WhatsApp
            </button>
          </div>
        </div>

        <form
          onSubmit={(e) => void onSendSparkInvite(e)}
          className="rounded-2xl bg-white p-4 shadow-md ring-1 ring-black/5"
        >
          <p className="text-[13px] font-bold">Friend&apos;s WhatsApp (optional)</p>
          <p className="mt-1 text-[12px] text-on-surface-variant">
            We&apos;ll open a chat so they can start on Spark / Hub.
          </p>
          <div className="mt-3 flex gap-2">
            <span className="flex h-12 items-center rounded-xl bg-surface-container-low px-3 text-[14px] font-semibold text-on-surface-variant">
              +91
            </span>
            <input
              className="h-12 min-w-0 flex-1 rounded-xl border border-outline-variant/50 bg-surface-container-low px-3 text-[15px]"
              inputMode="numeric"
              maxLength={10}
              placeholder="98XXXXXXXX"
              value={friendPhone}
              onChange={(e) => setFriendPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
              disabled={busy}
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="pressable mt-3 flex h-11 w-full items-center justify-center rounded-xl bg-surface-container-high text-[14px] font-bold disabled:opacity-60"
          >
            {busy ? "Opening…" : "Message friend"}
          </button>
        </form>

        {msg ? <p className="text-center text-sm font-semibold text-[#166534]">{msg}</p> : null}
        {err ? <p className="text-center text-sm text-red-700">{err}</p> : null}

        <Link href="/hub" className="block py-3 text-center text-[14px] font-semibold text-on-surface-variant">
          Back to hub
        </Link>
      </div>
    </main>
  );
}
