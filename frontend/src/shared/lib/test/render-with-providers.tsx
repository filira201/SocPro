import { configureStore } from "@reduxjs/toolkit";
import { render, type RenderOptions } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement, ReactNode } from "react";
import { Provider } from "react-redux";
import { MemoryRouter, type MemoryRouterProps } from "react-router";

import "@/features/auth/api/auth.api";
import { userReducer } from "@/features/auth/model/user.slice";
import { api } from "@/shared/api/api";
import { ROUTES } from "@/shared/model/routes";

function createTestStore() {
  return configureStore({
    reducer: {
      [api.reducerPath]: api.reducer,
      user: userReducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(api.middleware),
  });
}

type RenderWithProvidersOptions = Omit<RenderOptions, "wrapper"> & {
  initialRoute?: string;
  initialEntries?: MemoryRouterProps["initialEntries"];
};

export function renderWithProviders(
  ui: ReactElement,
  {
    initialRoute = ROUTES.REGISTER,
    initialEntries,
    ...renderOptions
  }: RenderWithProvidersOptions = {}
) {
  const store = createTestStore();
  const routerEntries = initialEntries ?? [initialRoute];

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <Provider store={store}>
        <MemoryRouter initialEntries={routerEntries}>{children}</MemoryRouter>
      </Provider>
    );
  }

  return {
    store,
    user: userEvent.setup(),
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
  };
}
