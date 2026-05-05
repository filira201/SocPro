import { ProtectedRoute } from "./protected-route";

import { AppHeader } from "@/features/navigation";

export function ProtectedLayout() {
  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <AppHeader />

      <div className="flex-1 flex flex-col overflow-hidden">
        <ProtectedRoute />
      </div>
    </div>
  );
}
