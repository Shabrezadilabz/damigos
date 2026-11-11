"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  subtitle?: string;
  /** 0–100 forced reveal (e.g. after auto-complete) */
  forcedReveal?: number;
  disabled?: boolean;
  className?: string;
  onRevealComplete?: () => void;
};

const COVER = "#5a3352";
const COVER_LIGHT = "#b98aae";

/** Finger-scratch foil over a YUMM plum prize card. */
export function ScratchCard({
  title,
  subtitle = "Hidden perk",
  forcedReveal = 0,
  disabled,
  className,
  onRevealComplete,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrappingRef = useRef<HTMLDivElement>(null);
  const clearedRef = useRef(false);
  const [pct, setPct] = useState(0);
  const drawing = useRef(false);

  const paintCover = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap = wrappingRef.current;
    if (!canvas || !wrap) return;
    const rect = wrap.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const g = ctx.createLinearGradient(0, 0, rect.width, rect.height);
    g.addColorStop(0, COVER);
    g.addColorStop(1, COVER_LIGHT);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, rect.width, rect.height);
    ctx.fillStyle = "rgba(255,243,230,0.35)";
    for (let i = -rect.height; i < rect.width; i += 14) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + rect.height, rect.height);
      ctx.lineWidth = 6;
      ctx.strokeStyle = "rgba(255,243,230,0.12)";
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(255,243,230,0.9)";
    ctx.font = "700 12px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Scratch here", rect.width / 2, rect.height / 2);
    clearedRef.current = false;
    setPct(0);
  }, []);

  useEffect(() => {
    paintCover();
    const onResize = () => paintCover();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [paintCover]);

  useEffect(() => {
    if (forcedReveal < 100) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setPct(100);
    if (!clearedRef.current) {
      clearedRef.current = true;
      onRevealComplete?.();
    }
  }, [forcedReveal, onRevealComplete]);

  function sampleCleared(): number {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d", { willReadFrequently: true });
    if (!canvas || !ctx) return 0;
    const { width, height } = canvas;
    const step = 8;
    let clear = 0;
    let total = 0;
    const data = ctx.getImageData(0, 0, width, height).data;
    for (let y = 0; y < height; y += step) {
      for (let x = 0; x < width; x += step) {
        total += 1;
        const a = data[(y * width + x) * 4 + 3] ?? 255;
        if (a < 40) clear += 1;
      }
    }
    return total ? Math.round((clear / total) * 100) : 0;
  }

  function scratchAt(clientX: number, clientY: number) {
    const canvas = canvasRef.current;
    if (!canvas || disabled) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(x, y, 22, 0, Math.PI * 2);
    ctx.fill();
    const next = sampleCleared();
    setPct(next);
    if (next >= 25 && typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(8);
    }
    if (next >= 55 && !clearedRef.current) {
      clearedRef.current = true;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setPct(100);
      onRevealComplete?.();
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate([16, 30, 16]);
      }
    }
  }

  return (
    <div
      ref={wrappingRef}
      className={cn(
        "relative h-40 w-full max-w-xs overflow-hidden rounded-xl border border-border shadow-inner",
        className,
      )}
    >
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-accent p-4 text-center">
        <p className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-accent-foreground/70">
          {subtitle}
        </p>
        <p className="font-display text-[20px] font-bold text-accent-foreground">{title}</p>
        <p className="text-[10px] font-semibold text-accent-foreground/60">{pct}% revealed</p>
      </div>
      <canvas
        ref={canvasRef}
        className={cn(
          "absolute inset-0 z-10 touch-none",
          disabled ? "pointer-events-none opacity-0" : "cursor-crosshair",
        )}
        onPointerDown={(e) => {
          drawing.current = true;
          e.currentTarget.setPointerCapture(e.pointerId);
          scratchAt(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (!drawing.current) return;
          scratchAt(e.clientX, e.clientY);
        }}
        onPointerUp={() => {
          drawing.current = false;
        }}
        onPointerCancel={() => {
          drawing.current = false;
        }}
        aria-label="Scratch card"
      />
    </div>
  );
}
