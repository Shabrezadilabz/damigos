export type StickerTemplateId =
  | "luggage-tag"
  | "sale-ribbon"
  | "scan-shield"
  | "scan-circle"
  | "retro-notch"
  | "horizontal-badge"
  | "vertical-split"
  | "festive-frame";

export type StickerDesignOccasion =
  | "everyday"
  | "weekend"
  | "diwali"
  | "christmas"
  | "newyear"
  | "holi"
  | "eid"
  | "payday"
  | "birthday";

export type StickerMotif =
  | "none"
  | "diyas"
  | "rangoli"
  | "snowflakes"
  | "holly"
  | "fireworks"
  | "color-powder"
  | "crescent"
  | "balloons"
  | "confetti";

export type StickerPrintDesign = {
  id: number;
  name: string;
  template: StickerTemplateId;
  occasions: StickerDesignOccasion[];
  primary: string;
  secondary: string;
  accent: string;
  ribbon: string;
  ink: string;
  paper: string;
  /** Short ribbon / header line (e.g. Happy Diwali). */
  badge?: string;
  /** Print CTA under the QR. */
  cta?: string;
  motif?: StickerMotif;
};

export const STICKER_DESIGN_OCCASIONS: {
  id: StickerDesignOccasion | "all";
  label: string;
}[] = [
  { id: "all", label: "All" },
  { id: "everyday", label: "Everyday" },
  { id: "weekend", label: "Weekend" },
  { id: "diwali", label: "Diwali" },
  { id: "christmas", label: "Christmas" },
  { id: "newyear", label: "New Year" },
  { id: "holi", label: "Holi" },
  { id: "eid", label: "Eid" },
  { id: "payday", label: "Payday" },
  { id: "birthday", label: "Birthday" },
];

const TEMPLATES: { id: StickerTemplateId; label: string }[] = [
  { id: "luggage-tag", label: "Luggage tag" },
  { id: "sale-ribbon", label: "Sale ribbon" },
  { id: "scan-shield", label: "Scan shield" },
  { id: "scan-circle", label: "Scan badge" },
  { id: "retro-notch", label: "Retro notch" },
  { id: "horizontal-badge", label: "Wide badge" },
  { id: "vertical-split", label: "Split tag" },
];

type Palette = Omit<
  StickerPrintDesign,
  "id" | "name" | "template" | "occasions" | "badge" | "cta" | "motif"
>;

const EVERYDAY_PALETTES: Palette[] = [
  { primary: "#E85D04", secondary: "#370617", accent: "#FFBA08", ribbon: "#FFFFFF", ink: "#1B1B1B", paper: "#FFF8F0" },
  { primary: "#0077B6", secondary: "#023E8A", accent: "#FFD60A", ribbon: "#FFFFFF", ink: "#03045E", paper: "#F0F9FF" },
  { primary: "#2D6A4F", secondary: "#1B4332", accent: "#D8F3DC", ribbon: "#FFE8D6", ink: "#081C15", paper: "#F7FFF9" },
  { primary: "#006D77", secondary: "#83C5BE", accent: "#FFDDD2", ribbon: "#FFFFFF", ink: "#001219", paper: "#F0FDFA" },
];

const WEEKEND_PALETTES: Palette[] = [
  { primary: "#4361EE", secondary: "#3A0CA3", accent: "#F72585", ribbon: "#FFFFFF", ink: "#10002B", paper: "#F5F7FF" },
  { primary: "#FB8500", secondary: "#023047", accent: "#FFB703", ribbon: "#FFFFFF", ink: "#023047", paper: "#FFF8EF" },
];

const PAYDAY_PALETTES: Palette[] = [
  { primary: "#9D0208", secondary: "#6A040F", accent: "#FFEA00", ribbon: "#FFFFFF", ink: "#370617", paper: "#FFF5F5" },
  { primary: "#BC4749", secondary: "#6A040F", accent: "#F2E8CF", ribbon: "#FFE8D6", ink: "#3D0814", paper: "#FFFBF5" },
];

const BIRTHDAY_PALETTES: Palette[] = [
  { primary: "#5A189A", secondary: "#240046", accent: "#E0AAFF", ribbon: "#FFD60A", ink: "#10002B", paper: "#FAF5FF" },
  { primary: "#FF6B6B", secondary: "#C9184A", accent: "#FFE66D", ribbon: "#FFFFFF", ink: "#590D22", paper: "#FFF0F3" },
];

function pack(
  startId: number,
  templates: typeof TEMPLATES,
  palettes: Palette[],
  occasions: StickerDesignOccasion[],
  opts?: { badge?: string; cta?: string; motif?: StickerMotif; namePrefix?: string },
): StickerPrintDesign[] {
  const out: StickerPrintDesign[] = [];
  let id = startId;
  for (let p = 0; p < palettes.length; p++) {
    for (let t = 0; t < templates.length; t++) {
      const tmpl = templates[t]!;
      const pal = palettes[p]!;
      out.push({
        id: id++,
        name: opts?.namePrefix
          ? `${opts.namePrefix} · ${tmpl.label}`
          : `${tmpl.label} · ${String(p + 1).padStart(2, "0")}`,
        template: tmpl.id,
        occasions: [...occasions],
        ...pal,
        badge: opts?.badge,
        cta: opts?.cta,
        motif: opts?.motif ?? "none",
      });
    }
  }
  return out;
}

type FestivalSpec = {
  occasion: StickerDesignOccasion;
  name: string;
  badge: string;
  cta: string;
  motif: StickerMotif;
  template: StickerTemplateId;
  colors: Palette;
};

/** Curated festival / celebration layouts — distinct look + copy, not just palette swaps. */
const FESTIVAL_SPECS: FestivalSpec[] = [
  // Diwali
  {
    occasion: "diwali",
    name: "Diwali · Golden diyas",
    badge: "Happy Diwali",
    cta: "Scan for festive rewards",
    motif: "diyas",
    template: "festive-frame",
    colors: {
      primary: "#C45C26",
      secondary: "#4A0E0E",
      accent: "#FFD700",
      ribbon: "#FFF8E7",
      ink: "#3D0C02",
      paper: "#FFF8E7",
    },
  },
  {
    occasion: "diwali",
    name: "Diwali · Rangoli glow",
    badge: "Shubh Deepavali",
    cta: "Scan & light up rewards",
    motif: "rangoli",
    template: "scan-circle",
    colors: {
      primary: "#9B2226",
      secondary: "#370617",
      accent: "#EE9B00",
      ribbon: "#FFEA00",
      ink: "#370617",
      paper: "#FFF3E0",
    },
  },
  {
    occasion: "diwali",
    name: "Diwali · Marigold night",
    badge: "Diwali Special",
    cta: "Scan for Diwali offers",
    motif: "diyas",
    template: "vertical-split",
    colors: {
      primary: "#E09F3E",
      secondary: "#540B0E",
      accent: "#FFF3B0",
      ribbon: "#FFFFFF",
      ink: "#540B0E",
      paper: "#FFFBF0",
    },
  },
  // Christmas
  {
    occasion: "christmas",
    name: "Christmas · Holly green",
    badge: "Merry Christmas",
    cta: "Scan for holiday treats",
    motif: "holly",
    template: "festive-frame",
    colors: {
      primary: "#1B4332",
      secondary: "#081C15",
      accent: "#D00000",
      ribbon: "#FFFFFF",
      ink: "#081C15",
      paper: "#F1FAEE",
    },
  },
  {
    occasion: "christmas",
    name: "Christmas · Candy stripe",
    badge: "Ho Ho Ho",
    cta: "Scan for Xmas rewards",
    motif: "snowflakes",
    template: "sale-ribbon",
    colors: {
      primary: "#C1121F",
      secondary: "#780000",
      accent: "#FDF0D5",
      ribbon: "#FFFFFF",
      ink: "#003049",
      paper: "#FFF5F5",
    },
  },
  {
    occasion: "christmas",
    name: "Christmas · Snow night",
    badge: "Season's Greetings",
    cta: "Scan under the tree",
    motif: "snowflakes",
    template: "scan-shield",
    colors: {
      primary: "#0A9396",
      secondary: "#001219",
      accent: "#E9D8A6",
      ribbon: "#FFFFFF",
      ink: "#001219",
      paper: "#E0FBFC",
    },
  },
  // New Year
  {
    occasion: "newyear",
    name: "New Year · Midnight gold",
    badge: "Happy New Year",
    cta: "Scan into the new year",
    motif: "fireworks",
    template: "festive-frame",
    colors: {
      primary: "#10002B",
      secondary: "#240046",
      accent: "#FFD60A",
      ribbon: "#FFD60A",
      ink: "#10002B",
      paper: "#F8F0FF",
    },
  },
  {
    occasion: "newyear",
    name: "New Year · Countdown",
    badge: "Cheers 2026",
    cta: "Scan for NYE rewards",
    motif: "fireworks",
    template: "horizontal-badge",
    colors: {
      primary: "#212529",
      secondary: "#000000",
      accent: "#F72585",
      ribbon: "#FFFFFF",
      ink: "#212529",
      paper: "#F8F9FA",
    },
  },
  {
    occasion: "newyear",
    name: "New Year · Sparkle",
    badge: "New Year Special",
    cta: "Scan & celebrate",
    motif: "confetti",
    template: "scan-circle",
    colors: {
      primary: "#3A0CA3",
      secondary: "#10002B",
      accent: "#4CC9F0",
      ribbon: "#FFD60A",
      ink: "#10002B",
      paper: "#F0E6FF",
    },
  },
  // Holi
  {
    occasion: "holi",
    name: "Holi · Color splash",
    badge: "Happy Holi",
    cta: "Scan for Holi fun",
    motif: "color-powder",
    template: "festive-frame",
    colors: {
      primary: "#FF006E",
      secondary: "#8338EC",
      accent: "#FFBE0B",
      ribbon: "#FFFFFF",
      ink: "#3A0CA3",
      paper: "#FFF0F6",
    },
  },
  {
    occasion: "holi",
    name: "Holi · Gulal burst",
    badge: "Rang Barse",
    cta: "Scan & play Holi",
    motif: "color-powder",
    template: "sale-ribbon",
    colors: {
      primary: "#FB5607",
      secondary: "#3A86FF",
      accent: "#FF006E",
      ribbon: "#FFBE0B",
      ink: "#1D3557",
      paper: "#FFF9F0",
    },
  },
  // Eid
  {
    occasion: "eid",
    name: "Eid · Crescent night",
    badge: "Eid Mubarak",
    cta: "Scan for Eid blessings",
    motif: "crescent",
    template: "festive-frame",
    colors: {
      primary: "#1D3557",
      secondary: "#0B132B",
      accent: "#E9C46A",
      ribbon: "#F1FAEE",
      ink: "#0B132B",
      paper: "#F1FAEE",
    },
  },
  {
    occasion: "eid",
    name: "Eid · Lantern gold",
    badge: "Eid Special",
    cta: "Scan for Eid offers",
    motif: "crescent",
    template: "vertical-split",
    colors: {
      primary: "#2A9D8F",
      secondary: "#264653",
      accent: "#E9C46A",
      ribbon: "#FFFFFF",
      ink: "#264653",
      paper: "#F8FFFA",
    },
  },
  // Birthday (named, with motif)
  {
    occasion: "birthday",
    name: "Birthday · Party balloons",
    badge: "Happy Birthday",
    cta: "Scan for birthday treat",
    motif: "balloons",
    template: "festive-frame",
    colors: {
      primary: "#FF6B6B",
      secondary: "#C9184A",
      accent: "#FFE66D",
      ribbon: "#FFFFFF",
      ink: "#590D22",
      paper: "#FFF0F3",
    },
  },
  {
    occasion: "birthday",
    name: "Birthday · Confetti",
    badge: "It's your day!",
    cta: "Scan for a surprise",
    motif: "confetti",
    template: "scan-circle",
    colors: {
      primary: "#5A189A",
      secondary: "#240046",
      accent: "#FFD60A",
      ribbon: "#E0AAFF",
      ink: "#10002B",
      paper: "#FAF5FF",
    },
  },
  // Payday named
  {
    occasion: "payday",
    name: "Payday · Cash splash",
    badge: "Payday Treat",
    cta: "Scan for payday deal",
    motif: "confetti",
    template: "sale-ribbon",
    colors: {
      primary: "#007200",
      secondary: "#004B23",
      accent: "#FFD60A",
      ribbon: "#FFFFFF",
      ink: "#004B23",
      paper: "#F0FFF4",
    },
  },
  {
    occasion: "payday",
    name: "Payday · Wallet warm",
    badge: "Salary Special",
    cta: "Scan & save today",
    motif: "none",
    template: "horizontal-badge",
    colors: {
      primary: "#9D0208",
      secondary: "#6A040F",
      accent: "#FFEA00",
      ribbon: "#FFFFFF",
      ink: "#370617",
      paper: "#FFF5F5",
    },
  },
  // Weekend named
  {
    occasion: "weekend",
    name: "Weekend · Brunch vibes",
    badge: "Weekend Special",
    cta: "Scan for weekend perks",
    motif: "confetti",
    template: "retro-notch",
    colors: {
      primary: "#FB8500",
      secondary: "#023047",
      accent: "#FFB703",
      ribbon: "#FFFFFF",
      ink: "#023047",
      paper: "#FFF8EF",
    },
  },
  {
    occasion: "weekend",
    name: "Weekend · Night out",
    badge: "Fri–Sun Fun",
    cta: "Scan this weekend",
    motif: "none",
    template: "scan-shield",
    colors: {
      primary: "#4361EE",
      secondary: "#3A0CA3",
      accent: "#F72585",
      ribbon: "#FFFFFF",
      ink: "#10002B",
      paper: "#F5F7FF",
    },
  },
];

const baseEveryday = pack(1, TEMPLATES, EVERYDAY_PALETTES, ["everyday"], {
  cta: "Scan & win rewards",
  motif: "none",
});
const baseWeekend = pack(1 + baseEveryday.length, TEMPLATES.slice(0, 4), WEEKEND_PALETTES, ["weekend"], {
  badge: "Weekend",
  cta: "Scan for weekend rewards",
  motif: "none",
  namePrefix: "Weekend",
});
const basePayday = pack(
  1 + baseEveryday.length + baseWeekend.length,
  TEMPLATES.filter((t) => t.id === "sale-ribbon" || t.id === "horizontal-badge"),
  PAYDAY_PALETTES,
  ["payday"],
  { badge: "Payday", cta: "Scan for payday deal", motif: "none", namePrefix: "Payday" },
);
const baseBirthday = pack(
  1 + baseEveryday.length + baseWeekend.length + basePayday.length,
  TEMPLATES.filter((t) => t.id === "scan-circle" || t.id === "luggage-tag"),
  BIRTHDAY_PALETTES,
  ["birthday"],
  { badge: "Birthday", cta: "Scan for birthday treat", motif: "balloons", namePrefix: "Birthday" },
);

const basePack = [...baseEveryday, ...baseWeekend, ...basePayday, ...baseBirthday];

const festivalPack: StickerPrintDesign[] = FESTIVAL_SPECS.map((spec, i) => ({
  id: basePack.length + i + 1,
  name: spec.name,
  template: spec.template,
  occasions: [spec.occasion],
  ...spec.colors,
  badge: spec.badge,
  cta: spec.cta,
  motif: spec.motif,
}));

/** Everyday pack + curated festival / celebration designs. */
export const STICKER_PRINT_DESIGNS: StickerPrintDesign[] = [...basePack, ...festivalPack];

export function templateLabel(id: StickerTemplateId): string {
  if (id === "festive-frame") return "Festive frame";
  return TEMPLATES.find((t) => t.id === id)?.label ?? id;
}

export function filterStickerDesigns(
  designs: StickerPrintDesign[],
  occasion: StickerDesignOccasion | "all",
): StickerPrintDesign[] {
  if (occasion === "all") return designs;
  return designs.filter((d) => d.occasions.includes(occasion));
}
