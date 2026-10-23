"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { HubCollectionView } from "@/components/hub-collection-view";
import { HUB_COLLECTIONS, type HubCollectionSlug } from "@/lib/hub-collections";

function SearchInner() {
  const sp = useSearchParams();
  const q = (sp.get("q") ?? "").trim();
  const lower = q.toLowerCase();
  const slug: HubCollectionSlug =
    lower.includes("shawarma") || lower.includes("grill")
      ? "shawarma"
      : lower.includes("biryani")
        ? "biryani"
        : lower.includes("healthy") || lower.includes("salad") || lower.includes("bowl")
          ? "healthy"
          : lower.includes("festival") || lower.includes("sweet") || lower.includes("thali")
            ? "festival"
            : lower.includes("dosa") || lower.includes("idli") || lower.includes("south")
              ? "biryani" // soft: still pass q so dish/kitchen search finds south Indian menus
              : "brands";

  const base = HUB_COLLECTIONS[slug];
  const hero = {
    ...base,
    // Always search onboarded kitchens + dishes by `q` (not only demo cuisine hints)
    cuisineHint: undefined,
    title: q ? q.replace(/\b\w/g, (c) => c.toUpperCase()) : base.title,
    subtitle: q ? `Kitchens & dishes matching “${q}”` : base.subtitle,
    heroClass: "bg-white",
    mode: "restaurants" as const,
  };

  return <HubCollectionView hero={hero} initialQuery={q} />;
}

export default function HubSearchPage() {
  return (
    <Suspense fallback={<p className="p-4 text-sm text-on-surface-variant">Searching…</p>}>
      <SearchInner />
    </Suspense>
  );
}
