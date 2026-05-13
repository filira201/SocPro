import { Provider } from "react-redux";

import { store } from "./store";

import { ThemeProvider } from "@/shared/lib/theme";
import { Toaster } from "@/shared/ui/kit/sonner";
import { TooltipProvider } from "@/shared/ui/kit/tooltip";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider defaultTheme="system" storageKey="socpro-theme">
      <TooltipProvider delayDuration={0}>
        <Provider store={store}>
          {children}
          <Toaster position="top-right" closeButton />
        </Provider>
      </TooltipProvider>
    </ThemeProvider>
  );
}
