import { configureStore } from "@reduxjs/toolkit";
import { render, type RenderOptions } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement, ReactNode } from "react";
import { Provider } from "react-redux";
import { MemoryRouter, type MemoryRouterProps } from "react-router";

import "@/features/auth/api/auth.api";
import type { User } from "@/features/auth/lib/types";
import { setCredentials, userReducer } from "@/features/auth/model/user.slice";
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
  /** Авторизованный пользователь в store до первого рендера */
  authenticatedUser?: User;
};

export function renderWithProviders(
  ui: ReactElement,
  {
    initialRoute = ROUTES.REGISTER,
    initialEntries,
    authenticatedUser,
    ...renderOptions
  }: RenderWithProvidersOptions = {}
) {
  const store = createTestStore();

  if (authenticatedUser) {
    store.dispatch(
      setCredentials({
        token: "test-token",
        user: authenticatedUser,
      })
    );
  }

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
