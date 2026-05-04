import "react-router";

export const PUBLIC_ROUTES = {
  HOME: "/",
  LOGIN: "/login",
  REGISTER: "/register",
} as const;

export const APP_ROUTES = {
  POSTS: "/posts",
  POST_DETAILS: "/posts/:postId",
} as const;

export const ROUTES = {
  ...PUBLIC_ROUTES,
  ...APP_ROUTES,
} as const;

type PathParams = {
  [ROUTES.POST_DETAILS]: {
    postId: string;
  };
};

declare module "react-router" {
  interface Register {
    parameters: PathParams;
  }
}
