import { href } from "react-router";

import type { Notification } from "../model/types";

import { ROUTES } from "@/shared/model/routes";

/** Куда вести пользователя по тапу на карточку (или `null`, если только «прочитать»). */
export function notificationTargetHref(n: Notification): string | null {
  if (n.postId) {
    if (n.commentId) {
      return href(ROUTES.POST_COMMENT, {
        postId: n.postId,
        commentId: n.commentId,
      });
    }

    return href(ROUTES.POST_DETAILS, { postId: n.postId });
  }

  if (n.projectId) {
    return href(ROUTES.PROJECT_DETAILS, { id: n.projectId });
  }

  if (n.type === "PROJECT_DELETED") {
    return ROUTES.PROJECTS;
  }

  return null;
}
