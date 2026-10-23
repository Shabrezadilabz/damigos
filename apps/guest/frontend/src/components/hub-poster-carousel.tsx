"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { FOOD } from "@/lib/hub-media";

type Poster = {
  id: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  cta: string;
  href: string;
  image: string;
};

const POSTERS: Poster[] = [
  {
    id: "festival",
    eyebrow: "Live near you",
    title: "Festival kitchens open",
    subtitle: "Order direct · packaging rewards",
    cta: "Order Now",
    href: "/hub/collections/festival",
    image: FOOD.festival,
  },
  {
    id: "promise",
    eyebrow: "Delivery Promise",
    title: "Hot food, faster drop",
    subtitle: "Skip aggregator wait · Direct D2C",
    cta: "See kitchens",
    href: "/hub/collections/promise",
    image: FOOD.biryani,
  },
  {
    id: "value",
    eyebrow: "Best Value",
    title: "Lower than other apps",
    subtitle: "Matched dishes · 0% commission",
    cta: "Shop deals",
    href: "/hub/collections/bestsellers",
    image: FOOD.bowl,
  },
  {
    id: "grill",
    eyebrow: "Tonight's grill",
    title: "Sizzle & share",
    subtitle: "Fresh from local charcoal",
    cta: "Explore",
    href: "/hub/collections/new",
    image: FOOD.grill,
  },
  {
    id: "dessert",
    eyebrow: "Sweet cravings",
    title: "Dessert run",
    subtitle: "Scratch & win after opt-in",
    cta: "Browse",
    href: "/hub/collections/brands",
    image: FOOD.dessert,
  },
];

function liveClockLabel(d: Date) {
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/** Hub hero carousel — photo-forward, auto-scroll without transform flicker */
export function HubPosterCarousel() {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [now, setNow] = useState(() => new Date());
  const [active, setActive] = useState(0);

  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    let raf = 0;
    let paused = false;
    let resumeTimer: number | undefined;
    const half = () => el.scrollWidth / 2;

    const tick = () => {
      if (!paused && el.scrollWidth > el.clientWidth) {
        el.scrollLeft += 0.45;
        const mid = half();
        if (mid > 0 && el.scrollLeft >= mid - 1) {
          el.scrollLeft -= mid;
        }
        const cardW = el.clientWidth * 0.82 + 12;
        if (cardW > 0) {
          const idx = Math.round(el.scrollLeft / cardW) % POSTERS.length;
          setActive(idx);
        }
      }
      raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);

    const pause = () => {
      paused = true;
      if (resumeTimer) window.clearTimeout(resumeTimer);
    };
    const scheduleResume = () => {
      if (resumeTimer) window.clearTimeout(resumeTimer);
      resumeTimer = window.setTimeout(() => {
        paused = false;
      }, 2800);
    };

    el.addEventListener("pointerdown", pause);
    el.addEventListener("touchstart", pause, { passive: true });
    el.addEventListener("mouseenter", pause);
    el.addEventListener("mouseleave", scheduleResume);
    el.addEventListener("touchend", scheduleResume);
    return () => {
      window.cancelAnimationFrame(raf);
      if (resumeTimer) window.clearTimeout(resumeTimer);
      el.removeEventListener("pointerdown", pause);
      el.removeEventListener("touchstart", pause);
      el.removeEventListener("mouseenter", pause);
      el.removeEventListener("mouseleave", scheduleResume);
      el.removeEventListener("touchend", scheduleResume);
    };
  }, []);

  return (
    <section className="relative mb-6" data-testid="hub-festival-hero">
      <div className="mb-2 flex items-end justify-between px-0.5">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-primary">
          Happening now
        </p>
        <p className="text-[11px] font-semibold tabular text-on-surface-variant" suppressHydrationWarning>
          {liveClockLabel(now)} · live
        </p>
      </div>

      <div
        ref={scrollerRef}
        className="hub-h-scroll no-scrollbar relative -mx-4 flex gap-3 overflow-x-auto px-4 pb-2"
      >
        {[...POSTERS, ...POSTERS].map((p, i) => (
          <Link
            key={`${p.id}-${i}`}
            href={p.href}
            className="relative h-[12.5rem] w-[82%] max-w-[20rem] shrink-0 overflow-hidden rounded-[1.35rem] text-white shadow-[0_10px_28px_rgba(40,20,20,0.22)] ring-1 ring-black/10"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={p.image}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              draggable={false}
              loading={i < 3 ? "eager" : "lazy"}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-black/15" />
            <div className="relative z-10 flex h-full flex-col justify-end px-4 pb-4 pt-3">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-amber-200">
                {p.eyebrow}
              </p>
              <h2 className="font-display mt-1 text-[22px] font-black leading-tight tracking-tight">
                {p.title}
              </h2>
              <p className="mt-1 max-w-[16rem] text-[12px] font-medium text-white/90">{p.subtitle}</p>
              <span className="mt-3 inline-flex w-fit rounded-full bg-white px-4 py-1.5 text-[12px] font-extrabold text-primary">
                {p.cta}
              </span>
            </div>
          </Link>
        ))}
      </div>

      <div className="relative flex justify-center gap-1.5 pt-1">
        {POSTERS.map((p, i) => (
          <span
            key={p.id}
            className={`h-1.5 rounded-full transition-all ${
              i === active ? "w-4 bg-primary" : "w-1.5 bg-primary/30"
            }`}
          />
        ))}
      </div>
    </section>
  );
}
