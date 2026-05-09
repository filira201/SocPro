import { matchPath } from "react-router";

import { ROUTES } from "@/shared/model/routes";

export type BreadcrumbSegment = {
  label: string;
  to?: string;
};

/** Контекст для подписи сегмента профиля («Ваш профиль» / имя / fallback «Профиль»). */
export type BreadcrumbContext = {
  profileCrumbLabel?: string;
};

/** userId из маршрутов профиля / списков подписок (если pathname им соответствует). */
export function extractProfileUserIdFromPathname(
  pathname: string
): string | undefined {
  const userEditMatch = matchPath(
    { path: ROUTES.USER_PROFILE_EDIT, end: true },
    pathname
  );

  if (userEditMatch?.params.userId) {
    return userEditMatch.params.userId;
  }

  const userMatch = matchPath(
    { path: ROUTES.USER_DETAILS, end: true },
    pathname
  );

  if (userMatch?.params.userId) {
    return userMatch.params.userId;
  }

  const followersMatch = matchPath(
    { path: ROUTES.FOLLOWERS, end: true },
    pathname
  );

  if (followersMatch?.params.userId) {
    return followersMatch.params.userId;
  }

  const followingMatch = matchPath(
    { path: ROUTES.FOLLOWING, end: true },
    pathname
  );

  if (followingMatch?.params.userId) {
    return followingMatch.params.userId;
  }

  return undefined;
}

export function breadcrumbSegmentsFromPath(
  pathname: string,
  context?: BreadcrumbContext
): BreadcrumbSegment[] {
  const profileLabel = context?.profileCrumbLabel ?? "Профиль";

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
        label: profileLabel,
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
    return [{ label: profileLabel }];
  }

  const followersMatch = matchPath(
    { path: ROUTES.FOLLOWERS, end: true },
    pathname
  );

  if (followersMatch?.params.userId) {
    const uid = followersMatch.params.userId;

    return [
      {
        label: profileLabel,
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
        label: profileLabel,
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
