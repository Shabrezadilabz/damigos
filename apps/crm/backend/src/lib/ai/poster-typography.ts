import { createHash } from "node:crypto";

export type PosterTypography = {
  id: string;
  label: string;
  description: string;
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

/**
 * Food-marketing type stacks (Google Fonts in SVG).
 * Includes cursive / script + stylish display — owners pick via dropdown.
 * Script headlines use larger size + fewer chars (glyphs are wider).
 */
const PRESETS: PosterTypography[] = [
  {
    id: "soft-editorial",
    label: "Soft editorial",
    description: "Friendly rounded headline · clean body",
    googleFontsUrl:
      "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,700;9..144,800&amp;family=Nunito:wght@600;700&amp;display=swap",
    displayFamily: "'Fraunces', Georgia, serif",
    bodyFamily: "'Nunito', system-ui, sans-serif",
    layout: "left-stack",
    headlineSize: 54,
    offerSize: 34,
    nameSize: 22,
    headlineMaxChars: 24,
  },
  /* —— Cursive / script —— */
  {
    id: "cursive-vibes",
    label: "Cursive · Great Vibes",
    description: "Elegant flowing script · romance / specials",
    googleFontsUrl:
      "https://fonts.googleapis.com/css2?family=Great+Vibes&amp;family=Nunito:wght@600;700&amp;display=swap",
    displayFamily: "'Great Vibes', 'Segoe Script', cursive",
    bodyFamily: "'Nunito', system-ui, sans-serif",
    layout: "center-hero",
    headlineSize: 72,
    offerSize: 30,
    nameSize: 20,
    headlineMaxChars: 18,
  },
  {
    id: "cursive-dancing",
    label: "Cursive · Dancing Script",
    description: "Casual handwritten · brunch & desserts",
    googleFontsUrl:
      "https://fonts.googleapis.com/css2?family=Dancing+Script:wght@600;700&amp;family=Outfit:wght@500;700&amp;display=swap",
    displayFamily: "'Dancing Script', 'Segoe Script', cursive",
    bodyFamily: "'Outfit', system-ui, sans-serif",
    layout: "center-hero",
    headlineSize: 68,
    offerSize: 30,
    nameSize: 20,
    headlineMaxChars: 20,
  },
  {
    id: "cursive-allura",
    label: "Cursive · Allura",
    description: "Fine calligraphy · premium dining",
    googleFontsUrl:
      "https://fonts.googleapis.com/css2?family=Allura&amp;family=Cormorant+Garamond:wght@600;700&amp;display=swap",
    displayFamily: "'Allura', 'Segoe Script', cursive",
    bodyFamily: "'Cormorant Garamond', Georgia, serif",
    layout: "center-hero",
    headlineSize: 76,
    offerSize: 32,
    nameSize: 22,
    headlineMaxChars: 16,
  },
  {
    id: "cursive-pacifico",
    label: "Cursive · Pacifico",
    description: "Beach-cafe script · fun & warm",
    googleFontsUrl:
      "https://fonts.googleapis.com/css2?family=Pacifico&amp;family=Nunito:wght@600;700&amp;display=swap",
    displayFamily: "'Pacifico', 'Segoe Script', cursive",
    bodyFamily: "'Nunito', system-ui, sans-serif",
    layout: "center-hero",
    headlineSize: 64,
    offerSize: 30,
    nameSize: 20,
    headlineMaxChars: 18,
  },
  {
    id: "cursive-parisienne",
    label: "Cursive · Parisienne",
    description: "Light French script · wine & cheese",
    googleFontsUrl:
      "https://fonts.googleapis.com/css2?family=Parisienne&amp;family=Work+Sans:wght@500;700&amp;display=swap",
    displayFamily: "'Parisienne', 'Segoe Script', cursive",
    bodyFamily: "'Work Sans', system-ui, sans-serif",
    layout: "center-hero",
    headlineSize: 70,
    offerSize: 28,
    nameSize: 18,
    headlineMaxChars: 17,
  },
  /* —— Stylish display —— */
  {
    id: "stylish-fatface",
    label: "Stylish · Abril Fatface",
    description: "High-contrast display · bold offers",
    googleFontsUrl:
      "https://fonts.googleapis.com/css2?family=Abril+Fatface&amp;family=Source+Sans+3:wght@500;700&amp;display=swap",
    displayFamily: "'Abril Fatface', Georgia, serif",
    bodyFamily: "'Source Sans 3', system-ui, sans-serif",
    layout: "left-stack",
    headlineSize: 58,
    offerSize: 32,
    nameSize: 20,
    headlineMaxChars: 20,
  },
  {
    id: "stylish-cinzel",
    label: "Stylish · Cinzel",
    description: "Regal caps · fine dining / thali",
    googleFontsUrl:
      "https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&amp;family=Lato:wght@500;700&amp;display=swap",
    displayFamily: "'Cinzel', 'Times New Roman', serif",
    bodyFamily: "'Lato', system-ui, sans-serif",
    layout: "center-hero",
    headlineSize: 48,
    offerSize: 28,
    nameSize: 18,
    headlineMaxChars: 22,
  },
  {
    id: "stylish-yeseva",
    label: "Stylish · Yeseva One",
    description: "Art-deco display · festive menus",
    googleFontsUrl:
      "https://fonts.googleapis.com/css2?family=Yeseva+One&amp;family=Josefin+Sans:wght@500;600&amp;display=swap",
    displayFamily: "'Yeseva One', Georgia, serif",
    bodyFamily: "'Josefin Sans', system-ui, sans-serif",
    layout: "left-stack",
    headlineSize: 54,
    offerSize: 30,
    nameSize: 20,
    headlineMaxChars: 20,
  },
  {
    id: "stylish-lobster",
    label: "Stylish · Lobster",
    description: "Bold script-display · burgers & wings",
    googleFontsUrl:
      "https://fonts.googleapis.com/css2?family=Lobster&amp;family=Outfit:wght@500;700&amp;display=swap",
    displayFamily: "'Lobster', 'Segoe Script', cursive",
    bodyFamily: "'Outfit', system-ui, sans-serif",
    layout: "center-hero",
    headlineSize: 62,
    offerSize: 30,
    nameSize: 20,
    headlineMaxChars: 18,
  },
  {
    id: "stylish-unbounded",
    label: "Stylish · Unbounded",
    description: "Geometric futurist · modern kitchens",
    googleFontsUrl:
      "https://fonts.googleapis.com/css2?family=Unbounded:wght@600;700&amp;family=Manrope:wght@500;700&amp;display=swap",
    displayFamily: "'Unbounded', system-ui, sans-serif",
    bodyFamily: "'Manrope', system-ui, sans-serif",
    layout: "left-stack",
    headlineSize: 46,
    offerSize: 30,
    nameSize: 18,
    headlineMaxChars: 22,
  },
  {
    id: "stylish-righteous",
    label: "Stylish · Righteous",
    description: "Retro-futura · street food energy",
    googleFontsUrl:
      "https://fonts.googleapis.com/css2?family=Righteous&amp;family=Nunito:wght@600;700&amp;display=swap",
    displayFamily: "'Righteous', system-ui, sans-serif",
    bodyFamily: "'Nunito', system-ui, sans-serif",
    layout: "center-hero",
    headlineSize: 56,
    offerSize: 30,
    nameSize: 20,
    headlineMaxChars: 22,
  },
  {
    id: "royal-serif",
    label: "Royal serif",
    description: "Classic dining · elegant Playfair",
    googleFontsUrl:
      "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&amp;family=DM+Sans:wght@500;700&amp;display=swap",
    displayFamily: "'Playfair Display', Georgia, serif",
    bodyFamily: "'DM Sans', system-ui, sans-serif",
    layout: "left-stack",
    headlineSize: 56,
    offerSize: 34,
    nameSize: 22,
    headlineMaxChars: 22,
  },
  {
    id: "warm-script-mix",
    label: "Warm classic",
    description: "Cormorant headline · airy body",
    googleFontsUrl:
      "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@700&amp;family=Work+Sans:wght@500;700&amp;display=swap",
    displayFamily: "'Cormorant Garamond', Georgia, serif",
    bodyFamily: "'Work Sans', system-ui, sans-serif",
    layout: "center-hero",
    headlineSize: 58,
    offerSize: 30,
    nameSize: 20,
    headlineMaxChars: 26,
  },
  {
    id: "modern-grotesk",
    label: "Modern bold",
    description: "Syne display · Manrope body",
    googleFontsUrl:
      "https://fonts.googleapis.com/css2?family=Syne:wght@700;800&amp;family=Manrope:wght@500;700&amp;display=swap",
    displayFamily: "'Syne', system-ui, sans-serif",
    bodyFamily: "'Manrope', system-ui, sans-serif",
    layout: "left-stack",
    headlineSize: 50,
    offerSize: 32,
    nameSize: 22,
    headlineMaxChars: 24,
  },
  {
    id: "festive-india",
    label: "Festive India",
    description: "Teko energy · Mukta readable",
    googleFontsUrl:
      "https://fonts.googleapis.com/css2?family=Teko:wght@600;700&amp;family=Mukta:wght@500;700&amp;display=swap",
    displayFamily: "'Teko', system-ui, sans-serif",
    bodyFamily: "'Mukta', system-ui, sans-serif",
    layout: "center-hero",
    headlineSize: 64,
    offerSize: 32,
    nameSize: 22,
    headlineMaxChars: 28,
  },
  {
    id: "clean-sans",
    label: "Clean sans",
    description: "Poppins headline · clear offer",
    googleFontsUrl:
      "https://fonts.googleapis.com/css2?family=Poppins:wght@600;700;800&amp;family=Source+Sans+3:wght@500;700&amp;display=swap",
    displayFamily: "'Poppins', system-ui, sans-serif",
    bodyFamily: "'Source Sans 3', system-ui, sans-serif",
    layout: "left-stack",
    headlineSize: 48,
    offerSize: 32,
    nameSize: 20,
    headlineMaxChars: 26,
  },
  {
    id: "bold-condensed",
    label: "Bold condensed",
    description: "Oswald punch · Source Sans body",
    googleFontsUrl:
      "https://fonts.googleapis.com/css2?family=Oswald:wght@600;700&amp;family=Source+Sans+3:wght@500;700&amp;display=swap",
    displayFamily: "'Oswald', Arial Narrow, sans-serif",
    bodyFamily: "'Source Sans 3', system-ui, sans-serif",
    layout: "left-stack",
    headlineSize: 52,
    offerSize: 34,
    nameSize: 20,
    headlineMaxChars: 28,
  },
  {
    id: "street-display",
    label: "Street display",
    description: "Loud Bebas · use sparingly",
    googleFontsUrl:
      "https://fonts.googleapis.com/css2?family=Bebas+Neue&amp;family=Outfit:wght@500;700&amp;display=swap",
    displayFamily: "'Bebas Neue', Impact, sans-serif",
    bodyFamily: "'Outfit', system-ui, sans-serif",
    layout: "center-hero",
    headlineSize: 64,
    offerSize: 30,
    nameSize: 20,
    headlineMaxChars: 28,
  },
];

export type PosterTypographyOption = {
  id: string;
  label: string;
  description: string;
  layout: PosterTypography["layout"];
};

export function listPosterTypographyOptions(): PosterTypographyOption[] {
  return PRESETS.map((p) => ({
    id: p.id,
    label: p.label,
    description: p.description,
    layout: p.layout,
  }));
}

export function getPosterTypographyById(id: string | null | undefined): PosterTypography | null {
  if (!id?.trim()) return null;
  return PRESETS.find((p) => p.id === id.trim()) ?? null;
}

/** Default to soft editorial (readable) — not random Impact-style. */
export function pickPosterTypography(seed: string): PosterTypography {
  const preferred = getPosterTypographyById("soft-editorial");
  if (preferred) return preferred;
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
