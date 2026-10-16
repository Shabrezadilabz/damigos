"use client";

import { useEffect, useState } from "react";
import { MaterialIcon } from "@/components/material-icon";
import { cn } from "@/lib/utils";

export type PromoSlide = {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  icon: string;
  gradient: string;
  imageSrc?: string;
  accent: string;
};

const DEFAULT_SLIDES: PromoSlide[] = [
  {
    id: "menu",
    title: "Menu AI from PDF",
    subtitle: "Modifier trees, allergens & photos in ~90 seconds",
    badge: "Instant",
    icon: "auto_stories",
    gradient: "from-[#ffdad6] via-[#ffb4ab] to-[#ff8a80]",
    accent: "text-[#5c0008]",
  },
  {
    id: "stickers",
    title: "Sticker QR rewards",
    subtitle: "Table micro-rewards — zero app download",
    badge: "NFC Ready",
    icon: "qr_code_scanner",
    gradient: "from-[#ffe082] via-[#ffd54f] to-[#ffb300]",
    accent: "text-amber-950",
  },
  {
    id: "whatsapp",
    title: "WhatsApp campaigns",
    subtitle: "1-touch weekly cap protects your brand",
    badge: "Anti-spam",
    icon: "forward_to_inbox",
    gradient: "from-[#e8def8] via-[#d0bcff] to-[#b69df8]",
    accent: "text-[#381e72]",
  },
  {
    id: "hub",
    title: "Direct ordering hub",
    subtitle: "Your guests, your data — post-aggregator layer",
    badge: "Zero commission",
    icon: "storefront",
    gradient: "from-[#c8e6c9] via-[#a5d6a7] to-[#66bb6a]",
    accent: "text-emerald-950",
  },
];

type Props = {
  slides?: PromoSlide[];
  variant?: "hero" | "compact";
  className?: string;
};

function SlidePreview({ imageSrc, icon, accent }: { imageSrc: string; icon: string; accent: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div className="flex h-full min-h-[180px] w-full items-center justify-center bg-white/40">
        <MaterialIcon name={icon} className={cn("text-[72px] opacity-70", accent)} />
      </div>
    );
  }
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={imageSrc}
      alt=""
      className="h-full min-h-[180px] w-full object-cover object-top"
      onError={() => setFailed(true)}
    />
  );
}

export function OnboardingPromoCarousel({ slides = DEFAULT_SLIDES, variant = "hero", className }: Props) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || slides.length < 2) return;
    const t = window.setInterval(() => setIndex((i) => (i + 1) % slides.length), 4500);
    return () => window.clearInterval(t);
  }, [paused, slides.length]);

  const slide = slides[index]!;
  const isHero = variant === "hero";

  return (
    <div
      className={cn("relative overflow-hidden rounded-2xl shadow-md", className)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        className={cn(
          "relative flex bg-gradient-to-br transition-all duration-700",
          slide.gradient,
          isHero ? "min-h-[220px] sm:min-h-[260px]" : "min-h-[140px]",
        )}
      >
        <div className={cn("relative z-10 flex flex-1 flex-col justify-center p-5 sm:p-6", slide.accent)}>
          <div className="mb-2 flex items-center gap-2">
            <span className="rounded-full bg-white/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide backdrop-blur-sm">
              {slide.badge}
            </span>
            <MaterialIcon name={slide.icon} className="text-[22px] opacity-80" />
          </div>
          <h3 className={cn("font-[family-name:var(--font-display)] font-bold", isHero ? "text-xl sm:text-2xl" : "text-lg")}>
            {slide.title}
          </h3>
          <p className={cn("mt-1 max-w-[16rem] opacity-90", isHero ? "text-sm" : "text-xs")}>{slide.subtitle}</p>
          <div className="mt-4 flex gap-1.5">
            {slides.map((s, i) => (
              <button
                key={s.id}
                type="button"
                aria-label={`Show ${s.title}`}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === index ? "w-6 bg-black/50" : "w-2 bg-black/20 hover:bg-black/35",
                )}
                onClick={() => setIndex(i)}
              />
            ))}
          </div>
        </div>
        {slide.imageSrc && isHero ? (
          <div className="relative hidden w-[45%] shrink-0 sm:block">
            <div className="absolute inset-y-3 right-3 left-0 overflow-hidden rounded-xl border-4 border-white/50 shadow-2xl bg-white/30">
              <SlidePreview imageSrc={slide.imageSrc} icon={slide.icon} accent={slide.accent} />
            </div>
          </div>
        ) : null}
        <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/25 blur-2xl" />
      </div>
    </div>
  );
}
