import { HubKitchenList } from "@/components/hub-kitchen-list";
import { HubOpenCartDock } from "@/components/hub-open-cart-dock";
import { HubPageShell } from "@/components/hub-page-shell";

/** G-S6 — pilot hub (Stitch g17 + Ownly WA) */
export default function HubPage() {
  return (
    <HubPageShell>
      <HubKitchenList embedded />
      <HubOpenCartDock />
    </HubPageShell>
  );
}
