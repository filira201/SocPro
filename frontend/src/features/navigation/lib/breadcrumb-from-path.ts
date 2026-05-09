import { matchPath } from "react-router";

import { ROUTES } from "@/shared/model/routes";

export type BreadcrumbSegment = {
  label: string;
  to?: string;
};

export function breadcrumbSegmentsFromPath(
  pathname: string
): BreadcrumbSegment[] {
  if (pathname === ROUTES.POSTS) {
    return [{ label: "Посты" }];
  }

  const postMatch = matchPath(
    { path: ROUTES.POST_DETAILS, end: true },
    pathname
  );

  if (postMatch) {
    return [{ label: "Посты", to: ROUTES.POSTS }, { label: "Публикация" }];
  }

  const userMatch = matchPath(
    { path: ROUTES.USER_DETAILS, end: true },
    pathname
  );

  if (userMatch) {
    return [{ label: "Профиль" }];
  }

  if (pathname === ROUTES.FOLLOWERS) {
    return [{ label: "Подписчики" }];
  }

  if (pathname === ROUTES.FOLLOWING) {
    return [{ label: "Подписки" }];
  }

  if (pathname === ROUTES.NOTIFICATIONS) {
    return [{ label: "Уведомления" }];
  }

  return [{ label: "СоцПро", to: ROUTES.POSTS }];
}
