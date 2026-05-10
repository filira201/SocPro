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
            path: ROUTES.PROJECTS,
            lazy: () => import("@/features/projects/projects.page"),
          },
          {
            path: ROUTES.PROJECT_CREATE,
            lazy: () => import("@/features/projects/project-create.page"),
          },
          {
            path: ROUTES.PROJECT_DETAILS,
            lazy: () => import("@/features/projects/project-detail.page"),
          },
          {
            path: ROUTES.POST_DETAILS,
            lazy: () => import("@/features/post/post.page"),
          },
          {
            path: ROUTES.USER_PROFILE_EDIT,
            lazy: () => import("@/features/user/user-profile-edit.page"),
          },
          {
            path: ROUTES.USER_DETAILS,
            lazy: () => import("@/features/user/user.page"),
          },
          {
            path: ROUTES.FOLLOWERS,
            lazy: () => import("@/features/followers/followers.page"),
          },
          {
            path: ROUTES.FOLLOWING,
            lazy: () => import("@/features/following/following.page"),
          },
          {
            path: ROUTES.NOTIFICATIONS,
            lazy: () => import("@/features/notifications/notifications.page"),
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
