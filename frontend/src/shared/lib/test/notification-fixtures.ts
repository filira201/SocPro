import type { Notification } from "@/features/notifications/model/types";

const ACTOR_ID = "507f1f77bcf86cd799439013";
const RECEIVER_ID = "507f1f77bcf86cd799439012";
const POST_ID = "6a04cae90445f0b3a1d3861c";
const COMMENT_ID = "6a0c96bf4dbfb0b7a7569ff0";
const PROJECT_ID = "6a0c96bf4dbfb0b7a7569ff1";

export function makeNotification(
  overrides: Partial<Notification> = {}
): Notification {
  return {
    id: "507f1f77bcf86cd799439011",
    type: "POST_LIKED",
    receiverId: RECEIVER_ID,
    actorId: ACTOR_ID,
    subjectUserId: null,
    postId: POST_ID,
    commentId: null,
    projectId: null,
    applicationId: null,
    projectTitleSnapshot: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    actor: {
      id: ACTOR_ID,
      email: "actor@example.com",
      firstName: "Пётр",
      lastName: "Петров",
      patronymic: null,
      avatarUrl: null,
      bio: null,
      dateOfBirth: null,
      createdAt: "2026-01-01T00:00:00.000Z",
    },
    ...overrides,
  };
}

export const notificationFixtureIds = {
  actorId: ACTOR_ID,
  receiverId: RECEIVER_ID,
  postId: POST_ID,
  commentId: COMMENT_ID,
  projectId: PROJECT_ID,
};
