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

/** Branded layout when DeepSeek is off or auth/model fails — still renders SVG preview. */
export function localPosterSpec(input: {
  headline: string;
  offerLine: string;
  restaurantName: string;
  brand: RestaurantBrandKit | null;
}): PosterSpec {
  const brand = input.brand;
  const heroDish = brand?.dishes?.[0]?.name;
  return {
    headline: input.headline,
    offerLine: input.offerLine,
    subline: `Scan packaging QR · Spin & save on D'aMigo's`,
    primaryColor: brand?.primaryColor ?? "#B7122A",
    backgroundColor: brand?.backgroundColor ?? "#FCF9F8",
    accentColor: brand?.accentColor ?? "#775600",
    layoutHint: "WhatsApp status — offer-forward food layout",
    foodHeroLine: heroDish ? `Hero: ${heroDish}` : "Weekend specials · biryani & grills",
    imageMood: "Warm tandoor glow · shallow depth · rich food colors",
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

Return JSON keys:
- headline (max 8 words), offerLine, subline (CTA, max 12 words)
- primaryColor, backgroundColor, accentColor (hex #RRGGBB)
- layoutHint (one sentence)
- foodHeroLine (specific dish/offer visual, e.g. "Smoky butter chicken & biryani spread")
- imageMood (photography mood for background, e.g. "warm tandoor glow, shallow depth")
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
