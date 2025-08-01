import { Dashboard, DashboardSidebar } from "@/components/dashboard";
import { SidebarProvider, Sidebar, SidebarInset } from "@/components/ui/sidebar";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <SidebarProvider>
        <Sidebar>
          <DashboardSidebar />
        </Sidebar>
        <SidebarInset>
            <Dashboard />
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
