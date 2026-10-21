"use client";

import { useEffect, useMemo, useState } from "react";
import { MaterialIcon } from "@/components/material-icon";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { GrowLoyaltyConfig } from "./grow-loyalty-constants";

type Segment = GrowLoyaltyConfig["spinSegments"][number];
type GameKind = "spin" | "scratch";

const WHEEL_COLORS = ["#B7122A", "#1B1B1B", "#775600", "#2D6A4F", "#9B2226", "#3D405B", "#BC6C25", "#40916C"];

function pickWeighted(segments: Segment[]): Segment {
  const total = segments.reduce((s, x) => s + Math.max(0, x.weight), 0) || 1;
  let r = Math.random() * total;
  for (const seg of segments) {
    r -= Math.max(0, seg.weight);
    if (r <= 0) return seg;
  }
  return segments[segments.length - 1]!;
}

function resolveGameKind(config: GrowLoyaltyConfig): GameKind {
  const spinOn = config.spinEnabled !== false;
  const scratchOn = config.scratchEnabled;
  if (spinOn && scratchOn) return Math.random() < 0.5 ? "spin" : "scratch";
  if (scratchOn && !spinOn) return "scratch";
  return "spin";
}

function prizeLabel(seg: Segment): string {
  if (seg.prizeType === "free_item" && seg.menuItemName) return `Free ${seg.menuItemName}`;
  return seg.title;
}

export function GrowGamePlayPreview({ config }: { config: GrowLoyaltyConfig }) {
  const segments = config.spinSegments ?? [];
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<GameKind>("spin");
  const [phase, setPhase] = useState<"idle" | "playing" | "won">("idle");
  const [won, setWon] = useState<Segment | null>(null);
  const [rotation, setRotation] = useState(0);
  const [scratchReveal, setScratchReveal] = useState(0);

  const modeHint = useMemo(() => {
    const spinOn = config.spinEnabled !== false;
    const scratchOn = config.scratchEnabled;
    if (spinOn && scratchOn) return "Random game each Play (spin or scratch) · shared prizes";
    if (scratchOn && !spinOn) return "Scratch card only · shared prize pool";
    return "Spin wheel only · shared prize pool";
  }, [config.spinEnabled, config.scratchEnabled]);

  useEffect(() => {
    if (!open || phase !== "playing" || kind !== "scratch") return;
    let frame = 0;
    const id = window.setInterval(() => {
      frame += 1;
      setScratchReveal(Math.min(100, frame * 8));
      if (frame >= 13) window.clearInterval(id);
    }, 120);
    return () => window.clearInterval(id);
  }, [open, phase, kind]);

  function startPlay() {
    if (!config.engineEnabled || segments.length === 0) return;
    const nextKind = resolveGameKind(config);
    const prize = pickWeighted(segments);
    const prizeIndex = Math.max(0, segments.findIndex((s) => s.localId === prize.localId));
    setKind(nextKind);
    setWon(prize);
    setOpen(true);
    setPhase("playing");
    setScratchReveal(0);

    if (nextKind === "spin") {
      const slice = 360 / segments.length;
      const targetCenter = prizeIndex * slice + slice / 2;
      // Several full turns (~5.5s) then land on prize under the top pointer
      const turns = 6 + Math.floor(Math.random() * 3);
      const final = turns * 360 + (360 - targetCenter);
      setRotation((r) => r + final);
      window.setTimeout(() => setPhase("won"), 5500);
    } else {
      window.setTimeout(() => setPhase("won"), 1800);
    }
  }

  function close() {
    setOpen(false);
    setPhase("idle");
    setWon(null);
    setScratchReveal(0);
  }

  const conic = useMemo(() => {
    if (segments.length === 0) return "#333";
    const slice = 100 / segments.length;
    return segments
      .map((s, i) => `${WHEEL_COLORS[i % WHEEL_COLORS.length]} ${i * slice}% ${(i + 1) * slice}%`)
      .join(", ");
  }, [segments]);

  return (
    <div className="sticky top-20 flex flex-col gap-4" data-testid="grow-game-live-preview">
      <div className="rounded-xl bg-surface-container-low p-4 shadow-[0_2px_8px_-2px_rgba(28,28,28,0.04)]">
        <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
          Live preview — tap Play
        </p>
        <div className="flex flex-col items-center gap-3 rounded-lg bg-[#121212] p-5 text-white">
          <MaterialIcon name="casino" className="text-[32px] text-tertiary-fixed-dim" />
          <p className="text-center font-[family-name:var(--font-display)] text-lg font-bold">
            Spin &amp; savor
          </p>
          <p className="text-center text-xs text-gray-400">
            {config.engineEnabled ? "Engine on" : "Engine paused"} · {config.dailySpinLimit} play/day ·{" "}
            {config.paybackPercent}% payback
          </p>
          <p className="text-center text-[10px] text-amber-200/90">{modeHint}</p>
          <div className="flex flex-wrap justify-center gap-1.5">
            {segments.map((s) => (
              <span key={s.localId} className="rounded-lg bg-white/10 px-2 py-1 text-[10px] font-semibold">
                {prizeLabel(s)} ({s.weight})
              </span>
            ))}
          </div>
          <Button
            type="button"
            className="mt-2 gap-2 bg-[#25D366] text-white hover:bg-[#1ebe57]"
            disabled={!config.engineEnabled || segments.length === 0}
            onClick={startPlay}
            data-testid="grow-preview-play"
          >
            <MaterialIcon name="play_arrow" className="text-[20px]" />
            Play now
          </Button>
        </div>
      </div>

      <div className="rounded-xl bg-surface-container-lowest p-4 shadow-sm">
        <p className="mb-2 text-xs font-bold text-on-surface-variant">WhatsApp message preview</p>
        <div className="mx-auto max-w-[280px] rounded-2xl border border-outline-variant/40 bg-[#e5ddd5] p-3">
          <div className="rounded-lg bg-white p-3 text-xs shadow-sm">
            <p className="font-semibold text-[#075e54]">Your kitchen</p>
            <p className="mt-2">
              🎡 Reward unlocked — tap Play for a spin or scratch (same offers).
            </p>
            <button
              type="button"
              className="mt-3 w-full rounded-lg bg-[#25D366] py-2 text-center font-semibold text-white disabled:opacity-50"
              disabled={!config.engineEnabled || segments.length === 0}
              onClick={startPlay}
            >
              Play now
            </button>
          </div>
        </div>
      </div>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          data-testid="grow-game-modal"
        >
          <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-[#0f0f0f] text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <p className="text-sm font-bold">
                {kind === "spin" ? "Fortune spin" : "Scratch & win"}
              </p>
              <button type="button" className="text-white/70 hover:text-white" onClick={close} aria-label="Close">
                <MaterialIcon name="close" className="text-[22px]" />
              </button>
            </div>

            <div className="flex flex-col items-center gap-4 p-6">
              {kind === "spin" ? (
                <div className="relative h-64 w-64">
                  <div
                    className="absolute left-1/2 top-0 z-10 -translate-x-1/2 text-primary"
                    aria-hidden
                  >
                    <MaterialIcon name="arrow_drop_down" className="text-[40px] text-[#B7122A]" />
                  </div>
                  <div
                    className="h-full w-full rounded-full border-4 border-white/20 shadow-inner transition-transform duration-[5500ms] ease-out"
                    style={{
                      background: `conic-gradient(${conic})`,
                      transform: `rotate(${rotation}deg)`,
                    }}
                  >
                    {segments.map((s, i) => {
                      const slice = 360 / segments.length;
                      const angle = i * slice + slice / 2;
                      return (
                        <span
                          key={s.localId}
                          className="absolute left-1/2 top-1/2 origin-center text-[9px] font-bold uppercase tracking-wide"
                          style={{
                            transform: `rotate(${angle}deg) translateY(-92px) rotate(-${angle}deg)`,
                          }}
                        >
                          {s.title.slice(0, 14)}
                        </span>
                      );
                    })}
                  </div>
                  <div className="pointer-events-none absolute inset-[38%] rounded-full bg-[#121212] shadow-lg" />
                </div>
              ) : (
                <div className="relative h-44 w-full max-w-xs overflow-hidden rounded-xl border border-white/15 bg-gradient-to-br from-[#B7122A] to-[#3a0a12]">
                  <div
                    className={cn(
                      "absolute inset-0 flex items-center justify-center bg-[repeating-linear-gradient(45deg,#222_0_12px,#333_12px_24px)] transition-opacity duration-500",
                      scratchReveal >= 100 ? "opacity-0" : "opacity-100",
                    )}
                    style={{ clipPath: `inset(0 ${scratchReveal}% 0 0)` }}
                  >
                    <p className="text-sm font-bold tracking-wider text-white/80">SCRATCH HERE</p>
                  </div>
                  <div className="flex h-full flex-col items-center justify-center gap-1 p-4 text-center">
                    <p className="text-[10px] uppercase tracking-widest text-white/70">You unlocked</p>
                    <p className="font-[family-name:var(--font-display)] text-xl font-bold">
                      {won ? prizeLabel(won) : "…"}
                    </p>
                  </div>
                </div>
              )}

              {phase === "playing" ? (
                <p className="animate-pulse text-sm text-white/70">
                  {kind === "spin" ? "Spinning…" : "Scratching…"}
                </p>
              ) : null}

              {phase === "won" && won ? (
                <div
                  className="w-full rounded-xl bg-white/10 p-4 text-center shadow-[0_0_0_1px_rgba(37,211,102,0.35)]"
                  data-testid="grow-preview-won"
                >
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#25D366]">You won</p>
                  <p className="mt-1 font-[family-name:var(--font-display)] text-2xl font-bold">
                    {prizeLabel(won)}
                  </p>
                  <p className="mt-2 text-xs text-white/60">
                    Applied on next qualifying order · weight {won.weight}
                  </p>
                  <Button type="button" className="mt-4 w-full" onClick={close}>
                    Done
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
