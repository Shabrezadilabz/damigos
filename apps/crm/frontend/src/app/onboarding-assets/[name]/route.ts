import { readFile } from "node:fs/promises";
import path from "node:path";
import type { NextRequest } from "next/server";

const ASSETS: Record<string, string> = {
  "menu-ai.png": "crm_3_menu_draft_ai_review_item_drawer/screen.png",
  "whatsapp-campaigns.png": "crm_4_grow_campaign_wizard_marketing_hub/screen.png",
  "hub-discovery.png": "g17_hero_hub_discovery/screen.png",
  "grow-poster.png": "crm_4_grow_ai_poster_copilot/screen.png",
};

/** Serve Stitch PNGs from design-reference (no duplicate copies in public/) */
export async function GET(_request: NextRequest, context: { params: Promise<{ name: string }> }) {
  const { name } = await context.params;
  const rel = ASSETS[name];
  if (!rel) {
    return new Response("Not found", { status: 404 });
  }
  const filePath = path.join(process.cwd(), "../../../design-reference/stitch", rel);
  try {
    const buf = await readFile(filePath);
    return new Response(buf, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return new Response("Asset missing on disk", { status: 404 });
  }
}
