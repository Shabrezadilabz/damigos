import { MenuPageClient } from "./menu-page-client";

/** C-S2 / P0-T21 — restaurant from JWT (P0-T04) */
export default function CrmMenuPage() {
  return (
    <div className="space-y-4">
      <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold">Menu</h1>
      <MenuPageClient />
    </div>
  );
}
