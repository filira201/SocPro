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

  const userEditMatch = matchPath(
    { path: ROUTES.USER_PROFILE_EDIT, end: true },
    pathname
  );

  if (userEditMatch?.params.userId) {
    const uid = userEditMatch.params.userId;

    return [
      {
        label: "Профиль",
        to: ROUTES.USER_DETAILS.replace(":userId", uid),
      },
      { label: "Редактирование" },
    ];
  }

  const userMatch = matchPath(
    { path: ROUTES.USER_DETAILS, end: true },
    pathname
  );

  if (userMatch) {
    return [{ label: "Профиль" }];
  }

  const followersMatch = matchPath(
    { path: ROUTES.FOLLOWERS, end: true },
    pathname
  );

  if (followersMatch?.params.userId) {
    const uid = followersMatch.params.userId;

    return [
      {
        label: "Профиль",
        to: ROUTES.USER_DETAILS.replace(":userId", uid),
      },
      { label: "Подписчики" },
    ];
  }

  const followingMatch = matchPath(
    { path: ROUTES.FOLLOWING, end: true },
    pathname
  );

  if (followingMatch?.params.userId) {
    const uid = followingMatch.params.userId;

    return [
      {
        label: "Профиль",
        to: ROUTES.USER_DETAILS.replace(":userId", uid),
      },
      { label: "Подписки" },
    ];
  }

  if (pathname === ROUTES.NOTIFICATIONS) {
    return [{ label: "Уведомления" }];
  }

  return [{ label: "СоцПро", to: ROUTES.POSTS }];
}
