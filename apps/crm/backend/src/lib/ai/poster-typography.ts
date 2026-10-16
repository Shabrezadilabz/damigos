import { createHash } from "node:crypto";

export type PosterTypography = {
  id: string;
  googleFontsUrl: string;
  displayFamily: string;
  bodyFamily: string;
  layout: "left-stack" | "center-hero";
  headlineSize: number;
  offerSize: number;
  nameSize: number;
  /** Rough max chars per headline line before manual split */
  headlineMaxChars: number;
};

const PRESETS: PosterTypography[] = [
  {
    id: "royal-serif",
    googleFontsUrl:
      "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&amp;family=DM+Sans:wght@500;700&amp;display=swap",
    displayFamily: "'Playfair Display', Georgia, serif",
    bodyFamily: "'DM Sans', system-ui, sans-serif",
    layout: "left-stack",
    headlineSize: 58,
    offerSize: 36,
    nameSize: 24,
    headlineMaxChars: 22,
  },
  {
    id: "street-display",
    googleFontsUrl:
      "https://fonts.googleapis.com/css2?family=Bebas+Neue&amp;family=Outfit:wght@500;700&amp;display=swap",
    displayFamily: "'Bebas Neue', Impact, sans-serif",
    bodyFamily: "'Outfit', system-ui, sans-serif",
    layout: "center-hero",
    headlineSize: 72,
    offerSize: 32,
    nameSize: 22,
    headlineMaxChars: 28,
  },
  {
    id: "modern-grotesk",
    googleFontsUrl:
      "https://fonts.googleapis.com/css2?family=Syne:wght@700;800&amp;family=Manrope:wght@500;700&amp;display=swap",
    displayFamily: "'Syne', system-ui, sans-serif",
    bodyFamily: "'Manrope', system-ui, sans-serif",
    layout: "left-stack",
    headlineSize: 52,
    offerSize: 34,
    nameSize: 23,
    headlineMaxChars: 24,
  },
  {
    id: "warm-script-mix",
    googleFontsUrl:
      "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@700&amp;family=Work+Sans:wght@500;700&amp;display=swap",
    displayFamily: "'Cormorant Garamond', Georgia, serif",
    bodyFamily: "'Work Sans', system-ui, sans-serif",
    layout: "center-hero",
    headlineSize: 64,
    offerSize: 30,
    nameSize: 22,
    headlineMaxChars: 26,
  },
  {
    id: "bold-condensed",
    googleFontsUrl:
      "https://fonts.googleapis.com/css2?family=Oswald:wght@600;700&amp;family=Source+Sans+3:wght@500;700&amp;display=swap",
    displayFamily: "'Oswald', Arial Narrow, sans-serif",
    bodyFamily: "'Source Sans 3', system-ui, sans-serif",
    layout: "left-stack",
    headlineSize: 56,
    offerSize: 38,
    nameSize: 22,
    headlineMaxChars: 30,
  },
];

export function pickPosterTypography(seed: string): PosterTypography {
  const hash = createHash("sha256").update(seed).digest();
  const idx = hash[0]! % PRESETS.length;
  return PRESETS[idx]!;
}

export function splitHeadlineForTypography(headline: string, maxChars: number): string[] {
  const words = headline.trim().split(/\s+/);
  if (words.join(" ").length <= maxChars) return [headline.trim()];
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 3);
}
