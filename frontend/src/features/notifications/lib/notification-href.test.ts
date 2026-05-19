import { describe, expect, test } from "vitest";

import type { Notification } from "../model/types";

import { notificationTargetHref } from "./notification-href";

function baseNotification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: "507f1f77bcf86cd799439011",
    type: "POST_LIKED",
    receiverId: "507f1f77bcf86cd799439012",
    actorId: "507f1f77bcf86cd799439013",
    subjectUserId: null,
    postId: "6a04cae90445f0b3a1d3861c",
    commentId: null,
    projectId: null,
    applicationId: null,
    projectTitleSnapshot: null,
    readAt: null,
    deleteAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    isRead: false,
    ...overrides,
  };
}

describe("notificationTargetHref", () => {
  test("ведёт на страницу фокуса комментария при postId и commentId", () => {
    const href = notificationTargetHref(
      baseNotification({
        type: "COMMENT_REPLIED",
        commentId: "6a0c96bf4dbfb0b7a7569ff0",
      })
    );

    expect(href).toBe(
      "/posts/6a04cae90445f0b3a1d3861c/comment/6a0c96bf4dbfb0b7a7569ff0"
    );
  });

  test("ведёт на пост без commentId", () => {
    const href = notificationTargetHref(
      baseNotification({ type: "POST_LIKED", commentId: null })
    );

    expect(href).toBe("/posts/6a04cae90445f0b3a1d3861c");
  });

  test("POST_COMMENTED и COMMENT_LIKED используют страницу фокуса", () => {
    const commented = notificationTargetHref(
      baseNotification({
        type: "POST_COMMENTED",
        commentId: "6a0c96bf4dbfb0b7a7569ff0",
      })
    );
    const liked = notificationTargetHref(
      baseNotification({
        type: "COMMENT_LIKED",
        commentId: "6a0c96bf4dbfb0b7a7569ff0",
      })
    );

    expect(commented).toBe(
      "/posts/6a04cae90445f0b3a1d3861c/comment/6a0c96bf4dbfb0b7a7569ff0"
    );
    expect(liked).toBe(commented);
  });
});
