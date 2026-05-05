import { createBrowserRouter, redirect } from "react-router";

import { App } from "./App";
import { ProtectedLayout } from "./protected-layout";
import { protectedLoader } from "./protected-loader";
import { Providers } from "./providers";

import { ROUTES } from "@/shared/model/routes";

export const router = createBrowserRouter([
  {
    element: (
      <Providers>
        <App />
      </Providers>
    ),
    HydrateFallback: () => null,
    children: [
      {
        loader: protectedLoader,
        element: <ProtectedLayout />,
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
