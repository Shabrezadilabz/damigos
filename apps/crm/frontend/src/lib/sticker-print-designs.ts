export type StickerTemplateId =
  | "luggage-tag"
  | "sale-ribbon"
  | "scan-shield"
  | "scan-circle"
  | "retro-notch"
  | "horizontal-badge"
  | "vertical-split";

/** Occasion filters for the design library (aligned with Grow calendar language). */
export type StickerDesignOccasion =
  | "everyday"
  | "weekend"
  | "festive"
  | "payday"
  | "birthday";

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
};

export const STICKER_DESIGN_OCCASIONS: {
  id: StickerDesignOccasion | "all";
  label: string;
}[] = [
  { id: "all", label: "All" },
  { id: "everyday", label: "Everyday" },
  { id: "weekend", label: "Weekend" },
  { id: "festive", label: "Festive" },
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

const PALETTES = [
  { primary: "#E85D04", secondary: "#370617", accent: "#FFBA08", ribbon: "#FFFFFF", ink: "#1B1B1B", paper: "#FFF8F0" },
  { primary: "#0077B6", secondary: "#023E8A", accent: "#FFD60A", ribbon: "#FFFFFF", ink: "#03045E", paper: "#F0F9FF" },
  { primary: "#2D6A4F", secondary: "#1B4332", accent: "#D8F3DC", ribbon: "#FFE8D6", ink: "#081C15", paper: "#F7FFF9" },
  { primary: "#9D0208", secondary: "#6A040F", accent: "#FFEA00", ribbon: "#FFFFFF", ink: "#370617", paper: "#FFF5F5" },
  { primary: "#5A189A", secondary: "#240046", accent: "#E0AAFF", ribbon: "#FFD60A", ink: "#10002B", paper: "#FAF5FF" },
  { primary: "#006D77", secondary: "#83C5BE", accent: "#FFDDD2", ribbon: "#FFFFFF", ink: "#001219", paper: "#F0FDFA" },
  { primary: "#BC4749", secondary: "#6A040F", accent: "#F2E8CF", ribbon: "#FFE8D6", ink: "#3D0814", paper: "#FFFBF5" },
  { primary: "#4361EE", secondary: "#3A0CA3", accent: "#F72585", ribbon: "#FFFFFF", ink: "#10002B", paper: "#F5F7FF" },
];

const ROTATING: StickerDesignOccasion[] = ["everyday", "weekend", "festive", "payday", "birthday"];

function occasionsFor(
  index: number,
  template: StickerTemplateId,
  paletteIdx: number,
): StickerDesignOccasion[] {
  const tags = new Set<StickerDesignOccasion>([ROTATING[index % ROTATING.length]!]);

  if (template === "sale-ribbon" || template === "horizontal-badge") tags.add("payday");
  if (template === "luggage-tag" || template === "scan-shield") tags.add("everyday");
  if (template === "retro-notch" || template === "scan-circle") tags.add("weekend");
  if (template === "vertical-split") tags.add("festive");

  // Warm / red / purple palettes read as celebration or payday.
  if (paletteIdx === 0 || paletteIdx === 3) tags.add("festive");
  if (paletteIdx === 3 || paletteIdx === 6) tags.add("payday");
  if (paletteIdx === 1 || paletteIdx === 5 || paletteIdx === 7) tags.add("weekend");
  if (paletteIdx === 4 || paletteIdx === 7) tags.add("birthday");
  if (paletteIdx === 2 || paletteIdx === 5) tags.add("everyday");

  return [...tags];
}

/** 50 tag-style layouts (template × palette), inspired by retail / scan-me sticker packs. */
export const STICKER_PRINT_DESIGNS: StickerPrintDesign[] = Array.from({ length: 50 }, (_, i) => {
  const t = TEMPLATES[i % TEMPLATES.length]!;
  const paletteIdx = Math.floor(i / TEMPLATES.length) % PALETTES.length;
  const p = PALETTES[paletteIdx]!;
  return {
    id: i + 1,
    name: `${t.label} · ${String((i % PALETTES.length) + 1).padStart(2, "0")}`,
    template: t.id,
    occasions: occasionsFor(i, t.id, paletteIdx),
    ...p,
  };
});

export function templateLabel(id: StickerTemplateId): string {
  return TEMPLATES.find((t) => t.id === id)?.label ?? id;
}

export function filterStickerDesigns(
  designs: StickerPrintDesign[],
  occasion: StickerDesignOccasion | "all",
): StickerPrintDesign[] {
  if (occasion === "all") return designs;
  return designs.filter((d) => d.occasions.includes(occasion));
}
