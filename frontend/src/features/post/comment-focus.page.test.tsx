import { screen } from "@testing-library/react";
import { Route, Routes } from "react-router";
import { describe, expect, test, vi } from "vitest";

import { Component as CommentFocusPage } from "./comment-focus.page";

import "@/features/comments/api/comments.api";
import { renderWithProviders } from "@/shared/lib/test/render-with-providers";
import { ROUTES } from "@/shared/model/routes";

const mockUseGetCommentFocusQuery = vi.fn();

const focusRoute =
  "/posts/6a04cae90445f0b3a1d3861c/comment/6a0c96bf4dbfb0b7a7569ff0";

vi.mock("@/features/comments", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/comments")>();

  return {
    ...actual,
    useGetCommentFocusQuery: (...args: unknown[]) =>
      mockUseGetCommentFocusQuery(...args),
  };
});

function renderFocusPage() {
  return renderWithProviders(
    <Routes>
      <Route path={ROUTES.POST_COMMENT} element={<CommentFocusPage />} />
    </Routes>,
    { initialRoute: focusRoute }
  );
}

describe("CommentFocusPage", () => {
  test("показывает сообщение об удалённой публикации", () => {
    mockUseGetCommentFocusQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: false,
      isError: true,
      error: { status: 404, data: { error: "Пост не найден" } },
    });

    renderFocusPage();

    expect(screen.getByText("Публикация уже удалена")).toBeInTheDocument();
  });

  test("показывает сообщение об удалённом комментарии и кнопку «К посту»", () => {
    mockUseGetCommentFocusQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: false,
      isError: true,
      error: { status: 404, data: { error: "Комментарий не найден" } },
    });

    renderFocusPage();

    expect(
      screen.getByText("Комментарий или ответ уже удалён")
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "К посту" })).toBeInTheDocument();
  });

  test("показывает комментарий при успешной загрузке", () => {
    mockUseGetCommentFocusQuery.mockReturnValue({
      data: {
        postId: "6a04cae90445f0b3a1d3861c",
        ancestorIds: [],
        ancestors: [],
        comment: {
          id: "6a0c96bf4dbfb0b7a7569ff0",
          content: "Тестовый комментарий",
          userId: "507f1f77bcf86cd799439011",
          user: {
            id: "507f1f77bcf86cd799439011",
            firstName: "Иван",
            lastName: "Иванов",
            email: "a@b.c",
            avatarUrl: null,
          },
          postId: "6a04cae90445f0b3a1d3861c",
          parentId: null,
          replyToUserId: null,
          replyToDisplayName: null,
          attachments: [],
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
          likeCount: 0,
          replyCount: 0,
          likedByUser: false,
          isReply: false,
          isOwner: false,
          isEdited: false,
        },
      },
      isLoading: false,
      isFetching: false,
      isError: false,
      error: undefined,
    });

    renderFocusPage();

    expect(screen.getByText("Комментарий")).toBeInTheDocument();
    expect(screen.getByText("Тестовый комментарий")).toBeInTheDocument();
  });
});
