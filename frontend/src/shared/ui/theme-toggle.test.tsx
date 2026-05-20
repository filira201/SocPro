import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { mockMatchMedia } from "@/shared/lib/test/mock-match-media";
import { renderWithProviders } from "@/shared/lib/test/render-with-providers";
import { ThemeProvider } from "@/shared/lib/theme";
import type { Theme } from "@/shared/lib/theme-context";
import { ThemeToggle } from "@/shared/ui/theme-toggle";

const STORAGE_KEY = "socpro-theme";

function renderThemeToggle(options?: {
  storedTheme?: Theme;
  systemPrefersDark?: boolean;
}) {
  localStorage.clear();

  if (options?.storedTheme !== undefined) {
    localStorage.setItem(STORAGE_KEY, options.storedTheme);
  }

  mockMatchMedia({ matches: options?.systemPrefersDark ?? false });

  return renderWithProviders(
    <ThemeProvider storageKey={STORAGE_KEY} defaultTheme="light">
      <ThemeToggle />
    </ThemeProvider>
  );
}

describe("ThemeToggle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    document.documentElement.classList.remove("light", "dark");
  });

  test("переключает с светлой темы на тёмную", async () => {
    // Arrange
    const { user } = renderThemeToggle({ storedTheme: "light" });

    // Act
    await user.click(screen.getByRole("button", { name: /переключить тему/i }));

    // Assert
    await vi.waitFor(() => {
      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });
    expect(localStorage.getItem(STORAGE_KEY)).toBe("dark");
  });

  test("переключает с тёмной темы на светлую", async () => {
    // Arrange
    const { user } = renderThemeToggle({ storedTheme: "dark" });

    // Act
    await user.click(screen.getByRole("button", { name: /переключить тему/i }));

    // Assert
    await vi.waitFor(() => {
      expect(document.documentElement.classList.contains("light")).toBe(true);
    });
    expect(localStorage.getItem(STORAGE_KEY)).toBe("light");
  });

  test("при двойном клике возвращает светлую тему", async () => {
    // Arrange
    const { user } = renderThemeToggle({ storedTheme: "light" });
    const button = screen.getByRole("button", { name: /переключить тему/i });

    // Act
    await user.click(button);
    await vi.waitFor(() => {
      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });
    await user.click(button);

    // Assert
    await vi.waitFor(() => {
      expect(document.documentElement.classList.contains("light")).toBe(true);
    });
    expect(localStorage.getItem(STORAGE_KEY)).toBe("light");
  });

  test("при системной теме и светлой ОС переключает на тёмную", async () => {
    // Arrange
    const { user } = renderThemeToggle({
      storedTheme: "system",
      systemPrefersDark: false,
    });

    // Act
    await user.click(screen.getByRole("button", { name: /переключить тему/i }));

    // Assert
    await vi.waitFor(() => {
      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });
    expect(localStorage.getItem(STORAGE_KEY)).toBe("dark");
  });

  test("при системной теме и тёмной ОС переключает на светлую", async () => {
    // Arrange
    const { user } = renderThemeToggle({
      storedTheme: "system",
      systemPrefersDark: true,
    });

    // Act
    await user.click(screen.getByRole("button", { name: /переключить тему/i }));

    // Assert
    await vi.waitFor(() => {
      expect(document.documentElement.classList.contains("light")).toBe(true);
    });
    expect(localStorage.getItem(STORAGE_KEY)).toBe("light");
  });
});
