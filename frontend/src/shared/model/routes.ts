import "react-router";

export const PUBLIC_ROUTES = {
  HOME: "/",
  LOGIN: "/login",
  REGISTER: "/register",
} as const;

export const APP_ROUTES = {
  POSTS: "/posts",
  POST_DETAILS: "/posts/:postId",
  USER_DETAILS: "/users/:userId",
  USER_PROFILE_EDIT: "/users/:userId/edit",
  FOLLOWERS: "/followers/:userId",
  FOLLOWING: "/following/:userId",
  NOTIFICATIONS: "/notifications",
  PROJECTS: "/projects",
  PROJECT_CREATE: "/projects/create",
  PROJECT_DETAILS: "/projects/:id",
} as const;

export const ROUTES = {
  ...PUBLIC_ROUTES,
  ...APP_ROUTES,
} as const;

type PathParams = {
  [ROUTES.POST_DETAILS]: {
    postId: string;
  };
  [ROUTES.USER_DETAILS]: {
    userId: string;
  };
  [ROUTES.USER_PROFILE_EDIT]: {
    userId: string;
  };
  [ROUTES.FOLLOWERS]: {
    userId: string;
  };
  [ROUTES.FOLLOWING]: {
    userId: string;
  };
  [ROUTES.PROJECT_DETAILS]: {
    id: string;
  };
};

declare module "react-router" {
  interface Register {
    parameters: PathParams;
  }
}
