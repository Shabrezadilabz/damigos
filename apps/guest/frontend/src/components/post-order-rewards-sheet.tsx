"use client";

import Link from "next/link";
import { MaterialIcon } from "@/components/material-icon";
import { WinConfetti } from "@/components/win-confetti";
import { formatInr } from "@/lib/api";

type Props = {
  open: boolean;
  totalPaise: number;
  rewardPaise: number;
  restaurantId: string;
  onDismiss: () => void;
};

const RULES = [
  "Rewards apply on your next Direct D2C order at the same kitchen unless marked Platform.",
  "Minimum order and expiry follow the offer Terms — unused credits roll into Loyalty.",
  "Redeem once per claim · not combinable with another kitchen-scoped claim unless stated.",
  "Referral wins unlock after your friend opts in on WhatsApp · max pool ₹200.",
];

/** Google Pay–style post-order rewards sheet — total, cards, rules, Redeem. */
export function PostOrderRewardsSheet({
  open,
  totalPaise,
  rewardPaise,
  restaurantId,
  onDismiss,
}: Props) {
  if (!open) return null;

  const won = Math.max(0, rewardPaise);
  const showWon = won > 0;
  const totalLabel = showWon ? formatInr(won) : formatInr(0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-inverse-surface/55 backdrop-blur-[2px] sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="post-order-rewards-title"
      data-testid="post-order-rewards-sheet"
    >
      <div className="sheet-spring relative flex max-h-[92dvh] w-full max-w-md flex-col overflow-hidden rounded-t-[28px] bg-[#F5F5F5] shadow-2xl sm:rounded-[28px]">
        <WinConfetti active={open} burstKey={won || 1} />

        <div className="relative shrink-0 overflow-hidden bg-[#F9C732] px-5 pb-8 pt-4 text-[#171717]">
          <div
            className="pointer-events-none absolute inset-0 opacity-30"
            aria-hidden
            style={{
              backgroundImage:
                "radial-gradient(circle at 85% 30%, rgba(180,100,0,0.35), transparent 40%), radial-gradient(circle at 70% 80%, rgba(180,100,0,0.2), transparent 35%)",
            }}
          />
          <div className="relative z-10 flex items-center justify-between">
            <button
              type="button"
              className="pressable flex h-9 w-9 items-center justify-center rounded-full"
              aria-label="Close rewards"
              onClick={onDismiss}
            >
              <MaterialIcon name="arrow_back" className="text-[22px]" />
            </button>
            <MaterialIcon name="more_vert" className="text-[20px] text-[#171717]/70" />
          </div>
          <div className="relative z-10 mt-4 flex items-end justify-between gap-3">
            <div>
              <p
                id="post-order-rewards-title"
                className="font-display text-[40px] font-extrabold leading-none tracking-tight tabular"
              >
                {totalLabel}
              </p>
              <p className="mt-1 text-[14px] font-medium">Total Rewards</p>
            </div>
            <div className="flex gap-1 text-[#B45309]/80" aria-hidden>
              <MaterialIcon name="emoji_events" className="text-[36px]" />
              <MaterialIcon name="celebration" className="mt-3 text-[28px]" />
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex aspect-square flex-col items-center justify-center rounded-2xl bg-white p-3 shadow-sm ring-1 ring-black/5">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#1A73E8]">
                <MaterialIcon
                  name="card_giftcard"
                  className="text-[28px] text-white [font-variation-settings:'FILL'_1]"
                />
              </div>
              <p className="mt-3 text-[12px] font-medium text-[#5F6368]">
                {showWon ? "You won" : "Better luck"}
              </p>
              <p className="font-display text-[20px] font-extrabold tabular text-[#171717]">
                {showWon ? formatInr(won) : "next time!"}
              </p>
            </div>

            <div className="relative flex aspect-square flex-col items-center justify-center overflow-hidden rounded-2xl bg-[#1A73E8] p-3 shadow-sm">
              <div
                className="pointer-events-none absolute inset-0 opacity-25"
                style={{
                  backgroundImage:
                    "radial-gradient(circle at 20% 20%, #fff 1px, transparent 1px), radial-gradient(circle at 80% 60%, #fff 1.5px, transparent 1.5px)",
                  backgroundSize: "18px 18px, 24px 24px",
                }}
              />
              <div className="relative z-10 flex h-14 w-14 items-center justify-center rounded-full bg-[#0B57D0]">
                <MaterialIcon
                  name="emoji_events"
                  className="text-[28px] text-white [font-variation-settings:'FILL'_1]"
                />
              </div>
              <p className="relative z-10 mt-3 text-center text-[12px] font-bold text-white/90">
                Scratch unlocked
              </p>
              <p className="relative z-10 text-[11px] font-medium text-white/70">Tap Rewards</p>
            </div>

            <div className="relative flex aspect-square flex-col items-center justify-center overflow-hidden rounded-2xl bg-[#0F9D58] p-3 shadow-sm">
              <div className="relative z-10 flex h-14 w-14 items-center justify-center rounded-full bg-[#0B8043]">
                <MaterialIcon name="local_fire_department" className="text-[28px] text-white" />
              </div>
              <p className="relative z-10 mt-3 text-center text-[12px] font-bold text-white">
                Kitchen perk
              </p>
              <p className="relative z-10 text-[11px] text-white/80">Order again</p>
            </div>

            <Link
              href="/hub/save-and-win"
              onClick={onDismiss}
              className="pressable flex aspect-square flex-col items-center justify-center rounded-2xl bg-white p-3 shadow-sm ring-1 ring-black/5"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#F9C732]/35">
                <MaterialIcon name="group_add" className="text-[28px] text-[#92400e]" />
              </div>
              <p className="mt-3 text-[12px] font-medium text-[#5F6368]">Refer &amp; Win</p>
              <p className="font-display text-[18px] font-extrabold text-[#171717]">₹200</p>
            </Link>
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#5F6368]">
              Rules &amp; conditions
            </p>
            <ul className="mt-2 space-y-2">
              {RULES.map((rule) => (
                <li key={rule} className="flex gap-2 text-[12px] leading-snug text-[#3C4043]">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#1A73E8]" />
                  <span>{rule}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-center text-[11px] text-[#5F6368]">
            Order total {formatInr(totalPaise)} · rewards sync to WhatsApp when connected
          </p>
        </div>

        <div className="shrink-0 space-y-2 border-t border-black/5 bg-white px-4 pb-safe pt-3">
          <Link
            href={`/r/${restaurantId}/menu?redeemed=1`}
            onClick={onDismiss}
            className="pressable flex h-12 w-full items-center justify-center rounded-full bg-[#1A73E8] text-[15px] font-extrabold text-white"
            data-testid="post-order-redeem"
          >
            Redeem
          </Link>
          <button
            type="button"
            className="pressable flex h-11 w-full items-center justify-center rounded-full text-[14px] font-bold text-[#3C4043]"
            onClick={onDismiss}
          >
            Track order
          </button>
        </div>
      </div>
    </div>
  );
}
