import { screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import {
  useDeletePostMutation,
  useLikePostMutation,
  useUnlikePostMutation,
  useUpdatePostMutation,
} from "../api/posts.api";
import type { Post } from "../model/types";

import { PostCard } from "./post-card";

import {
  useCreateCommentMutation,
  useGetCommentsQuery,
  useLazyGetCommentsQuery,
} from "@/features/comments/api/comments.api";
import "@/features/comments/api/comments.api";
import "@/features/posts/api/posts.api";
import { renderWithProviders } from "@/shared/lib/test/render-with-providers";

const POST_ID = "6a04cae90445f0b3a1d3861a";

const mockUpdatePost = vi.fn();
const mockDeletePost = vi.fn();
const mockLikePost = vi.fn();
const mockUnlikePost = vi.fn();

vi.mock("../api/posts.api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../api/posts.api")>();

  return {
    ...actual,
    useUpdatePostMutation: vi.fn(),
    useDeletePostMutation: vi.fn(),
    useLikePostMutation: vi.fn(),
    useUnlikePostMutation: vi.fn(),
  };
});

vi.mock("@/features/comments/api/comments.api", async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import("@/features/comments/api/comments.api")
    >();

  return {
    ...actual,
    useGetCommentsQuery: vi.fn(),
    useLazyGetCommentsQuery: vi.fn(),
    useCreateCommentMutation: vi.fn(),
  };
});

const mockedUseUpdatePostMutation = vi.mocked(useUpdatePostMutation);
const mockedUseDeletePostMutation = vi.mocked(useDeletePostMutation);
const mockedUseLikePostMutation = vi.mocked(useLikePostMutation);
const mockedUseUnlikePostMutation = vi.mocked(useUnlikePostMutation);
const mockedUseGetCommentsQuery = vi.mocked(useGetCommentsQuery);
const mockedUseLazyGetCommentsQuery = vi.mocked(useLazyGetCommentsQuery);
const mockedUseCreateCommentMutation = vi.mocked(useCreateCommentMutation);

function makePost(content: string, isOwner: boolean): Post {
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
    isOwner,
    isEdited: false,
  };
}

function mockMutationsIdle() {
  mockedUseUpdatePostMutation.mockReturnValue([
    mockUpdatePost,
    { isLoading: false, reset: vi.fn() },
  ] as ReturnType<typeof useUpdatePostMutation>);
  mockedUseDeletePostMutation.mockReturnValue([
    mockDeletePost,
    { isLoading: false, reset: vi.fn() },
  ] as ReturnType<typeof useDeletePostMutation>);
  mockedUseLikePostMutation.mockReturnValue([
    mockLikePost,
    { isLoading: false, reset: vi.fn() },
  ] as ReturnType<typeof useLikePostMutation>);
  mockedUseUnlikePostMutation.mockReturnValue([
    mockUnlikePost,
    { isLoading: false, reset: vi.fn() },
  ] as ReturnType<typeof useUnlikePostMutation>);
}

function mockCommentsApiEmpty() {
  mockedUseGetCommentsQuery.mockReturnValue({
    data: { items: [], nextCursor: null },
    isLoading: false,
    isFetching: false,
    refetch: vi.fn(),
  } as ReturnType<typeof useGetCommentsQuery>);
  mockedUseLazyGetCommentsQuery.mockReturnValue([
    vi.fn(),
    { isFetching: false },
  ] as unknown as ReturnType<typeof useLazyGetCommentsQuery>);
  mockedUseCreateCommentMutation.mockReturnValue([
    vi.fn(),
    { isLoading: false, reset: vi.fn() },
  ] as ReturnType<typeof useCreateCommentMutation>);
}

function mockUpdatePostSuccess() {
  mockedUseUpdatePostMutation.mockReturnValue([
    mockUpdatePost.mockReturnValue({
      unwrap: () => Promise.resolve(makePost("Обновлённый текст", true)),
    }),
    { isLoading: false, reset: vi.fn() },
  ] as ReturnType<typeof useUpdatePostMutation>);
}

function mockDeletePostSuccess() {
  mockedUseDeletePostMutation.mockReturnValue([
    mockDeletePost.mockReturnValue({
      unwrap: () => Promise.resolve(undefined),
    }),
    { isLoading: false, reset: vi.fn() },
  ] as ReturnType<typeof useDeletePostMutation>);
}

function stubRadixDomApis() {
  HTMLElement.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.releasePointerCapture = vi.fn();
  Element.prototype.scrollIntoView = vi.fn();
}

describe("PostCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stubRadixDomApis();
    mockMutationsIdle();
    mockCommentsApiEmpty();
    mockUpdatePostSuccess();
    mockDeletePostSuccess();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("не показывает редактирование чужому посту", () => {
    // Arrange
    // Act
    renderWithProviders(<PostCard post={makePost("Чужой пост", false)} />);

    // Assert
    expect(
      screen.queryByRole("button", { name: "Редактировать пост" })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Удалить пост" })
    ).not.toBeInTheDocument();
  });

  test("сохраняет изменения поста", async () => {
    // Arrange
    const { user } = renderWithProviders(
      <PostCard post={makePost("Исходный текст", true)} />
    );

    // Act
    await user.click(
      screen.getByRole("button", { name: "Редактировать пост" })
    );
    const editor = screen.getByRole("textbox");
    await user.clear(editor);
    await user.type(editor, "Обновлённый текст");
    await user.click(screen.getByRole("button", { name: "Сохранить" }));

    // Assert
    await vi.waitFor(() => {
      expect(mockUpdatePost).toHaveBeenCalledWith({
        id: POST_ID,
        body: expect.any(FormData),
      });
    });
    const { body } = mockUpdatePost.mock.calls[0]?.[0] as {
      id: string;
      body: FormData;
    };
    expect(body.get("content")).toBe("Обновлённый текст");
  });

  test("удаляет пост после подтверждения в диалоге", async () => {
    // Arrange
    const { user } = renderWithProviders(
      <PostCard post={makePost("Пост на удаление", true)} />
    );

    // Act
    await user.click(screen.getByRole("button", { name: "Удалить пост" }));
    await user.click(screen.getByRole("button", { name: "Да" }));

    // Assert
    await vi.waitFor(() => {
      expect(mockDeletePost).toHaveBeenCalledWith(POST_ID);
    });
  });

  test("ставит лайк посту", async () => {
    // Arrange
    const { user } = renderWithProviders(
      <PostCard post={makePost("Пост для лайка", false)} />
    );

    // Act
    await user.click(screen.getByRole("button", { name: "Поставить лайк" }));

    // Assert
    expect(mockLikePost).toHaveBeenCalledWith(POST_ID);
  });

  test("убирает лайк с поста", async () => {
    // Arrange
    const { user } = renderWithProviders(
      <PostCard
        post={{
          ...makePost("Пост с лайком", false),
          likedByUser: true,
          likeCount: 1,
        }}
      />
    );

    // Act
    await user.click(screen.getByRole("button", { name: "Убрать лайк" }));

    // Assert
    expect(mockUnlikePost).toHaveBeenCalledWith(POST_ID);
  });

  test("показывает блок комментариев", async () => {
    // Arrange
    const { user } = renderWithProviders(
      <PostCard post={makePost("Пост с комментариями", false)} />
    );

    // Act
    await user.click(
      screen.getByRole("button", { name: "Показать комментарии" })
    );

    // Assert
    expect(
      screen.getByPlaceholderText("Напишите комментарий")
    ).toBeInTheDocument();
  });

  test("скрывает блок комментариев", async () => {
    // Arrange
    const { user } = renderWithProviders(
      <PostCard post={makePost("Пост с комментариями", false)} />
    );
    await user.click(
      screen.getByRole("button", { name: "Показать комментарии" })
    );
    expect(
      screen.getByPlaceholderText("Напишите комментарий")
    ).toBeInTheDocument();

    // Act
    await user.click(
      screen.getByRole("button", { name: "Скрыть комментарии" })
    );

    // Assert
    expect(
      screen.queryByPlaceholderText("Напишите комментарий")
    ).not.toBeInTheDocument();
  });

  test("отменяет редактирование без сохранения", async () => {
    // Arrange
    const { user } = renderWithProviders(
      <PostCard post={makePost("Исходный текст", true)} />
    );

    // Act
    await user.click(
      screen.getByRole("button", { name: "Редактировать пост" })
    );
    const editor = screen.getByRole("textbox");
    await user.clear(editor);
    await user.type(editor, "Черновик");
    await user.click(screen.getByRole("button", { name: "Отмена" }));

    // Assert
    expect(screen.getByText("Исходный текст")).toBeInTheDocument();
    expect(mockUpdatePost).not.toHaveBeenCalled();
  });
});
