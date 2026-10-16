import { aiTextProvider, deepseekApiKey } from "@damigos/domain";

import { z } from "zod";

import { aiChatCompletion, aiTextModel, aiVisionModel } from "./ai-text.js";

import { deepseekVisionModel, parseJsonFromModel } from "./deepseek-client.js";

import {
  dedupeMenuImportDishes,
  expandEmbeddedPriceDishes,
  filterValidDishes,
  isJunkMenuDishName,
} from "./menu-dish-quality.js";
import { parseMenuTranscript } from "./parse-menu-transcript.js";

import { clampVarchar, mergeDescription, normalizeMenuItemName } from "../sanitize-menu-varchar.js";
import { restaurantBrandKitSchema, type RestaurantBrandKit } from "./brand-kit.js";



const extractSchema = z.object({

  restaurantName: z.string(),

  primaryColor: z.string(),

  backgroundColor: z.string(),

  accentColor: z.string(),

  logoNotes: z.string().optional().nullable(),

  dishes: z.array(

    z.object({

      name: z.string(),

      description: z.string().optional().nullable(),

      priceInr: z.number().optional(),

      pricePaise: z.number().optional(),

      isVeg: z.boolean().optional(),

      category: z.string().optional().nullable(),

      confidence: z.number().optional(),

    }),

  ),

});



const VISION_JSON_PROMPT =

  "You see a restaurant menu photo. Output ONLY one JSON object. First char { last char }. No other text." +

  ' {"restaurantName":"","primaryColor":"#RRGGBB","backgroundColor":"#RRGGBB","accentColor":"#RRGGBB","logoNotes":"","dishes":[]}' +

  " Fill dishes[] only from text visible on the photo. priceInr in rupees. Max 40.";



const VISION_TRANSCRIBE_PROMPT = `You are OCR for a restaurant menu photo. Copy printed text only — no JSON, no instructions, no placeholders.

Skip column headers alone (MINI, REG). Section titles (e.g. BIRYANI) are not dishes.

RESTAURANT:
COLORS: primary #RRGGBB background #RRGGBB accent #RRGGBB
LOGO:
DISHES:
(one line per menu item: dish name exactly as printed, then | then ₹ price, then veg or nonveg, then section)
Two prices on one row → two DISHES lines with (Mini) and (Regular) in the name.`;



const VISION_TRANSCRIBE_MINIMAL =

  "List every menu item from the image, one per line:\nNAME | ₹PRICE | veg or nonveg\nNo introduction, no JSON, no planning.";



const STRUCTURE_JSON_PROMPT = `Convert this menu transcript to ONE JSON object only (no prose).

Keys: restaurantName, primaryColor, backgroundColor, accentColor, logoNotes, dishes[]

Each dish: name, description, priceInr (number), isVeg (boolean), category, confidence (0-100)

Hex colors #RRGGBB. Max 40 dishes.



Transcript:

`;



function menuImportVisionModel(): string {

  const override = process.env.MENU_IMPORT_VISION_PROVIDER?.trim().toLowerCase();

  if (override === "deepseek" && deepseekApiKey()) return deepseekVisionModel();

  return aiVisionModel();

}



function normalizeHex(c: string): string {

  const s = c.trim();

  if (/^#[0-9A-Fa-f]{6}$/.test(s)) return s;

  if (/^[0-9A-Fa-f]{6}$/.test(s)) return `#${s}`;

  return "#B7122A";

}



function toPaise(d: { pricePaise?: number; priceInr?: number }): number {

  if (typeof d.pricePaise === "number" && d.pricePaise >= 0) return d.pricePaise;

  if (typeof d.priceInr === "number" && d.priceInr >= 0) return Math.round(d.priceInr * 100);

  return 0;

}



function looksLikePlanningProse(raw: string): boolean {

  const t = raw.trim();

  if (t.startsWith("{")) return false;

  if (t.includes("RESTAURANT:") || t.includes("DISHES:")) return false;

  if (t.includes('"restaurantName"') || t.includes('"dishes"')) return false;

  return (

    /^(we need|need to|need answer|let'?s |must |analyze |the task|i will|i'll |first,? we)/i.test(t) ||

    (/need .*json/i.test(t) && !t.includes("{")) ||

    (/valid json/i.test(t) && !t.includes("{"))

  );

}



function tryParseExtract(raw: string): z.infer<typeof extractSchema> | null {

  try {

    const obj = parseJsonFromModel(raw);

    const parsed = extractSchema.parse(obj);

    const dishes = filterValidDishes(parsed.dishes);

    if (dishes.length === 0) return null;

    return { ...parsed, dishes };

  } catch {

    return null;

  }

}



function draftToExtract(draft: ReturnType<typeof parseMenuTranscript>): z.infer<typeof extractSchema> | null {

  if (!draft || draft.dishes.length === 0) return null;

  const dishes = filterValidDishes(
    draft.dishes.map((d) => ({
      name: d.name,
      description: d.description,
      priceInr: d.priceInr,
      isVeg: d.isVeg,
      category: d.category,
      confidence: d.confidence,
    })),
  );

  if (dishes.length === 0) return null;

  return {
    restaurantName: draft.restaurantName,
    primaryColor: draft.primaryColor,
    backgroundColor: draft.backgroundColor,
    accentColor: draft.accentColor,
    logoNotes: draft.logoNotes,
    dishes,
  };

}



async function visionWithImage(

  dataUrl: string,

  text: string,

  timeoutMs?: number,

  model?: string,

): Promise<string> {

  return aiChatCompletion({

    model: model ?? menuImportVisionModel(),

    thinking: "disabled",

    jsonMode: false,

    maxTokens: 4096,

    timeoutMs,

    messages: [

      {

        role: "user",

        content: [

          { type: "text", text },

          { type: "image_url", image_url: { url: dataUrl } },

        ],

      },

    ],

  });

}



async function textToMenuJson(transcript: string, timeoutMs?: number): Promise<string> {

  return aiChatCompletion({

    model: aiTextModel(),

    jsonMode: true,

    maxTokens: 4096,

    timeoutMs,

    messages: [

      {

        role: "user",

        content: STRUCTURE_JSON_PROMPT + transcript.slice(0, 20_000),

      },

    ],

  });

}



async function repairMenuJson(

  raw: string,

  timeoutMs?: number,

): Promise<z.infer<typeof extractSchema> | null> {

  try {

    const fixed = await aiChatCompletion({

      model: aiTextModel(),

      jsonMode: true,

      maxTokens: 4096,

      timeoutMs,

      messages: [

        {

          role: "user",

          content:

            "Emit ONLY a JSON object (menu extract). No prose. Schema: restaurantName, primaryColor, backgroundColor, accentColor, logoNotes, dishes[{name,description,priceInr,isVeg,category,confidence}].\n\nInput:\n" +

            raw.slice(0, 16_000),

        },

      ],

    });

    return tryParseExtract(fixed);

  } catch {

    return null;

  }

}



function scoreMenuExtract(candidate: z.infer<typeof extractSchema> | null): number {
  if (!candidate) return -1;
  let score = 0;
  for (const d of candidate.dishes) {
    if (isJunkMenuDishName(d.name, d.description ?? null)) {
      score -= 20;
      continue;
    }
    score += 8;
    if ((d.priceInr ?? 0) > 0 || (d.pricePaise ?? 0) > 0) score += 6;
    if ((d.name?.trim().length ?? 0) >= 6) score += 2;
  }
  return score;
}

function pickBetterExtract(
  a: z.infer<typeof extractSchema> | null,
  b: z.infer<typeof extractSchema> | null,
): z.infer<typeof extractSchema> | null {
  const sa = scoreMenuExtract(a);
  const sb = scoreMenuExtract(b);
  if (sa < 0 && sb < 0) return null;
  if (sa >= sb) return a;
  return b;
}

async function runExtractPipeline(

  dataUrl: string,

  timeoutMs?: number,

  visionModel?: string,

): Promise<z.infer<typeof extractSchema> | null> {

  let parsed: z.infer<typeof extractSchema> | null = null;

  let transcript = await visionWithImage(dataUrl, VISION_TRANSCRIBE_PROMPT, timeoutMs, visionModel);

  if (looksLikePlanningProse(transcript)) {

    transcript = await visionWithImage(dataUrl, VISION_TRANSCRIBE_MINIMAL, timeoutMs, visionModel);

  }

  const fromTranscript = draftToExtract(parseMenuTranscript(transcript));

  const jsonAttempt = await visionWithImage(dataUrl, VISION_JSON_PROMPT, timeoutMs, visionModel);

  const fromJson = !looksLikePlanningProse(jsonAttempt) ? tryParseExtract(jsonAttempt) : null;

  parsed = pickBetterExtract(fromTranscript, fromJson);

  if (parsed) return parsed;



  if (!looksLikePlanningProse(transcript)) {

    const structured = await textToMenuJson(transcript, timeoutMs);

    parsed = tryParseExtract(structured);

    if (!parsed) {

      parsed = draftToExtract(parseMenuTranscript(structured));

    }

    if (!parsed) {

      parsed = await repairMenuJson(structured, timeoutMs);

    }

    if (!parsed) {

      parsed = await repairMenuJson(transcript, timeoutMs);

    }

  }



  return parsed;

}



/** Vision extract: menu image → brand kit + dish list (Hive / DeepSeek vision). */

export async function extractMenuBrandFromImage(

  dataUrl: string,

  timeoutMs?: number,

): Promise<RestaurantBrandKit> {

  if (dataUrl.length > 2_500_000) {

    throw new Error("Menu image too large for Hive vision — use a smaller JPG (under ~1.5MB)");

  }



  let parsed = await runExtractPipeline(dataUrl, timeoutMs);



  if (

    !parsed &&

    aiTextProvider() === "hive" &&

    deepseekApiKey() &&

    process.env.MENU_IMPORT_VISION_PROVIDER?.trim().toLowerCase() !== "deepseek"

  ) {

    parsed = await runExtractPipeline(dataUrl, timeoutMs, deepseekVisionModel());

  }



  if (!parsed) {

    const hint =

      aiTextProvider() === "hive"

        ? "Set MENU_IMPORT_VISION_PROVIDER=deepseek and DEEPSEEK_API_KEY, or HIVE_VISION_MODEL to a vision model."

        : "Check DEEPSEEK_API_KEY and DEEPSEEK_MODEL_VISION.";

    throw new Error(

      `Could not parse menu from AI output. Use one sharp menu page (1280px JPEG). ${hint}`,

    );

  }



  const kit: RestaurantBrandKit = {

    displayName: clampVarchar(parsed.restaurantName.trim() || "Restaurant", 250),

    primaryColor: normalizeHex(parsed.primaryColor),

    backgroundColor: normalizeHex(parsed.backgroundColor),

    accentColor: normalizeHex(parsed.accentColor),

    logoDataUrl: null,

    logoNotes: parsed.logoNotes ?? null,

    dishes: filterValidDishes(
      dedupeMenuImportDishes(
        expandEmbeddedPriceDishes(
          parsed.dishes
            .filter((d) => d.name.trim().length > 0)
            .slice(0, 40)
            .map((d) => {
          const { name, extraDescription } = normalizeMenuItemName(d.name);
          return {
            name,
            description: mergeDescription(d.description ?? null, extraDescription),
            priceInr: typeof d.priceInr === "number" ? d.priceInr : undefined,
            pricePaise: toPaise(d),
            isVeg: d.isVeg ?? true,
            category: d.category ? clampVarchar(d.category, 64) : null,
            confidence: Math.min(100, Math.max(0, Math.round(d.confidence ?? 80))),
          };
            }),
        ),
      ),
    ),

    extractedAt: new Date().toISOString(),

    model: menuImportVisionModel(),

  };



  if (kit.dishes.length === 0) {

    throw new Error("AI found no dishes on this photo — crop to a single menu page with visible item names and prices.");

  }



  return restaurantBrandKitSchema.parse(kit);

}


