import { describe, expect, test } from "vitest";

import { NOTIFICATION_TYPES } from "../model/types";

import {
  getNotificationDescriptionParts,
  notificationDescription,
  notificationTitle,
} from "./notification-text";

import { makeNotification } from "@/shared/lib/test/notification-fixtures";

describe("notification-text", () => {
  test.each(NOTIFICATION_TYPES)(
    "возвращает непустой заголовок и описание для типа %s",
    (type) => {
      // Arrange
      const notification = makeNotification({
        type,
        postId:
          type.startsWith("POST_") || type.includes("COMMENT")
            ? "6a04cae90445f0b3a1d3861c"
            : null,
        commentId:
          type === "COMMENT_REPLIED" ||
          type === "POST_COMMENTED" ||
          type === "COMMENT_LIKED"
            ? "6a0c96bf4dbfb0b7a7569ff0"
            : null,
        projectId:
          type.startsWith("PROJECT_") || type.startsWith("STAFF_")
            ? "6a0c96bf4dbfb0b7a7569ff1"
            : null,
        projectTitleSnapshot:
          type === "PROJECT_DELETED" ? "Тестовый проект" : null,
        subjectUser:
          type === "STAFF_INVITE_SENT"
            ? {
                id: "507f1f77bcf86cd799439014",
                email: "s@example.com",
                firstName: "Анна",
                lastName: "Сидорова",
                patronymic: null,
                avatarUrl: null,
                bio: null,
                dateOfBirth: null,
                createdAt: "2026-01-01T00:00:00.000Z",
              }
            : null,
      });

      // Act
      const title = notificationTitle(notification);
      const description = notificationDescription(notification);
      const parts = getNotificationDescriptionParts(notification);

      // Assert
      expect(title.length).toBeGreaterThan(0);
      expect(description.length).toBeGreaterThan(0);
      expect(parts.kind).toBeTruthy();
    }
  );
});
