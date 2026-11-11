"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MaterialIcon } from "@/components/material-icon";
import { ProfileConsentSheet } from "@/components/profile-consent-sheet";
import { FOOD } from "@/lib/hub-media";
import { getGuestToken } from "@/lib/session";

export type RewardPoster = {
  id: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  cta: string;
  href: string;
  image: string;
  accent: string;
};

const DEFAULT_POSTERS: RewardPoster[] = [
  {
    id: "claim",
    eyebrow: "Ready to claim",
    title: "Claim your perk",
    subtitle: "Spin, scratch & packaging rewards waiting",
    cta: "Claim now",
    href: "/me/rewards",
    image: FOOD.dessert,
    accent: "from-[#381932] via-[#5a3352] to-[#b98aae]",
  },
  {
    id: "restaurant",
    eyebrow: "Kitchen deals",
    title: "Restaurant offers",
    subtitle: "Direct D2C perks from kitchens near you",
    cta: "Browse kitchens",
    href: "/hub/collections/bestsellers",
    image: FOOD.grill,
    accent: "from-[#7a0014] via-[#b2122a] to-[#f3bf51]",
  },
  {
    id: "all",
    eyebrow: "Today live",
    title: "All offers",
    subtitle: "Festival · value · delivery promise",
    cta: "See all offers",
    href: "/me/offers",
    image: FOOD.festival,
    accent: "from-[#0f766e] via-[#14b8a6] to-[#99f6e4]",
  },
  {
    id: "refer",
    eyebrow: "Invite & earn",
    title: "Refer & Win ₹200",
    subtitle: "Share your link · unlock scratch when friends opt in",
    cta: "Invite friends",
    href: "/hub/save-and-win",
    image: FOOD.bowl,
    accent: "from-[#92400e] via-[#f59e0b] to-[#fde68a]",
  },
];

type Props = {
  open: boolean;
  onClose: () => void;
  posters?: RewardPoster[];
};

/** Full-screen transparent reward posters carousel — close dismisses all. */
export function RewardPostersOverlay({ open, onClose, posters }: Props) {
  const router = useRouter();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [authOpen, setAuthOpen] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  const items = useMemo(
    () => (posters && posters.length > 0 ? posters : DEFAULT_POSTERS),
    [posters],
  );

  useEffect(() => {
    if (!open) return;
    setActive(0);
    const el = scrollerRef.current;
    if (el) el.scrollTo({ left: 0 });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  function go(href: string) {
    onClose();
    router.push(href);
  }

  function onPosterActivate(href: string) {
    if (getGuestToken()) {
      go(href);
      return;
    }
    setPendingHref(href);
    setAuthOpen(true);
  }

  function onAuthComplete() {
    setAuthOpen(false);
    const href = pendingHref ?? "/me/rewards";
    setPendingHref(null);
    go(href);
  }

  return (
    <>
      <div
        className="fixed inset-0 z-[60] flex flex-col bg-black/45 backdrop-blur-[3px]"
        role="dialog"
        aria-modal="true"
        aria-label="Reward posters"
        data-testid="reward-posters-overlay"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className="flex items-center justify-between px-4 pb-2 pt-safe">
          <p className="text-[12px] font-bold uppercase tracking-wider text-white/80">
            Rewards · swipe
          </p>
          <button
            type="button"
            className="pressable flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white ring-1 ring-white/30"
            aria-label="Close all posters"
            data-testid="reward-posters-close"
            onClick={onClose}
          >
            <MaterialIcon name="close" className="text-[22px]" />
          </button>
        </div>

        <div
          ref={scrollerRef}
          className="no-scrollbar flex flex-1 snap-x snap-mandatory items-center gap-4 overflow-x-auto px-6 pb-8"
          onScroll={() => {
            const el = scrollerRef.current;
            if (!el) return;
            const cardW = el.clientWidth * 0.82 + 16;
            if (cardW <= 0) return;
            setActive(Math.round(el.scrollLeft / cardW) % items.length);
          }}
        >
          {items.map((p) => (
            <button
              key={p.id}
              type="button"
              data-testid={`reward-poster-${p.id}`}
              className="pressable relative h-[70dvh] max-h-[32rem] w-[82%] max-w-sm shrink-0 snap-center overflow-hidden rounded-[28px] text-left shadow-2xl ring-1 ring-white/20"
              onClick={() => onPosterActivate(p.href)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.image} alt="" className="absolute inset-0 h-full w-full object-cover" />
              <div className={`absolute inset-0 bg-gradient-to-t ${p.accent} opacity-85`} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
              <div className="relative z-10 flex h-full flex-col justify-end p-5 text-white">
                <span className="inline-flex w-fit rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider backdrop-blur-sm">
                  {p.eyebrow}
                </span>
                <h3 className="mt-3 font-display text-[28px] font-extrabold leading-tight tracking-tight">
                  {p.title}
                </h3>
                <p className="mt-1.5 text-[14px] font-medium text-white/85">{p.subtitle}</p>
                <span className="mt-5 inline-flex items-center justify-center gap-1.5 rounded-full bg-white px-4 py-2.5 text-[13px] font-extrabold text-[#171717]">
                  {p.cta}
                  <MaterialIcon name="arrow_forward" className="text-[16px]" />
                </span>
              </div>
            </button>
          ))}
        </div>

        <div className="flex items-center justify-center gap-1.5 pb-safe pb-4">
          {items.map((p, i) => (
            <span
              key={p.id}
              className={`h-1.5 rounded-full transition-all ${
                i === active ? "w-5 bg-white" : "w-1.5 bg-white/40"
              }`}
            />
          ))}
        </div>
      </div>

      <ProfileConsentSheet
        open={authOpen}
        onComplete={onAuthComplete}
      />
    </>
  );
}

export { DEFAULT_POSTERS as REWARD_POSTERS };
