import { Provider } from "react-redux";

import { store } from "./store";

import { ThemeProvider } from "@/shared/lib/theme";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider defaultTheme="system" storageKey="socpro-theme">
      <Provider store={store}>{children}</Provider>
    </ThemeProvider>
  );
}
