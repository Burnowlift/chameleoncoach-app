import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";

export function CoachLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-14 flex items-center border-b px-4 bg-card">
            <SidebarTrigger className="mr-4" />
            <span className="text-sm font-medium text-muted-foreground">Painel do Treinador</span>
          </header>
          <main className="flex-1 p-3 sm:p-6 overflow-auto">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
