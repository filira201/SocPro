import { Link } from "react-router";

import { ROUTES } from "@/shared/model/routes";
import { ThemeToggle } from "@/shared/ui/theme-toggle";

export function AuthHeader() {
  return (
    <header className="flex shrink-0 items-center justify-between gap-3 border-b bg-background px-3 py-3 sm:px-4">
      <Link
        to={ROUTES.HOME}
        className="min-w-0 truncate font-heading text-base font-medium sm:text-lg"
      >
        СоцПро
      </Link>

      <ThemeToggle />
    </header>
  );
}
