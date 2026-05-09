import { ProtectedRoute } from "./protected-route";

import { AppContentHeader } from "@/features/navigation/app-content-header";
import { AppSidebar } from "@/features/navigation/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/shared/ui/kit/sidebar";

export function ProtectedLayout() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <AppContentHeader />
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <ProtectedRoute />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
