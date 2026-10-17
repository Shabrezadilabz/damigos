"use client";

import type { ReactNode } from "react";
import type { StickerMotif, StickerPrintDesign } from "@/lib/sticker-print-designs";

function qrUrl(scanUrl: string, size: number) {
  return `https://quickchart.io/qr?size=${size}&margin=1&dark=${encodeURIComponent("000000")}&light=${encodeURIComponent("ffffff")}&text=${encodeURIComponent(scanUrl)}`;
}

function barcodeUrl(code: string) {
  return `https://quickchart.io/barcode?type=code128&text=${encodeURIComponent(code)}&width=1.4&height=36&includeText=false`;
}

function BarcodeStrip({ code, ink }: { code: string; ink: string }) {
  return (
    <div className="mt-1 flex w-full flex-col items-center gap-0.5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={barcodeUrl(code)} alt="" className="h-7 w-full max-w-[120px] object-contain" style={{ filter: `opacity(0.92)` }} />
      <span className="font-mono text-[7px] tracking-widest" style={{ color: ink }}>
        {code}
      </span>
    </div>
  );
}

function TagHole({ fill }: { fill: string }) {
  return (
    <div className="relative z-10 flex justify-center">
      <div
        className="h-3 w-3 rounded-full border-2 shadow-inner"
        style={{ backgroundColor: fill, borderColor: "rgba(0,0,0,0.15)" }}
      />
      <div
        className="absolute -top-1 h-2 w-px"
        style={{ backgroundColor: "rgba(0,0,0,0.25)" }}
        aria-hidden
      />
    </div>
  );
}

function Ribbon({ children, bg, color }: { children: ReactNode; bg: string; color: string }) {
  return (
    <div className="relative mx-auto w-[92%] py-1 text-center">
      <div
        className="relative px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] shadow-sm"
        style={{ backgroundColor: bg, color, clipPath: "polygon(4% 0, 96% 0, 100% 50%, 96% 100%, 4% 100%, 0 50%)" }}
      >
        {children}
      </div>
    </div>
  );
}

function MotifDecor({ motif, accent, primary, secondary }: {
  motif: StickerMotif | undefined;
  accent: string;
  primary: string;
  secondary: string;
}) {
  if (!motif || motif === "none") return null;

  if (motif === "diyas") {
    return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="absolute rounded-full"
            style={{
              width: 8,
              height: 10,
              background: `radial-gradient(circle at 50% 30%, ${accent}, ${primary})`,
              boxShadow: `0 0 4px ${accent}`,
              left: `${12 + i * 32}%`,
              bottom: 6,
            }}
          />
        ))}
      </div>
    );
  }

  if (motif === "rangoli") {
    return (
      <div className="pointer-events-none absolute inset-x-0 top-1 flex justify-center gap-1" aria-hidden>
        {[accent, primary, secondary, accent].map((c, i) => (
          <span key={i} className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: c }} />
        ))}
      </div>
    );
  }

  if (motif === "snowflakes" || motif === "holly") {
    const marks = motif === "holly" ? ["♦", "♦", "♦"] : ["❄", "✦", "❄"];
    return (
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        {marks.map((m, i) => (
          <span
            key={i}
            className="absolute text-[9px] leading-none opacity-80"
            style={{
              color: motif === "holly" ? accent : "rgba(255,255,255,0.95)",
              left: `${10 + i * 35}%`,
              top: i === 1 ? 4 : 10,
              textShadow: motif === "snowflakes" ? "0 0 2px rgba(0,0,0,0.25)" : undefined,
            }}
          >
            {m}
          </span>
        ))}
      </div>
    );
  }

  if (motif === "fireworks") {
    return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        {[
          { t: 6, l: 8 },
          { t: 10, l: 78 },
          { t: 4, l: 48 },
        ].map((p, i) => (
          <span
            key={i}
            className="absolute text-[10px] opacity-90"
            style={{ top: p.t, left: `${p.l}%`, color: i === 1 ? accent : primary === accent ? "#fff" : accent }}
          >
            ✦
          </span>
        ))}
      </div>
    );
  }

  if (motif === "color-powder") {
    const colors = [accent, primary, secondary, "#3A86FF", "#FFBE0B"];
    return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        {colors.map((c, i) => (
          <span
            key={i}
            className="absolute rounded-full opacity-70"
            style={{
              width: 7 + (i % 3),
              height: 7 + (i % 3),
              backgroundColor: c,
              top: 4 + (i % 2) * 10,
              left: `${8 + i * 18}%`,
            }}
          />
        ))}
      </div>
    );
  }

  if (motif === "crescent") {
    return (
      <div className="pointer-events-none absolute right-2 top-2" aria-hidden>
        <span
          className="block h-4 w-4 rounded-full"
          style={{
            boxShadow: `inset -3px 0 0 0 ${accent}`,
            backgroundColor: "transparent",
          }}
        />
      </div>
    );
  }

  if (motif === "balloons") {
    return (
      <div className="pointer-events-none absolute left-1 top-1 flex gap-0.5" aria-hidden>
        {[accent, primary, secondary].map((c, i) => (
          <span
            key={i}
            className="inline-block h-2.5 w-2 rounded-full"
            style={{ backgroundColor: c, transform: `translateY(${i}px)` }}
          />
        ))}
      </div>
    );
  }

  if (motif === "confetti") {
    return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        {[0, 1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className="absolute h-1 w-1.5 opacity-80"
            style={{
              backgroundColor: i % 2 === 0 ? accent : primary,
              top: 6 + (i % 3) * 8,
              left: `${12 + i * 16}%`,
              transform: `rotate(${i * 28}deg)`,
            }}
          />
        ))}
      </div>
    );
  }

  return null;
}

export function StickerPrintTile({
  design,
  restaurantName,
  label,
  scanUrl,
  compact = false,
}: {
  design: StickerPrintDesign;
  restaurantName: string;
  label: string;
  scanUrl: string;
  compact?: boolean;
}) {
  const name = restaurantName.trim() || "Restaurant";
  const shortName = name.length > 28 ? `${name.slice(0, 26)}…` : name;
  const qrSize = compact ? 56 : 88;
  const root = compact ? "w-[72px] scale-[0.95]" : "w-full max-w-[168px]";
  const badge = design.badge?.trim();
  const ctaText = design.cta?.trim() || "Scan & win rewards";

  const qr = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={qrUrl(scanUrl, qrSize)}
      alt=""
      className="rounded-sm bg-white p-0.5 shadow-sm"
      style={{ width: qrSize, height: qrSize }}
    />
  );

  const cta = (
    <p className="text-center text-[8px] font-bold uppercase tracking-wide" style={{ color: design.accent }}>
      {ctaText}
    </p>
  );

  const motif = (
    <MotifDecor
      motif={design.motif}
      accent={design.accent}
      primary={design.primary}
      secondary={design.secondary}
    />
  );

  if (design.template === "festive-frame") {
    return (
      <div
        className={`sticker-print-tile relative ${root} mx-auto overflow-hidden rounded-xl border-[3px] shadow-md`}
        style={{
          borderColor: design.accent,
          background: `linear-gradient(160deg, ${design.paper} 0%, ${design.primary}22 55%, ${design.paper} 100%)`,
        }}
      >
        {motif}
        <div
          className="absolute inset-1 rounded-lg border border-dashed opacity-50"
          style={{ borderColor: design.secondary }}
          aria-hidden
        />
        <div className="relative px-2 pb-2 pt-2">
          <TagHole fill={design.accent} />
          {badge ? (
            <p
              className="mt-1 text-center text-[8px] font-black uppercase tracking-[0.14em]"
              style={{ color: design.secondary }}
            >
              {badge}
            </p>
          ) : null}
          <p className="mt-0.5 text-center text-[9px] font-bold uppercase leading-tight" style={{ color: design.ink }}>
            {shortName}
          </p>
          <div className="my-2 flex justify-center">{qr}</div>
          {cta}
          <BarcodeStrip code={label} ink={design.ink} />
        </div>
      </div>
    );
  }

  if (design.template === "scan-shield") {
    return (
      <div
        className={`sticker-print-tile relative ${root} mx-auto flex flex-col items-center px-2 pb-3 pt-2 shadow-md`}
        style={{
          backgroundColor: design.primary,
          border: `2px solid ${design.secondary}`,
          borderRadius: "12px 12px 48% 48%",
          clipPath: "polygon(0 0, 100% 0, 100% 78%, 50% 100%, 0 78%)",
        }}
      >
        {motif}
        <TagHole fill={design.paper} />
        <Ribbon bg={design.ribbon} color={design.secondary}>
          {badge || shortName}
        </Ribbon>
        {!badge ? null : (
          <p className="mt-0.5 line-clamp-1 px-1 text-center text-[7px] font-bold uppercase" style={{ color: design.paper }}>
            {shortName}
          </p>
        )}
        <div className="my-2">{qr}</div>
        {cta}
        <BarcodeStrip code={label} ink={design.paper} />
      </div>
    );
  }

  if (design.template === "scan-circle") {
    return (
      <div className={`sticker-print-tile relative ${root} mx-auto`}>
        <div
          className="relative flex flex-col items-center rounded-full border-4 px-2 pb-3 pt-2 shadow-md"
          style={{ borderColor: design.secondary, backgroundColor: design.primary }}
        >
          {motif}
          <TagHole fill={design.paper} />
          <div
            className="mb-1 mt-1 rounded-full px-2 py-0.5 text-[8px] font-black uppercase tracking-wider"
            style={{ backgroundColor: design.ribbon, color: design.secondary }}
          >
            {badge || "Scan me"}
          </div>
          <p className="mb-1 line-clamp-2 px-1 text-center text-[8px] font-bold uppercase leading-tight" style={{ color: design.paper }}>
            {shortName}
          </p>
          {qr}
          <div className="mt-1">{cta}</div>
          <BarcodeStrip code={label} ink={design.paper} />
        </div>
      </div>
    );
  }

  if (design.template === "sale-ribbon") {
    return (
      <div
        className={`sticker-print-tile relative ${root} mx-auto overflow-hidden rounded-lg border-2 shadow-md`}
        style={{ borderColor: design.secondary, backgroundColor: design.paper }}
      >
        {motif}
        <TagHole fill={design.primary} />
        <div className="relative px-2 pb-2 pt-1">
          <div
            className="absolute -left-6 top-8 z-0 h-8 w-32 -rotate-12 opacity-90"
            style={{ backgroundColor: design.accent }}
          />
          {badge ? (
            <p
              className="relative z-10 text-center text-[8px] font-black uppercase tracking-wide"
              style={{ color: design.primary }}
            >
              {badge}
            </p>
          ) : null}
          <div
            className="relative z-10 mb-2 py-1 text-center text-[10px] font-black uppercase italic tracking-tight"
            style={{ color: design.secondary }}
          >
            {shortName}
          </div>
          <div className="relative z-10 flex justify-center">{qr}</div>
          <div className="relative z-10 mt-2">{cta}</div>
          <div
            className="relative z-10 mt-2 rounded px-1 py-1"
            style={{ backgroundColor: design.primary }}
          >
            <BarcodeStrip code={label} ink={design.paper} />
          </div>
        </div>
      </div>
    );
  }

  if (design.template === "retro-notch") {
    return (
      <div
        className={`sticker-print-tile relative ${root} mx-auto shadow-md`}
        style={{
          backgroundColor: design.paper,
          border: `3px solid ${design.secondary}`,
          borderRadius: "8px 8px 0 0",
          clipPath: "polygon(0 0, 100% 0, 100% 92%, 50% 100%, 0 92%)",
        }}
      >
        {motif}
        <div className="px-2 pb-3 pt-2">
          <TagHole fill={design.primary} />
          {badge ? (
            <p className="text-center text-[7px] font-black uppercase tracking-widest" style={{ color: design.primary }}>
              {badge}
            </p>
          ) : null}
          <p
            className="mt-1 text-center text-[9px] font-black uppercase leading-tight"
            style={{ color: design.secondary }}
          >
            {shortName}
          </p>
          <div className="my-2 flex justify-center border-y-2 py-2" style={{ borderColor: design.primary }}>
            {qr}
          </div>
          {cta}
          <BarcodeStrip code={label} ink={design.ink} />
        </div>
      </div>
    );
  }

  if (design.template === "horizontal-badge") {
    return (
      <div
        className={`sticker-print-tile relative ${root} mx-auto flex overflow-hidden rounded-xl border-2 shadow-md`}
        style={{ borderColor: design.secondary, backgroundColor: design.primary }}
      >
        {motif}
        <div className="flex w-[38%] flex-col items-center justify-center border-r-2 px-1 py-2" style={{ borderColor: design.secondary, backgroundColor: design.paper }}>
          <p className="rotate-[-90deg] whitespace-nowrap text-[7px] font-black uppercase tracking-widest" style={{ color: design.secondary }}>
            {badge || shortName}
          </p>
        </div>
        <div className="flex flex-1 flex-col items-center px-2 py-2">
          {badge ? (
            <p className="mb-0.5 line-clamp-1 text-center text-[7px] font-bold uppercase" style={{ color: design.paper }}>
              {shortName}
            </p>
          ) : null}
          {qr}
          <div className="mt-1 w-full rounded bg-white/95 px-1 py-0.5">{cta}</div>
          <BarcodeStrip code={label} ink={design.paper} />
        </div>
      </div>
    );
  }

  if (design.template === "vertical-split") {
    return (
      <div
        className={`sticker-print-tile relative ${root} mx-auto overflow-hidden rounded-lg border-2 shadow-md`}
        style={{ borderColor: design.secondary }}
      >
        {motif}
        <div className="px-2 py-2 text-center" style={{ backgroundColor: design.primary }}>
          <TagHole fill={design.paper} />
          {badge ? (
            <p className="mt-1 text-[7px] font-black uppercase tracking-[0.12em]" style={{ color: design.accent }}>
              {badge}
            </p>
          ) : null}
          <p className="mt-0.5 text-[9px] font-black uppercase tracking-wide" style={{ color: design.paper }}>
            {shortName}
          </p>
        </div>
        <div className="flex flex-col items-center px-2 py-2" style={{ backgroundColor: design.paper }}>
          {qr}
          {cta}
          <div className="mt-1 w-full rounded-sm px-1" style={{ backgroundColor: design.secondary }}>
            <BarcodeStrip code={label} ink={design.paper} />
          </div>
        </div>
      </div>
    );
  }

  // luggage-tag (default)
  return (
    <div
      className={`sticker-print-tile relative ${root} mx-auto overflow-hidden rounded-md border-[3px] shadow-md`}
      style={{ borderColor: design.secondary, backgroundColor: design.paper }}
    >
      {motif}
      <div className="h-1.5 w-full" style={{ backgroundColor: design.primary }} />
      <div className="px-2 pb-2 pt-1">
        <TagHole fill={design.accent} />
        {badge ? (
          <p className="text-center text-[7px] font-black uppercase tracking-widest" style={{ color: design.primary }}>
            {badge}
          </p>
        ) : null}
        <p className="mt-1 text-center text-[8px] font-bold uppercase tracking-[0.08em]" style={{ color: design.ink }}>
          {shortName}
        </p>
        <div className="my-2 flex justify-center rounded border border-dashed p-1" style={{ borderColor: `${design.secondary}44` }}>
          {qr}
        </div>
        {cta}
        <BarcodeStrip code={label} ink={design.ink} />
      </div>
      <div className="h-1 w-full" style={{ backgroundColor: design.secondary }} />
    </div>
  );
}
