import { vi } from "vitest";

export type MockMatchMediaOptions = {
  /** Результат для `(prefers-color-scheme: dark)`; для прочих запросов — `false` */
  matches?: boolean;
};

export function mockMatchMedia(options: MockMatchMediaOptions = {}) {
  const prefersDarkMatches = options.matches ?? false;

  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => {
      const matches = query.includes("(prefers-color-scheme: dark)")
        ? prefersDarkMatches
        : false;

      return {
        matches,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      };
    }),
  });
}
