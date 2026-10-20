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
    lower.includes("shawarma")
      ? "shawarma"
      : lower.includes("biryani")
        ? "biryani"
        : lower.includes("healthy")
          ? "healthy"
          : "brands";

  const base = HUB_COLLECTIONS[slug];
  const hero = {
    ...base,
    title: q || base.title,
    subtitle: q ? `Results for “${q}”` : base.subtitle,
    heroClass: "bg-white",
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
