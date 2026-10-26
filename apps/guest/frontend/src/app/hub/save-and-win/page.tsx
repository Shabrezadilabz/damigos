"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { MaterialIcon } from "@/components/material-icon";
import { getGuestToken } from "@/lib/session";

const REF_KEY = "damigos_referral_code";
const REF_SHARES_KEY = "damigos_referral_shares";

const SAMPLE_OFFERS = [
  "₹50 off next order",
  "Free delivery voucher",
  "Scratch: up to ₹100",
  "Buy 1 get dessert bite",
  "₹75 kitchen credit",
  "Win up to ₹600 pool",
];

function ensureReferralCode(): string {
  if (typeof window === "undefined") return "guest";
  const existing = localStorage.getItem(REF_KEY);
  if (existing) return existing;
  const token = getGuestToken();
  const seed = token?.slice(-8) || Math.random().toString(36).slice(2, 10);
  const code = `DMG${seed.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8)}`;
  localStorage.setItem(REF_KEY, code);
  return code;
}

/** Refer-a-friend: share YOUR invite link to their WhatsApp; scratch tease after share. */
export default function SaveAndWinPage() {
  const [friendPhone, setFriendPhone] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [refCode, setRefCode] = useState("…");
  const [shareCount, setShareCount] = useState(0);
  const [scratch, setScratch] = useState<string | null>(null);

  useEffect(() => {
    setRefCode(ensureReferralCode());
    try {
      setShareCount(Number(localStorage.getItem(REF_SHARES_KEY) || "0") || 0);
    } catch {
      setShareCount(0);
    }
  }, []);

  const shareUrl = useMemo(() => {
    if (typeof window === "undefined") {
      return `https://damigos-guest-web.vercel.app/hub?ref=${refCode}`;
    }
    return `${window.location.origin}/hub?ref=${encodeURIComponent(refCode)}`;
  }, [refCode]);

  const shareText =
    `Hey! Order direct on D'aMigo's with my invite — local kitchens, packaging rewards & Spark games.\n` +
    `Open my link (then say HI on WhatsApp to opt in):\n${shareUrl}`;

  function bumpShare(offer?: string) {
    const next = shareCount + 1;
    setShareCount(next);
    try {
      localStorage.setItem(REF_SHARES_KEY, String(next));
    } catch {
      /* ignore */
    }
    const picked = offer ?? SAMPLE_OFFERS[Math.floor(Math.random() * SAMPLE_OFFERS.length)]!;
    setScratch(picked);
    setMsg(
      `Shared! Scratch tease unlocked: ${picked}. Full reward unlocks when your friend opts in on WhatsApp.`,
    );
  }

  async function onShareNative() {
    setErr(null);
    setMsg(null);
    try {
      if (navigator.share) {
        await navigator.share({
          title: "D'aMigo's invite",
          text: shareText,
          url: shareUrl,
        });
        bumpShare();
        return;
      }
      await navigator.clipboard.writeText(shareText);
      bumpShare();
      setMsg((m) => `${m ?? ""} Link copied — paste in WhatsApp.`.trim());
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return;
      try {
        await navigator.clipboard.writeText(shareText);
        bumpShare();
      } catch {
        setErr("Could not share — copy the link below.");
      }
    }
  }

  function onWhatsAppToFriend(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    const digits = friendPhone.replace(/\D/g, "");
    if (digits.length < 10) {
      setErr("Enter your friend’s 10-digit WhatsApp number.");
      return;
    }
    const e164 = digits.length === 10 ? `91${digits}` : digits;
    window.open(
      `https://wa.me/${e164}?text=${encodeURIComponent(shareText)}`,
      "_blank",
      "noopener,noreferrer",
    );
    bumpShare();
  }

  function onWhatsAppPicker() {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, "_blank", "noopener,noreferrer");
    bumpShare();
  }

  return (
    <main className="min-h-dvh bg-surface-container-low pb-10">
      <div className="relative overflow-hidden border-b border-[#E4E4E7] bg-[#FAFAFA] px-4 pb-14 pt-safe text-[#171717]">
        <div className="flex items-center justify-between py-3">
          <Link
            href="/hub"
            className="pressable flex h-11 w-11 items-center justify-center rounded-full border border-[#E4E4E7] bg-white"
            aria-label="Back to hub"
          >
            <MaterialIcon name="arrow_back" className="text-[22px]" />
          </Link>
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#737373]">
            Refer &amp; Win
          </span>
          <span className="w-11" aria-hidden />
        </div>
        <h1 className="font-display text-[32px] font-medium leading-tight tracking-tight">
          Win up to <span className="qa-highlight">₹600</span>
        </h1>
        <p className="mt-2 max-w-sm text-[14px] font-light text-[#525252]">
          Share your invite link to a friend&apos;s WhatsApp. When they open it and opt in, you unlock
          scratch cards &amp; random kitchen offers.
        </p>
        <p className="mt-3 inline-flex rounded-full border border-[#E4E4E7] bg-white px-3 py-1 font-mono text-[11px] font-medium text-[#171717]">
          Your code · {refCode} · shares {shareCount}
        </p>
      </div>

      <div className="-mt-8 space-y-3 px-4">
        <div className="rounded-lg bg-surface-container-lowest p-4 shadow-sm border border-border">
          <p className="text-[12px] font-bold uppercase tracking-wide text-on-surface-variant">
            Your invite link
          </p>
          <p className="mt-2 break-all text-[13px] font-semibold text-foreground">{shareUrl}</p>
          <div className="mt-3 flex flex-col gap-2">
            <button
              type="button"
              className="pressable flex h-11 items-center justify-center gap-2 rounded-full bg-[#171717] text-[14px] font-medium text-white hover:bg-zinc-700"
              onClick={() => void onShareNative()}
            >
              <MaterialIcon name="ios_share" className="text-[18px]" />
              Share invite
            </button>
            <button
              type="button"
              className="pressable flex h-11 items-center justify-center gap-2 rounded-xl bg-[#25D366] text-[14px] font-bold text-white"
              onClick={onWhatsAppPicker}
            >
              <MaterialIcon name="chat" className="text-[18px]" />
              WhatsApp (pick a friend)
            </button>
          </div>
        </div>

        <form
          onSubmit={onWhatsAppToFriend}
          className="space-y-3 rounded-lg bg-surface-container-lowest p-4 shadow-sm border border-border"
        >
          <p className="text-[13px] font-bold">Send to friend&apos;s number</p>
          <p className="text-[12px] text-on-surface-variant">
            Opens a chat with <span className="font-semibold">their</span> WhatsApp — not D'aMigo's line —
            with your referral link prefilled.
          </p>
          <input
            className="h-12 w-full rounded-xl border border-border px-3 text-[16px] tracking-wide"
            inputMode="tel"
            placeholder="Friend’s 10-digit mobile"
            value={friendPhone}
            onChange={(e) => setFriendPhone(e.target.value)}
            data-testid="refer-friend-phone"
          />
          <button
            type="submit"
            className="pressable flex h-11 w-full items-center justify-center rounded-xl border border-primary text-[14px] font-bold text-primary"
          >
            Open their WhatsApp
          </button>
        </form>

        {scratch ? (
          <div
            className="rounded-2xl bg-gradient-to-br from-amber-50 to-orange-100 p-4 ring-1 ring-amber-200"
            data-testid="refer-scratch-tease"
          >
            <p className="text-[11px] font-bold uppercase tracking-wide text-amber-800">
              Scratch tease
            </p>
            <p className="mt-1 font-display text-[20px] font-extrabold text-amber-950">{scratch}</p>
            <p className="mt-1 text-[12px] text-amber-900/80">
              Confirmed when your friend accepts &amp; opts in. Random kitchen offers attach then.
            </p>
          </div>
        ) : null}

        {msg ? <p className="text-center text-[13px] font-semibold text-success">{msg}</p> : null}
        {err ? <p className="text-center text-sm text-red-700">{err}</p> : null}

        <Link href="/hub" className="pressable mx-auto block py-3 text-center text-[14px] font-bold text-primary">
          Back to hub
        </Link>
      </div>
    </main>
  );
}
