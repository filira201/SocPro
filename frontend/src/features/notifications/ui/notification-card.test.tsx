import { screen } from "@testing-library/react";
import { href } from "react-router";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { NotificationCard } from "./notification-card";

import {
  makeNotification,
  notificationFixtureIds,
} from "@/shared/lib/test/notification-fixtures";
import { renderWithProviders } from "@/shared/lib/test/render-with-providers";
import { ROUTES } from "@/shared/model/routes";

const mockNavigate = vi.fn();
const mockOnMarkRead = vi.fn();

vi.mock("react-router", async (importOriginal) => {
  const mod = await importOriginal<typeof import("react-router")>();

  return {
    ...mod,
    useNavigate: () => mockNavigate,
  };
});

function renderCard(
  overrides: Parameters<typeof makeNotification>[0] = {},
  options?: { isMarking?: boolean }
) {
  const notification = makeNotification(overrides);

  return renderWithProviders(
    <NotificationCard
      notification={notification}
      onMarkRead={mockOnMarkRead}
      isMarking={options?.isMarking}
    />
  );
}

describe("NotificationCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("показывает кнопку «прочитать» и вызывает onMarkRead без навигации", async () => {
    // Arrange
    const notification = makeNotification();
    const { user } = renderWithProviders(
      <NotificationCard
        notification={notification}
        onMarkRead={mockOnMarkRead}
      />
    );

    // Act
    await user.click(
      screen.getByRole("button", { name: "Отметить как прочитанное" })
    );

    // Assert
    expect(mockOnMarkRead).toHaveBeenCalledWith(notification.id);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  test("переходит на пост при клике по карточке с postId", async () => {
    // Arrange
    const { user } = renderCard({
      type: "POST_LIKED",
      postId: notificationFixtureIds.postId,
      commentId: null,
    });

    // Act
    await user.click(
      screen.getByRole("article", { name: "Открыть связанную страницу" })
    );

    // Assert
    expect(mockNavigate).toHaveBeenCalledWith(
      href(ROUTES.POST_DETAILS, { postId: notificationFixtureIds.postId })
    );
  });

  test("переходит на фокус комментария при postId и commentId", async () => {
    // Arrange
    const { user } = renderCard({
      type: "COMMENT_REPLIED",
      postId: notificationFixtureIds.postId,
      commentId: notificationFixtureIds.commentId,
    });

    // Act
    await user.click(
      screen.getByRole("article", { name: "Открыть связанную страницу" })
    );

    // Assert
    expect(mockNavigate).toHaveBeenCalledWith(
      href(ROUTES.POST_COMMENT, {
        postId: notificationFixtureIds.postId,
        commentId: notificationFixtureIds.commentId,
      })
    );
  });

  test("переходит на проект при projectId", async () => {
    // Arrange
    const { user } = renderCard({
      type: "PROJECT_INVITE_RECEIVED",
      postId: null,
      projectId: notificationFixtureIds.projectId,
    });

    // Act
    await user.click(
      screen.getByRole("article", { name: "Открыть связанную страницу" })
    );

    // Assert
    expect(mockNavigate).toHaveBeenCalledWith(
      href(ROUTES.PROJECT_DETAILS, { id: notificationFixtureIds.projectId })
    );
  });

  test("переходит на список проектов при PROJECT_DELETED без projectId", async () => {
    // Arrange
    const { user } = renderCard({
      type: "PROJECT_DELETED",
      postId: null,
      projectId: null,
      projectTitleSnapshot: "Мой проект",
    });

    // Act
    await user.click(
      screen.getByRole("article", { name: "Открыть связанную страницу" })
    );

    // Assert
    expect(mockNavigate).toHaveBeenCalledWith(ROUTES.PROJECTS);
  });

  test("не навигирует при USER_FOLLOWED без postId и projectId", async () => {
    // Arrange
    const { user } = renderCard({
      type: "USER_FOLLOWED",
      postId: null,
      projectId: null,
    });

    // Act
    await user.click(screen.getByText("Новая подписка"));

    // Assert
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(
      screen.queryByRole("article", { name: "Открыть связанную страницу" })
    ).not.toBeInTheDocument();
  });
});
