import { createBrowserRouter, Outlet, redirect } from "react-router";

import { App } from "./App";
import { Providers } from "./providers";

import { ROUTES } from "@/shared/model/routes";

export const router = createBrowserRouter([
  {
    element: (
      <Providers>
        <App />
      </Providers>
    ),
    // Убираю предупреждение No `HydrateFallback` element provided to
    // render during initial hydration, т.к. нету SSR

    HydrateFallback: () => null,
    children: [
      {
        element: (
          <div className="h-screen flex flex-col overflow-hidden">
            <header>Header</header>
            <div className="flex-1 flex flex-col overflow-hidden">
              <Outlet />
            </div>
          </div>
        ),
        children: [
          {
            path: ROUTES.POSTS,
            lazy: () => import("@/features/posts/posts.page"),
          },
          {
            path: ROUTES.POST_DETAILS,
            lazy: () => import("@/features/post/post.page"),
          },
        ],
      },

      {
        path: ROUTES.LOGIN,
        lazy: () => import("@/features/auth/login.page"),
      },
      {
        path: ROUTES.REGISTER,
        lazy: () => import("@/features/auth/register.page"),
      },
      {
        path: ROUTES.HOME,
        loader: () => redirect(ROUTES.POSTS),
      },
    ],
  },
]);
