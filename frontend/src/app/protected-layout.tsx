import { LogOut } from "lucide-react";
import { Link, useNavigate } from "react-router";

import { ProtectedRoute } from "./protected-route";

import { logout, selectCurrentUser, useCurrentQuery } from "@/features/auth";
import { useAppDispatch, useAppSelector } from "@/shared/lib/redux";
import { ROUTES } from "@/shared/model/routes";
import { Button } from "@/shared/ui/kit/button";

export function ProtectedLayout() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const currentUser = useAppSelector(selectCurrentUser);

  useCurrentQuery();

  const handleLogout = () => {
    dispatch(logout());
    navigate(ROUTES.LOGIN, { replace: true });
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <Link to={ROUTES.POSTS} className="font-heading text-lg font-medium">
          СоцПро
        </Link>

        <div className="flex items-center gap-3">
          {currentUser ? (
            <span className="text-sm text-muted-foreground">
              @{currentUser.username}
            </span>
          ) : null}

          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut />
            Выйти
          </Button>
        </div>
      </header>

      <div className="flex-1 flex flex-col overflow-hidden">
        <ProtectedRoute />
      </div>
    </div>
  );
}
