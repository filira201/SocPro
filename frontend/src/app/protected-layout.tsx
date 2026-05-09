import { ProtectedRoute } from "./protected-route";

import { AppContentHeader } from "@/features/navigation/app-content-header";
import { AppSidebar } from "@/features/navigation/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/shared/ui/kit/sidebar";

export function ProtectedLayout() {
  return (
    <div className="flex h-dvh min-h-0 w-full flex-col overflow-hidden">
      <SidebarProvider className="min-h-0 flex-1 overflow-hidden">
        <AppSidebar />
        <SidebarInset className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
            <AppContentHeader />
            <div className="flex min-h-0 flex-1 flex-col">
              <ProtectedRoute />
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
