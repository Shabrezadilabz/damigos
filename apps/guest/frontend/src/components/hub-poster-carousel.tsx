"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { FOOD } from "@/lib/hub-media";

type Poster = {
  id: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  cta: string;
  href: string;
  /** Tailwind-friendly gradient stops as inline style */
  gradient: string;
  accent: string;
  image: string;
  emoji?: string;
};

const POSTERS: Poster[] = [
  {
    id: "festival",
    eyebrow: "Festival on D'aMigo's",
    title: "Celebrate & Order Direct",
    subtitle: "Packaging rewards · local kitchens",
    cta: "Order Now",
    href: "/hub/collections/festival",
    gradient: "radial-gradient(ellipse at 50% 20%, #ff6b8a 0%, #e23744 48%, #6b0012 100%)",
    accent: "#f3bf51",
    image: FOOD.festival,
    emoji: "🥁",
  },
  {
    id: "promise",
    eyebrow: "Delivery Promise",
    title: "Fast kitchens near you",
    subtitle: "Direct D2C · skip aggregator wait",
    cta: "See kitchens",
    href: "/hub/collections/promise",
    gradient: "radial-gradient(ellipse at 70% 30%, #fb7185 0%, #be123c 45%, #450a0a 100%)",
    accent: "#fecdd3",
    image: FOOD.biryani,
    emoji: "⚡",
  },
  {
    id: "value",
    eyebrow: "Best Value",
    title: "Lower than other apps",
    subtitle: "Matched dishes · 0% commission",
    cta: "Shop deals",
    href: "/hub/collections/bestsellers",
    gradient: "radial-gradient(ellipse at 40% 0%, #fbbf24 0%, #ea580c 50%, #7c2d12 100%)",
    accent: "#fef08a",
    image: FOOD.bowl,
    emoji: "✨",
  },
  {
    id: "new",
    eyebrow: "New on D'aMigo's",
    title: "Fresh kitchens just in",
    subtitle: "Better value · packaging perks",
    cta: "Explore new",
    href: "/hub/collections/new",
    gradient: "radial-gradient(ellipse at 60% 10%, #6ee7b7 0%, #059669 45%, #064e3b 100%)",
    accent: "#a7f3d0",
    image: FOOD.healthy,
    emoji: "🎁",
  },
  {
    id: "brands",
    eyebrow: "Top Brands",
    title: "Most-loved near you",
    subtitle: "Trusted kitchens · Direct rates",
    cta: "Browse brands",
    href: "/hub/collections/brands",
    gradient: "radial-gradient(ellipse at 30% 20%, #c084fc 0%, #7c3aed 50%, #3b0764 100%)",
    accent: "#e9d5ff",
    image: FOOD.burger,
    emoji: "👑",
  },
];

/** Ownly-style map backdrop + floating side-by-side ad posters */
export function HubPosterCarousel() {
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    let raf = 0;
    let paused = false;
    let resumeTimer: number | undefined;
    const half = () => el.scrollWidth / 2;
    const tick = () => {
      if (!paused && el.scrollWidth > el.clientWidth) {
        el.scrollLeft += 0.35;
        // Seamless loop: content is duplicated — wrap without jumping to 0 mid-frame
        const mid = half();
        if (mid > 0 && el.scrollLeft >= mid) {
          el.scrollLeft -= mid;
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
      }, 2200);
    };
    el.addEventListener("pointerdown", pause);
    el.addEventListener("touchstart", pause, { passive: true });
    el.addEventListener("mouseenter", pause);
    el.addEventListener("mouseleave", scheduleResume);
    el.addEventListener("touchend", scheduleResume);
    el.addEventListener("scroll", () => {
      /* user drag — keep paused until scheduleResume */
    }, { passive: true });
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
      {/* Map / mapper-like backdrop */}
      <div
        className="pointer-events-none absolute -inset-x-4 -top-2 bottom-2 overflow-hidden rounded-3xl opacity-[0.55]"
        aria-hidden
      >
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#fff5f5_0%,#fcf9f8_55%,transparent_100%)]" />
        <div
          className="absolute inset-0 opacity-70"
          style={{
            backgroundImage: `
              radial-gradient(circle at 20% 30%, rgba(226,55,68,0.12) 0 2px, transparent 3px),
              radial-gradient(circle at 70% 60%, rgba(178,18,42,0.1) 0 2px, transparent 3px),
              linear-gradient(rgba(180,80,90,0.07) 1px, transparent 1px),
              linear-gradient(90deg, rgba(180,80,90,0.07) 1px, transparent 1px)
            `,
            backgroundSize: "18px 18px, 22px 22px, 28px 28px, 28px 28px",
          }}
        />
        {/* soft “roads” */}
        <svg className="absolute inset-0 h-full w-full opacity-30" viewBox="0 0 400 200" preserveAspectRatio="none">
          <path
            d="M0 120 C80 40, 160 160, 240 80 S360 40, 400 100"
            fill="none"
            stroke="#e23744"
            strokeWidth="1.2"
            strokeDasharray="4 6"
          />
          <path
            d="M0 60 C100 100, 180 20, 280 90 S360 150, 400 70"
            fill="none"
            stroke="#b7122a"
            strokeWidth="1"
            strokeDasharray="3 8"
          />
        </svg>
      </div>

      <div
        ref={scrollerRef}
        className="hub-h-scroll no-scrollbar relative -mx-4 flex gap-3 overflow-x-auto px-4 pb-3 pt-2"
      >
        {[...POSTERS, ...POSTERS].map((p, i) => (
          <Link
            key={`${p.id}-${i}`}
            href={p.href}
            className={`hub-poster-float pressable relative h-[11.5rem] w-[82%] max-w-[19rem] shrink-0 overflow-hidden rounded-[1.35rem] text-white shadow-[0_12px_32px_rgba(120,20,40,0.28)] ring-1 ring-white/20 ${
              i % 2 === 0 ? "hub-poster-float-a" : "hub-poster-float-b"
            }`}
          >
            <div
              className="hub-float-inner absolute inset-0"
              style={{ animationDelay: `${(i % POSTERS.length) * 0.18}s` }}
            >
              <div className="absolute inset-0" style={{ background: p.gradient }} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.image}
                alt=""
                className="absolute inset-0 h-full w-full object-cover opacity-25 mix-blend-overlay"
                draggable={false}
              />
              <div
                className="pointer-events-none absolute inset-2.5 rounded-[1.05rem] border"
                style={{ borderColor: `${p.accent}99` }}
              />
              <div
                className="pointer-events-none absolute inset-x-5 top-3 h-1 rounded-full opacity-90"
                style={{
                  background: `repeating-linear-gradient(90deg, ${p.accent} 0 5px, transparent 5px 10px)`,
                }}
              />
              <div className="relative z-10 flex h-full flex-col items-center justify-center px-5 text-center">
                <p
                  className="text-[10px] font-extrabold uppercase tracking-[0.18em]"
                  style={{ color: p.accent }}
                >
                  {p.eyebrow}
                </p>
                <h2 className="font-display mt-1 text-[22px] font-black leading-tight tracking-tight drop-shadow">
                  {p.title}
                </h2>
                <p className="mt-1.5 max-w-[14rem] text-[11px] font-medium text-white/90">{p.subtitle}</p>
                <span className="mt-3 inline-flex rounded-full bg-white px-5 py-2 text-[13px] font-extrabold text-primary shadow-md">
                  {p.cta}
                </span>
              </div>
              <span className="pointer-events-none absolute bottom-1 left-2 text-[28px] opacity-70" aria-hidden>
                {p.emoji}
              </span>
              <span className="pointer-events-none absolute bottom-1 right-2 text-[28px] opacity-70" aria-hidden>
                {p.emoji}
              </span>
              <div
                className="pointer-events-none absolute -right-4 -top-4 h-20 w-20 rounded-full blur-2xl"
                style={{ background: p.accent, opacity: 0.35 }}
              />
            </div>
          </Link>
        ))}
      </div>

      {/* peek dots */}
      <div className="relative flex justify-center gap-1.5 pt-0.5">
        {POSTERS.map((p) => (
          <span key={p.id} className="h-1 w-1 rounded-full bg-primary/35" />
        ))}
      </div>
    </section>
  );
}
