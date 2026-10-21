import { CrmAuthGate } from "@/components/crm-auth-gate";
import { CrmShellProvider } from "@/components/crm-shell";
import { CrmSidebar } from "@/components/crm-sidebar";
import { CrmThemeProvider } from "@/components/crm-theme-provider";
import { CrmTopHeader } from "@/components/crm-top-header";

export default function CrmShellLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh overflow-x-clip bg-background">
      <CrmThemeProvider>
        <CrmShellProvider>
          <CrmSidebar />
          <div className="min-w-0 lg:pl-64">
            <CrmTopHeader />
            <main className="min-h-screen min-w-0 px-3 pb-8 pt-[4.5rem] sm:px-5 sm:pt-20 md:px-6 lg:px-8">
              <CrmAuthGate>{children}</CrmAuthGate>
            </main>
          </div>
        </CrmShellProvider>
      </CrmThemeProvider>
    </div>
  );
}
