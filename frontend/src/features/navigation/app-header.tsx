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
    <header className="flex shrink-0 items-center justify-between gap-3 border-b bg-background px-3 py-3 sm:px-4">
      <Link
        to={ROUTES.POSTS}
        className="min-w-0 truncate font-heading text-base font-medium sm:text-lg"
      >
        СоцПро
      </Link>

      <div className="flex min-w-0 shrink-0 items-center gap-2 sm:gap-3">
        {currentUser ? (
          <span className="max-w-24 truncate text-sm text-muted-foreground sm:max-w-48">
            @{currentUser.username}
          </span>
        ) : null}

        <ThemeToggle />

        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          aria-label="Выйти"
        >
          <LogOut />
          <span className="hidden sm:inline">Выйти</span>
        </Button>
      </div>
    </header>
  );
}
