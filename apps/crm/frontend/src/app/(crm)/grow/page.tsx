import { GrowPageClient } from "./grow-page-client";

/** C-S3 Grow — P1-T10 */
export default async function CrmGrowPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; customerId?: string }>;
}) {
  const sp = await searchParams;
  return <GrowPageClient tabParam={sp.tab} customerId={sp.customerId} />;
}
