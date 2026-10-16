import { HubKitchenList } from "@/components/hub-kitchen-list";
import { HubPageShell } from "@/components/hub-page-shell";

/** G-S6 — pilot hub (Stitch g17) */
export default function HubPage() {
  return (
    <HubPageShell>
      <HubKitchenList embedded />
    </HubPageShell>
  );
}
