import { href } from "react-router";

import type { Notification } from "../model/types";

import { ROUTES } from "@/shared/model/routes";

/** Куда вести пользователя по тапу на карточку (или `null`, если только «прочитать»). */
export function notificationTargetHref(n: Notification): string | null {
  if (n.postId) {
    const base = href(ROUTES.POST_DETAILS, { postId: n.postId });

    if (n.commentId) {
      return `${base}#comment-${n.commentId}`;
    }

    return base;
  }

  if (n.projectId) {
    return href(ROUTES.PROJECT_DETAILS, { id: n.projectId });
  }

  if (n.type === "PROJECT_DELETED") {
    return ROUTES.PROJECTS;
  }

  return null;
}
