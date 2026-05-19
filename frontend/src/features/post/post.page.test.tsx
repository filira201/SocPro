import { screen } from "@testing-library/react";
import { href, Route, Routes } from "react-router";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { Component as PostPage } from "@/features/post/post.page";
import "@/features/posts/api/posts.api";
import { useGetPostByIdQuery } from "@/features/posts/api/posts.api";
import type { Post } from "@/features/posts/model/types";
import { renderWithProviders } from "@/shared/lib/test/render-with-providers";
import { ROUTES } from "@/shared/model/routes";

const POST_ID = "6a04cae90445f0b3a1d3861a";
const COMMENT_ID = "6a0c96bf4dbfb0b7a7569ff0";
const postRoute = href(ROUTES.POST_DETAILS, { postId: POST_ID });

const mockNavigate = vi.fn();

vi.mock("@/features/posts/api/posts.api", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/features/posts/api/posts.api")>();

  return {
    ...actual,
    useGetPostByIdQuery: vi.fn(),
  };
});

vi.mock("react-router", async (importOriginal) => {
  const mod = await importOriginal<typeof import("react-router")>();

  return {
    ...mod,
    useNavigate: () => mockNavigate,
  };
});

const mockedUseGetPostByIdQuery = vi.mocked(useGetPostByIdQuery);

function makePost(content: string): Post {
  return {
    id: POST_ID,
    content,
    authorId: "507f1f77bcf86cd799439011",
    author: {
      id: "507f1f77bcf86cd799439011",
      email: "author@example.com",
      firstName: "Иван",
      lastName: "Иванов",
      patronymic: null,
      avatarUrl: null,
      bio: null,
      dateOfBirth: null,
      createdAt: "2026-01-01T00:00:00.000Z",
    },
    attachments: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    likeCount: 0,
    commentCount: 0,
    likedByUser: false,
    isOwner: false,
    isEdited: false,
  };
}

function makeGetPostByIdQueryResult(
  data: Post | undefined,
  isLoading = false
): ReturnType<typeof useGetPostByIdQuery> {
  return {
    data,
    isLoading,
    isFetching: false,
    refetch: vi.fn(),
  } as ReturnType<typeof useGetPostByIdQuery>;
}

function renderPostPage(initialRoute = postRoute) {
  return renderWithProviders(
    <Routes>
      <Route path={ROUTES.POST_DETAILS} element={<PostPage />} />
    </Routes>,
    { initialRoute }
  );
}

describe("PostPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedUseGetPostByIdQuery.mockReturnValue(
      makeGetPostByIdQueryResult(makePost("Текст публикации"))
    );
  });

  test("показывает пост при успешной загрузке", () => {
    // Arrange
    mockedUseGetPostByIdQuery.mockReturnValue(
      makeGetPostByIdQueryResult(makePost("Текст публикации"))
    );

    // Act
    renderPostPage();

    // Assert
    expect(screen.getByRole("button", { name: "Назад" })).toBeInTheDocument();
    expect(screen.getByText("Текст публикации")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Открыть пост" })
    ).not.toBeInTheDocument();
  });

  test("показывает сообщение если пост не найден", () => {
    // Arrange
    mockedUseGetPostByIdQuery.mockReturnValue(
      makeGetPostByIdQueryResult(undefined)
    );

    // Act
    renderPostPage();

    // Assert
    expect(screen.getByText("Пост не найден")).toBeInTheDocument();
  });

  test("перенаправляет на страницу комментария при hash comment-id", async () => {
    // Arrange
    renderPostPage(`${postRoute}#comment-${COMMENT_ID}`);

    // Assert
    await vi.waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(
        href(ROUTES.POST_COMMENT, { postId: POST_ID, commentId: COMMENT_ID }),
        { replace: true }
      );
    });
  });
});
