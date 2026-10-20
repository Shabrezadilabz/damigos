import { notFound } from "next/navigation";
import { HubCollectionView } from "@/components/hub-collection-view";
import { HUB_COLLECTIONS, parseCollectionSlug } from "@/lib/hub-collections";

/** Ownly WA collection screens — bestsellers, brands, healthy, festival, promise, etc. */
export default async function HubCollectionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const key = parseCollectionSlug(slug);
  if (!key) notFound();
  return <HubCollectionView hero={HUB_COLLECTIONS[key]} />;
}
