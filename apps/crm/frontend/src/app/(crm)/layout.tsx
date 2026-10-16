import { CrmAuthGate } from "@/components/crm-auth-gate";
import { CrmSidebar } from "@/components/crm-sidebar";
import { CrmTopHeader } from "@/components/crm-top-header";

export default function CrmShellLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-background">
      <CrmSidebar />
      <div className="pl-64">
        <CrmTopHeader />
        <main className="min-h-screen px-8 pb-8 pt-20">
          <CrmAuthGate>{children}</CrmAuthGate>
        </main>
      </div>
    </div>
  );
}
