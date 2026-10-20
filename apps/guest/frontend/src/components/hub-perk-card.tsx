"use client";

import Link from "next/link";
import type { HubPerkRailItem } from "@/lib/api";
import { coverForPerk, perkPosterStyle } from "@/lib/hub-media";

function kindLabel(kind: HubPerkRailItem["kind"]) {
  if (kind === "platform") return "Platform offer";
  if (kind === "claim") return "Ready to redeem";
  return "Kitchen perk";
}

/** Poster-style Direct Perks card — unique layout + food background per index */
export function HubPerkCard({ perk, index }: { perk: HubPerkRailItem; index: number }) {
  const image = coverForPerk(perk.kitchenName, perk.href, index);
  const { variant, accent } = perkPosterStyle(index, perk.kind);

  return (
    <Link
      href={perk.href}
      data-testid="hub-perk-card"
      className="pressable relative flex h-[11.5rem] w-[16rem] shrink-0 snap-start flex-col justify-between overflow-hidden rounded-[1.25rem] text-white shadow-[0_10px_28px_rgba(0,0,0,0.28)] ring-1 ring-white/10"
    >
      {/* Background photo */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={image}
        alt=""
        className={`absolute inset-0 h-full w-full object-cover ${
          variant === "photo-side"
            ? "scale-110 object-[70%_center]"
            : variant === "photo-bottom"
              ? "object-[center_70%]"
              : variant === "split-diagonal"
                ? "scale-105 object-[30%_40%]"
                : "object-center"
        }`}
      />

      {/* Variant overlays — each card reads differently */}
      {variant === "photo-full" ? (
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-black/15" />
      ) : null}
      {variant === "photo-bottom" ? (
        <>
          <div className="absolute inset-0 bg-gradient-to-b from-[#161616]/90 via-[#161616]/35 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black via-black/70 to-transparent" />
        </>
      ) : null}
      {variant === "photo-side" ? (
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-black/10" />
      ) : null}
      {variant === "split-diagonal" ? (
        <>
          <div className="absolute inset-0 bg-[linear-gradient(135deg,#161616_0%,#161616_42%,transparent_58%)]" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/30" />
        </>
      ) : null}
      {variant === "gold-frame" ? (
        <>
          <div className="absolute inset-0 bg-gradient-to-br from-[#161616]/92 via-[#161616]/55 to-[#7a0014]/70" />
          <div className="pointer-events-none absolute inset-2 rounded-[1rem] border border-[#f3bf51]/55" />
          <div className="pointer-events-none absolute inset-x-4 top-3 h-px bg-gradient-to-r from-transparent via-[#f3bf51] to-transparent" />
        </>
      ) : null}

      <div
        className={`pointer-events-none absolute -bottom-6 -right-4 h-32 w-32 rounded-full bg-gradient-to-tl ${accent.glow} blur-2xl`}
      />

      <div className="relative z-10 flex h-full flex-col justify-between p-4">
        <div>
          <span
            className={`inline-flex rounded-full bg-black/35 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm ${accent.tag}`}
          >
            {kindLabel(perk.kind)}
          </span>
          <p className="mt-2 line-clamp-1 font-display text-[17px] font-extrabold leading-tight drop-shadow-sm">
            {perk.kitchenName}
          </p>
          <p className="mt-1 line-clamp-2 text-[12px] font-medium leading-snug text-white/85 drop-shadow">
            {perk.title}
          </p>
        </div>

        <div className="mt-3 flex items-end justify-between gap-2">
          <div>
            <p className="text-[13px] font-bold tabular drop-shadow">
              {perk.coinsHint > 0 ? `${perk.coinsHint} coins` : "Free perk"}
            </p>
            {variant === "gold-frame" || variant === "photo-full" ? (
              <p className="text-[10px] font-semibold text-white/70">Direct D2C</p>
            ) : null}
          </div>
          <span
            className={`shrink-0 rounded-full ${accent.chip} px-2.5 py-1.5 text-[10px] font-extrabold uppercase tracking-wide text-white shadow-md`}
          >
            {perk.badge}
          </span>
        </div>
      </div>

      {/* Decorative corner mark — varies by index */}
      {index % 3 === 0 ? (
        <span className="pointer-events-none absolute right-3 top-3 text-[18px] opacity-80" aria-hidden>
          ✦
        </span>
      ) : null}
      {index % 3 === 1 ? (
        <span
          className="pointer-events-none absolute right-0 top-0 h-16 w-16 rounded-bl-[2.5rem] bg-gradient-to-bl from-white/20 to-transparent"
          aria-hidden
        />
      ) : null}
      {index % 3 === 2 ? (
        <span
          className="pointer-events-none absolute bottom-0 left-0 h-1.5 w-full bg-gradient-to-r from-[#f3bf51] via-primary to-transparent"
          aria-hidden
        />
      ) : null}
    </Link>
  );
}
