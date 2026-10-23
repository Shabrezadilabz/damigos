import type { PosterSpec } from "./generate-poster-spec.js";
import {
  getPosterTypographyById,
  pickPosterTypography,
  splitHeadlineForTypography,
  type PosterTypography,
} from "./poster-typography.js";

export {
  getPosterTypographyById,
  listPosterTypographyOptions,
  pickPosterTypography,
  type PosterTypography,
  type PosterTypographyOption,
} from "./poster-typography.js";

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export type PosterRenderOptions = {
  backgroundImageUrl?: string;
  backgroundDataUrl?: string;
  typography?: PosterTypography;
  typographySeed?: string;
};

export async function fetchImageAsDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(25_000) });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    const mime = (res.headers.get("content-type") ?? "image/jpeg").split(";")[0]?.trim() || "image/jpeg";
    return `data:${mime};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

function headlineSvg(
  lines: string[],
  typo: PosterTypography,
  hasPhoto: boolean,
  primary: string,
): string {
  const fill = hasPhoto ? "#ffffff" : "#1b1b1b";
  const cx = typo.layout === "center-hero" ? 512 : 72;
  const anchor = typo.layout === "center-hero" ? "middle" : "start";
  const startY = typo.layout === "center-hero" ? 200 : 175;
  const lineGap = typo.headlineSize * 1.05;

  return lines
    .map(
      (line, i) =>
        `<text x="${cx}" y="${startY + i * lineGap}" text-anchor="${anchor}" fill="${fill}" font-family="${typo.displayFamily}" font-size="${typo.headlineSize}" font-weight="800">${escapeXml(line)}</text>`,
    )
    .join("\n  ");
}

/** 1024×1024 WhatsApp-style poster (SVG data URL). Optional Hive photo under copy. */
export function renderPosterSvgDataUrl(
  spec: PosterSpec,
  restaurantName: string,
  options?: PosterRenderOptions,
): string {
  const w = 1024;
  const h = 1024;
  const bgHref = options?.backgroundDataUrl ?? options?.backgroundImageUrl;
  const hasPhoto = Boolean(bgHref);
  const typo =
    options?.typography ??
    pickPosterTypography(options?.typographySeed ?? `${spec.headline}-${spec.offerLine}`);

  const bg = spec.backgroundColor.startsWith("#") ? spec.backgroundColor : "#FCF9F8";
  const primary = spec.primaryColor.startsWith("#") ? spec.primaryColor : "#B7122A";
  const accent = spec.accentColor.startsWith("#") ? spec.accentColor : "#775600";

  const pattern =
    spec.backgroundPattern === "dark_bokeh"
      ? `<radialGradient id="g" cx="50%" cy="35%" r="70%"><stop offset="0%" stop-color="${accent}" stop-opacity="0.35"/><stop offset="100%" stop-color="#1a1a1a"/></radialGradient>`
      : spec.backgroundPattern === "festive_spices"
        ? `<linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${primary}"/><stop offset="50%" stop-color="${accent}"/><stop offset="100%" stop-color="${bg}"/></linearGradient>`
        : `<linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${bg}"/><stop offset="55%" stop-color="${accent}" stop-opacity="0.25"/><stop offset="100%" stop-color="${primary}" stop-opacity="0.15"/></linearGradient>`;

  const photoLayer = hasPhoto
    ? `<image href="${escapeXml(bgHref!)}" x="0" y="0" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice"/>
  <rect width="100%" height="100%" fill="url(#topShade)"/>
  <rect width="100%" height="100%" fill="url(#bottomShade)"/>`
    : `<rect width="100%" height="100%" fill="url(#g)"/>
  <circle cx="780" cy="220" r="180" fill="${primary}" opacity="0.12"/>
  <circle cx="200" cy="880" r="240" fill="${accent}" opacity="0.18"/>`;

  const headlineLines = splitHeadlineForTypography(spec.headline, typo.headlineMaxChars);
  const headlineBlock = headlineSvg(headlineLines, typo, hasPhoto, primary);

  const nameX = typo.layout === "center-hero" ? 512 : 72;
  const nameAnchor = typo.layout === "center-hero" ? "middle" : "start";
  const nameY = typo.layout === "center-hero" ? 88 : 96;
  const nameFill = hasPhoto ? "#ffffff" : primary;

  const offerY =
    typo.layout === "center-hero"
      ? 200 + headlineLines.length * typo.headlineSize * 1.05 + 36
      : 175 + headlineLines.length * typo.headlineSize * 1.05 + 48;
  const offerX = typo.layout === "center-hero" ? 512 : 72;
  const offerAnchor = typo.layout === "center-hero" ? "middle" : "start";
  const offerFill = hasPhoto ? "#ffe8e8" : primary;

  const heroY = offerY + 56;
  const heroX = typo.layout === "center-hero" ? 512 : 72;
  const heroAnchor = typo.layout === "center-hero" ? "middle" : "start";
  const heroFill = hasPhoto ? "#f5f5f5" : "#333333";

  const subY = heroY + 44;
  const moodBlock = hasPhoto
    ? `<text x="${heroX}" y="${heroY}" text-anchor="${heroAnchor}" fill="${heroFill}" font-family="${typo.bodyFamily}" font-size="28" font-weight="500">${escapeXml(spec.foodHeroLine)}</text>
  <text x="${heroX}" y="${subY}" text-anchor="${heroAnchor}" fill="#e8e8e8" font-family="${typo.bodyFamily}" font-size="22">${escapeXml(spec.subline)}</text>`
    : `<rect x="72" y="440" width="880" height="280" rx="24" fill="#ffffff" opacity="0.92"/>
  <text x="96" y="520" fill="#666" font-family="${typo.bodyFamily}" font-size="24">Visual mood</text>
  <text x="96" y="570" fill="#1b1b1b" font-family="${typo.bodyFamily}" font-size="28">${escapeXml(spec.imageMood)}</text>
  <text x="96" y="640" fill="${accent}" font-family="${typo.bodyFamily}" font-size="26" font-weight="600">${escapeXml(spec.subline)}</text>`;

  const ctaW = typo.layout === "center-hero" ? 460 : 420;
  const ctaX = typo.layout === "center-hero" ? (w - ctaW) / 2 : 72;
  const ctaTextX = ctaX + ctaW / 2;

  const ruleY =
    typo.layout === "center-hero"
      ? 200 + headlineLines.length * typo.headlineSize * 1.05 + 12
      : 175 + headlineLines.length * typo.headlineSize * 1.05 + 8;
  const rule =
    typo.layout === "center-hero"
      ? `<rect x="312" y="${ruleY}" width="400" height="4" fill="${primary}" opacity="${hasPhoto ? 0.85 : 0.5}"/>`
      : `<rect x="72" y="${ruleY}" width="880" height="4" fill="${primary}" opacity="${hasPhoto ? 0.85 : 0.5}"/>`;

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <style>@import url('${typo.googleFontsUrl}');</style>
    ${hasPhoto ? "" : pattern}
    <linearGradient id="topShade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#000" stop-opacity="0.78"/>
      <stop offset="50%" stop-color="#000" stop-opacity="0.4"/>
      <stop offset="100%" stop-color="#000" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="bottomShade" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0%" stop-color="#000" stop-opacity="0.6"/>
      <stop offset="40%" stop-color="#000" stop-opacity="0"/>
      <stop offset="100%" stop-color="#000" stop-opacity="0"/>
    </linearGradient>
  </defs>
  ${photoLayer}
  <text x="${nameX}" y="${nameY}" text-anchor="${nameAnchor}" fill="${nameFill}" font-family="${typo.bodyFamily}" font-size="${typo.nameSize}" font-weight="700" letter-spacing="0.04em">${escapeXml(restaurantName.toUpperCase())}</text>
  ${headlineBlock}
  ${rule}
  <text x="${offerX}" y="${offerY}" text-anchor="${offerAnchor}" fill="${offerFill}" font-family="${typo.bodyFamily}" font-size="${typo.offerSize}" font-weight="700">${escapeXml(spec.offerLine)}</text>
  ${hasPhoto ? "" : `<text x="72" y="380" fill="${heroFill}" font-family="${typo.bodyFamily}" font-size="30">${escapeXml(spec.foodHeroLine)}</text>`}
  ${moodBlock}
  <rect x="${ctaX}" y="880" width="${ctaW}" height="72" rx="36" fill="${primary}"/>
  <text x="${ctaTextX}" y="928" text-anchor="middle" fill="#fff" font-family="${typo.bodyFamily}" font-size="28" font-weight="700">Scan &amp; Order</text>
  <text x="${nameX}" y="990" text-anchor="${nameAnchor}" fill="${hasPhoto ? "#ddd" : "#666"}" font-family="${typo.bodyFamily}" font-size="18">${escapeXml(restaurantName)} · WhatsApp ordering</text>
</svg>`;

  const b64 = Buffer.from(svg, "utf8").toString("base64");
  return `data:image/svg+xml;base64,${b64}`;
}

/** Resolve typography by id, falling back to default soft editorial. */
export function resolvePosterTypography(id?: string | null, seed?: string): PosterTypography {
  return getPosterTypographyById(id) ?? pickPosterTypography(seed ?? "default");
}
