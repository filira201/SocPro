import { Moon, Sun } from "lucide-react";

import { useTheme } from "@/shared/lib/theme-context";
import { Button } from "@/shared/ui/kit/button";

export function ThemeToggle() {
  const { setTheme, theme } = useTheme();

  const handleToggle = () => {
    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light";

      setTheme(systemTheme === "dark" ? "light" : "dark");

      return;
    }

    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      onClick={handleToggle}
      aria-label="Переключить тему"
      title="Переключить тему"
    >
      <Sun className="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
      <Moon className="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
      <span className="sr-only">Переключить тему</span>
    </Button>
  );
}
