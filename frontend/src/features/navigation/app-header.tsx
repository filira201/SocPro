import { LogOut } from "lucide-react";
import { Link, useNavigate } from "react-router";

import { logout, selectCurrentUser, useCurrentQuery } from "@/features/auth";
import { useAppDispatch, useAppSelector } from "@/shared/lib/redux";
import { ROUTES } from "@/shared/model/routes";
import { Button } from "@/shared/ui/kit/button";
import { ThemeToggle } from "@/shared/ui/theme-toggle";

export function AppHeader() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const currentUser = useAppSelector(selectCurrentUser);

  useCurrentQuery();

  const handleLogout = () => {
    dispatch(logout());
    navigate(ROUTES.LOGIN, { replace: true });
  };

  return (
    <header className="flex items-center justify-between border-b bg-background px-4 py-3">
      <Link to={ROUTES.POSTS} className="font-heading text-lg font-medium">
        СоцПро
      </Link>

      <div className="flex items-center gap-3">
        {currentUser ? (
          <span className="text-sm text-muted-foreground">
            @{currentUser.username}
          </span>
        ) : null}

        <ThemeToggle />

        <Button variant="ghost" size="sm" onClick={handleLogout}>
          <LogOut />
          Выйти
        </Button>
      </div>
    </header>
  );
}
