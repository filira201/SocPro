import { Link } from "react-router";

import { ROUTES } from "@/shared/model/routes";
import { ThemeToggle } from "@/shared/ui/theme-toggle";

export function AuthHeader() {
  return (
    <header className="flex items-center justify-between border-b bg-background px-4 py-3">
      <Link to={ROUTES.HOME} className="font-heading text-lg font-medium">
        СоцПро
      </Link>

      <ThemeToggle />
    </header>
  );
}
