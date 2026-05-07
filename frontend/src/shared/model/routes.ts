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
};

declare module "react-router" {
  interface Register {
    parameters: PathParams;
  }
}
