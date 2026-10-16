"use client";

import type { ReactNode } from "react";
import type { StickerPrintDesign } from "@/lib/sticker-print-designs";

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
      Scan &amp; win rewards
    </p>
  );

  if (design.template === "scan-shield") {
    return (
      <div
        className={`sticker-print-tile ${root} mx-auto flex flex-col items-center px-2 pb-3 pt-2 shadow-md`}
        style={{
          backgroundColor: design.primary,
          border: `2px solid ${design.secondary}`,
          borderRadius: "12px 12px 48% 48%",
          clipPath: "polygon(0 0, 100% 0, 100% 78%, 50% 100%, 0 78%)",
        }}
      >
        <TagHole fill={design.paper} />
        <Ribbon bg={design.ribbon} color={design.secondary}>
          {shortName}
        </Ribbon>
        <div className="my-2">{qr}</div>
        {cta}
        <BarcodeStrip code={label} ink={design.paper} />
      </div>
    );
  }

  if (design.template === "scan-circle") {
    return (
      <div className={`sticker-print-tile ${root} mx-auto`}>
        <div
          className="relative flex flex-col items-center rounded-full border-4 px-2 pb-3 pt-2 shadow-md"
          style={{ borderColor: design.secondary, backgroundColor: design.primary }}
        >
          <TagHole fill={design.paper} />
          <div
            className="mb-1 mt-1 rounded-full px-2 py-0.5 text-[8px] font-black uppercase tracking-wider"
            style={{ backgroundColor: design.ribbon, color: design.secondary }}
          >
            Scan me
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
        className={`sticker-print-tile ${root} mx-auto overflow-hidden rounded-lg border-2 shadow-md`}
        style={{ borderColor: design.secondary, backgroundColor: design.paper }}
      >
        <TagHole fill={design.primary} />
        <div className="relative px-2 pb-2 pt-1">
          <div
            className="absolute -left-6 top-8 z-0 h-8 w-32 -rotate-12 opacity-90"
            style={{ backgroundColor: design.accent }}
          />
          <div
            className="relative z-10 mb-2 py-2 text-center text-[10px] font-black uppercase italic tracking-tight"
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
        className={`sticker-print-tile ${root} mx-auto shadow-md`}
        style={{
          backgroundColor: design.paper,
          border: `3px solid ${design.secondary}`,
          borderRadius: "8px 8px 0 0",
          clipPath: "polygon(0 0, 100% 0, 100% 92%, 50% 100%, 0 92%)",
        }}
      >
        <div className="px-2 pb-3 pt-2">
          <TagHole fill={design.primary} />
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
        className={`sticker-print-tile ${root} mx-auto flex overflow-hidden rounded-xl border-2 shadow-md`}
        style={{ borderColor: design.secondary, backgroundColor: design.primary }}
      >
        <div className="flex w-[38%] flex-col items-center justify-center border-r-2 px-1 py-2" style={{ borderColor: design.secondary, backgroundColor: design.paper }}>
          <p className="rotate-[-90deg] whitespace-nowrap text-[7px] font-black uppercase tracking-widest" style={{ color: design.secondary }}>
            {shortName}
          </p>
        </div>
        <div className="flex flex-1 flex-col items-center px-2 py-2">
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
        className={`sticker-print-tile ${root} mx-auto overflow-hidden rounded-lg border-2 shadow-md`}
        style={{ borderColor: design.secondary }}
      >
        <div className="px-2 py-2 text-center" style={{ backgroundColor: design.primary }}>
          <TagHole fill={design.paper} />
          <p className="mt-1 text-[9px] font-black uppercase tracking-wide" style={{ color: design.paper }}>
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
      className={`sticker-print-tile ${root} mx-auto overflow-hidden rounded-md border-[3px] shadow-md`}
      style={{ borderColor: design.secondary, backgroundColor: design.paper }}
    >
      <div className="h-1.5 w-full" style={{ backgroundColor: design.primary }} />
      <div className="px-2 pb-2 pt-1">
        <TagHole fill={design.accent} />
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
