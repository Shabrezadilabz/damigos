import { SettingsPageClient } from "@/components/settings/settings-page-client";

/** C-S5 Settings — Stitch crm_6_settings_stickers_platform_admin */
export default async function CrmSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const sp = await searchParams;
  return <SettingsPageClient tabParam={sp.tab} />;
}
