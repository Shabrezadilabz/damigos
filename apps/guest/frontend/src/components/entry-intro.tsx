"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { YummLogo } from "@/components/yumm-logo";
import { FOOD } from "@/lib/hub-media";
import type { HubPerkRailItem } from "@/lib/api";

const SEEN_KEY = "yumm_intro_seen";
const DONE_AT = 5000;

type Props = {
  offers: HubPerkRailItem[];
};

/** Five-second entry on the landing page. The page underneath stays usable. */
export function EntryIntro({ offers }: Props) {
  const [phase, setPhase] = useState<"pending" | "show" | "done">("pending");

  useEffect(() => {
    try {
      if (sessionStorage.getItem(SEEN_KEY) === "1") {
        setPhase("done");
        return;
      }
    } catch {
      setPhase("done");
      return;
    }
    const reduce =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      try {
        sessionStorage.setItem(SEEN_KEY, "1");
      } catch {
        /* ignore */
      }
      setPhase("done");
      return;
    }
    setPhase("show");
    const done = window.setTimeout(() => {
      try {
        sessionStorage.setItem(SEEN_KEY, "1");
      } catch {
        /* ignore */
      }
      setPhase("done");
    }, DONE_AT);
    return () => window.clearTimeout(done);
  }, []);

  if (phase !== "show") return null;

  const live = offers.slice(0, 3);

  return (
    <div className="yumm-entry" role="status" aria-label="YUMM">
      <button
        type="button"
        className="yumm-entry-skip pressable min-h-11 rounded-full border border-[#381932]/20 bg-white/80 px-4 text-[13px] font-bold text-[#381932]"
        onClick={() => {
          try {
            sessionStorage.setItem(SEEN_KEY, "1");
          } catch {
            /* ignore */
          }
          setPhase("done");
        }}
      >
        Skip
      </button>

      <div className="yumm-entry-stage yumm-entry-brand">
        <div className="text-center">
          <YummLogo priority className="mx-auto w-[min(70vw,320px)]" />
          <p className="mt-4 text-[12px] font-bold uppercase tracking-[0.18em] text-[#806D7B]">
            Good Food. Great Mood.
          </p>
        </div>
      </div>

      <div className="yumm-entry-stage yumm-entry-food">
        <div className="grid w-full max-w-3xl grid-cols-3 gap-3">
          {[FOOD.biryani, FOOD.thali, FOOD.bowl].map((src) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={src}
              src={src}
              alt=""
              className="aspect-[4/5] w-full rounded-[24px] object-cover shadow-[0_16px_40px_rgba(56,25,50,0.18)]"
            />
          ))}
        </div>
      </div>

      <div className="yumm-entry-stage yumm-entry-lines">
        <div className="max-w-xl text-center">
          <p className="yumm-entry-line font-[family-name:var(--font-jakarta)] text-[28px] font-extrabold leading-tight text-[#261522] sm:text-[40px]">
            CRAVINGS? WE&apos;VE GOT YOU.
          </p>
          <p className="yumm-entry-line mt-3 text-[16px] font-semibold text-[#381932]">
            FRESH FOOD. FAST DELIVERY.
          </p>
          <p className="yumm-entry-line mt-2 text-[15px] text-[#806D7B]">
            YOUR FAVOURITES, JUST A TAP AWAY.
          </p>
        </div>
      </div>

      <div className="yumm-entry-stage yumm-entry-offers">
        <div className="w-full max-w-lg space-y-2">
          <p className="text-center text-[11px] font-bold uppercase tracking-[0.16em] text-[#D9A441]">
            Published offers
          </p>
          {live.length === 0 ? (
            <p className="rounded-2xl bg-white/70 px-4 py-3 text-center text-[14px] text-[#806D7B]">
              Offers appear here when a kitchen publishes them.
            </p>
          ) : (
            live.map((offer) => (
              <p key={offer.id} className="rounded-2xl bg-white/80 px-4 py-3 text-[14px] font-semibold text-[#261522]">
                {offer.kitchenName}: {offer.title}
              </p>
            ))
          )}
        </div>
      </div>

      <div className="yumm-entry-stage yumm-entry-finale bg-[#381932] text-[#FFF3E6]">
        <div className="max-w-lg px-6 text-center">
          <p className="text-[12px] font-bold uppercase tracking-[0.18em] text-[#D9A441]">YUMM</p>
          <p className="mt-3 font-[family-name:var(--font-jakarta)] text-[28px] font-extrabold leading-tight sm:text-[36px]">
            YOUR NEXT DELICIOUS MOMENT STARTS HERE
          </p>
          <Link
            href="/hub"
            className="yumm-entry-cta pressable mt-6 inline-flex min-h-12 items-center gap-2 rounded-full bg-[#D9A441] px-6 text-[15px] font-extrabold text-[#381932]"
          >
            BOOK NOW
            <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
