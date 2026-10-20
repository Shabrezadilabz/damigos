"use client";

import { useEffect, useMemo, useState } from "react";

type Piece = {
  id: number;
  left: number;
  delay: number;
  duration: number;
  rotate: number;
  color: string;
  w: number;
  h: number;
  kind: "rect" | "dot";
};

const COLORS = ["#e23744", "#f3bf51", "#16a34a", "#ffffff", "#ffdea3", "#60a5fa"];

/** Lightweight paper-blast / sparkle confetti for Sparkle Win sheet. */
export function WinConfetti({ active, burstKey = 0 }: { active: boolean; burstKey?: number }) {
  const [show, setShow] = useState(false);

  const pieces = useMemo(() => {
    if (!active) return [] as Piece[];
    return Array.from({ length: 48 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 0.35,
      duration: 1.4 + Math.random() * 1.2,
      rotate: Math.random() * 720 - 360,
      color: COLORS[i % COLORS.length]!,
      w: 4 + Math.random() * 8,
      h: 6 + Math.random() * 10,
      kind: (i % 5 === 0 ? "dot" : "rect") as "rect" | "dot",
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-burst on burstKey
  }, [active, burstKey]);

  useEffect(() => {
    if (!active) {
      setShow(false);
      return;
    }
    setShow(true);
    const t = window.setTimeout(() => setShow(false), 2800);
    return () => window.clearTimeout(t);
  }, [active, burstKey]);

  if (!show || pieces.length === 0) return null;

  return (
    <div
      className="pointer-events-none absolute inset-0 z-20 overflow-hidden"
      aria-hidden
    >
      {pieces.map((p) => (
        <span
          key={`${burstKey}-${p.id}`}
          className="win-confetti-piece absolute top-0"
          style={{
            left: `${p.left}%`,
            width: p.kind === "dot" ? 6 : p.w,
            height: p.kind === "dot" ? 6 : p.h,
            background: p.color,
            borderRadius: p.kind === "dot" ? "999px" : "2px",
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            ["--win-rot" as string]: `${p.rotate}deg`,
            opacity: 0.95,
            boxShadow: p.kind === "dot" ? `0 0 8px ${p.color}` : undefined,
          }}
        />
      ))}
      <div className="win-sparkle-flash absolute inset-0" />
    </div>
  );
}
