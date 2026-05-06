import { ProtectedRoute } from "./protected-route";

import { AppHeader } from "@/features/navigation";

export function ProtectedLayout() {
  return (
    <div className="min-h-dvh flex flex-col">
      <AppHeader />

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <ProtectedRoute />
      </div>
    </div>
  );
}
