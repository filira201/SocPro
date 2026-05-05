import { Navigate, Outlet } from "react-router";

import { selectIsAuthenticated } from "@/features/auth/model/selectors";
import { useAppSelector } from "@/shared/lib/redux";
import { ROUTES } from "@/shared/model/routes";

export function ProtectedRoute() {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  return <Outlet />;
}
