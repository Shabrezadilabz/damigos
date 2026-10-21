import { z } from "zod";
import { aiChatCompletion, aiTextModel } from "./ai-text.js";
import { parseJsonFromModel } from "./deepseek-client.js";
import type { RestaurantBrandKit } from "./brand-kit.js";

const posterSpecSchema = z.object({
  headline: z.string(),
  offerLine: z.string(),
  subline: z.string(),
  primaryColor: z.string(),
  backgroundColor: z.string(),
  accentColor: z.string(),
  layoutHint: z.string(),
  foodHeroLine: z.string(),
  imageMood: z.string(),
  backgroundPattern: z.enum(["warm_gradient", "dark_bokeh", "festive_spices", "clean_menu"]).optional(),
});

export type PosterSpec = z.infer<typeof posterSpecSchema>;

/** Pull a dish cue from the owner headline (e.g. "Weekend biryani special" → biryani). */
export function extractFoodHeroFromBrief(headline: string, brandDish?: string | null): string {
  const h = headline.toLowerCase();
  const brand = brandDish?.replace(/\s*[£$€]\s*[\d,.]+/g, "").trim();
  if (brand && h.includes(brand.split(/\s+/)[0]!.toLowerCase())) {
    return `Hero: ${brand}`;
  }
  if (/\bbiryani\b/.test(h)) return "Hero: Hyderabadi Chicken Biryani";
  if (/\bpizza\b|\bburrata\b/.test(h)) return "Hero: Woodfired Pizza";
  if (/\btikka\b|\btandoori\b/.test(h)) return "Hero: Charred Malai Tikka";
  if (/\bburger\b|\bslider\b/.test(h)) return "Hero: Gourmet Sliders";
  if (/\bwings?\b/.test(h)) return "Hero: Crispy Wings";
  if (/\bdessert\b|\bsweet\b|\bice cream\b/.test(h)) return "Hero: Dessert special";
  if (brand) return `Hero: ${brand}`;
  return `Hero: ${headline.replace(/\s+/g, " ").trim().slice(0, 48)}`;
}

/** Branded layout when DeepSeek is off or auth/model fails — still renders SVG preview. */
export function localPosterSpec(input: {
  headline: string;
  offerLine: string;
  restaurantName: string;
  brand: RestaurantBrandKit | null;
}): PosterSpec {
  const brand = input.brand;
  const brandDish = brand?.dishes?.[0]?.name?.replace(/\s*[£$€]\s*[\d,.]+/g, "").trim();
  const foodHeroLine = extractFoodHeroFromBrief(input.headline, brandDish);
  return {
    headline: input.headline,
    offerLine: input.offerLine,
    subline: `Scan packaging QR · Order on ${input.restaurantName}`,
    primaryColor: brand?.primaryColor ?? "#B7122A",
    backgroundColor: brand?.backgroundColor ?? "#FCF9F8",
    accentColor: brand?.accentColor ?? "#775600",
    layoutHint: "WhatsApp status — offer-forward food layout",
    foodHeroLine,
    imageMood: "Warm tandoor glow · shallow depth · rich food colors · photorealistic plated dish",
    backgroundPattern: "festive_spices",
  };
}

export async function generatePosterSpec(input: {
  headline: string;
  offerLine: string;
  restaurantName: string;
  brand: RestaurantBrandKit | null;
}): Promise<PosterSpec> {
  const brand = input.brand;
  const prompt = `Create WhatsApp marketing poster copy spec as JSON only.
Restaurant: ${input.restaurantName}
Headline from owner: ${input.headline}
Offer line: ${input.offerLine}
Brand colors: primary ${brand?.primaryColor ?? "#B7122A"}, background ${brand?.backgroundColor ?? "#FCF9F8"}, accent ${brand?.accentColor ?? "#775600"}

Rules:
- India restaurant context — use ₹ never £/$/€ in any field.
- foodHeroLine MUST name the dish implied by the headline (e.g. headline "Weekend biryani special" → "Hero: Hyderabadi Chicken Biryani").
- subline MUST include the restaurant name "${input.restaurantName}".
- imageMood must describe a photorealistic plated food photo matching that dish.

Return JSON keys:
- headline (max 8 words), offerLine, subline (CTA, max 14 words, include restaurant name)
- primaryColor, backgroundColor, accentColor (hex #RRGGBB)
- layoutHint (one sentence)
- foodHeroLine (start with "Hero: " then specific Indian dish)
- imageMood (photography mood for background)
- backgroundPattern: one of warm_gradient | dark_bokeh | festive_spices | clean_menu`;

  const raw = await aiChatCompletion({
    model: aiTextModel(),
    jsonMode: true,
    thinking: "disabled",
    maxTokens: 1024,
    messages: [
      {
        role: "system",
        content: "You output strict JSON for food marketing posters. No markdown.",
      },
      { role: "user", content: prompt },
    ],
  });

  return posterSpecSchema.parse(parseJsonFromModel(raw));
}
