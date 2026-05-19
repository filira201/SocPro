import { screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import {
  useCreateCommentMutation,
  useDeleteCommentMutation,
  useGetCommentsQuery,
  useLazyGetCommentsQuery,
  useLikeCommentMutation,
  useUnlikeCommentMutation,
  useUpdateCommentMutation,
} from "../../api/comments.api";
import { DEFAULT_POST_ID, makeComment } from "../../lib/test/make-comment";
import type { Comment, CommentsQuery } from "../../model/types";

import { CommentThreadItem } from "./comment-thread-item";

import "@/features/comments/api/comments.api";
import { renderWithProviders } from "@/shared/lib/test/render-with-providers";

const PARENT_ID = "6a0c96bf4dbfb0b7a7569aa0";
const REPLY_ID_1 = "6a0c96bf4dbfb0b7a7569bb1";
const REPLY_ID_2 = "6a0c96bf4dbfb0b7a7569bb2";
const REPLY_CURSOR = "replies-cursor-2";

const mockLoadReplies = vi.fn();
const mockCreateComment = vi.fn();
const mockUpdateComment = vi.fn();
const mockDeleteComment = vi.fn();
const mockLikeComment = vi.fn();
const mockUnlikeComment = vi.fn();

vi.mock("../../api/comments.api", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../../api/comments.api")>();

  return {
    ...actual,
    useGetCommentsQuery: vi.fn(),
    useLazyGetCommentsQuery: vi.fn(),
    useCreateCommentMutation: vi.fn(),
    useUpdateCommentMutation: vi.fn(),
    useDeleteCommentMutation: vi.fn(),
    useLikeCommentMutation: vi.fn(),
    useUnlikeCommentMutation: vi.fn(),
  };
});

const mockedUseGetCommentsQuery = vi.mocked(useGetCommentsQuery);
const mockedUseLazyGetCommentsQuery = vi.mocked(useLazyGetCommentsQuery);
const mockedUseCreateCommentMutation = vi.mocked(useCreateCommentMutation);
const mockedUseUpdateCommentMutation = vi.mocked(useUpdateCommentMutation);
const mockedUseDeleteCommentMutation = vi.mocked(useDeleteCommentMutation);
const mockedUseLikeCommentMutation = vi.mocked(useLikeCommentMutation);
const mockedUseUnlikeCommentMutation = vi.mocked(useUnlikeCommentMutation);

function makeCommentsQueryResult(
  items: Comment[],
  nextCursor: string | null,
  isLoading = false,
  isFetching = false
) {
  return {
    data: { items, nextCursor },
    isLoading,
    isFetching,
    refetch: vi.fn(),
  } as ReturnType<typeof useGetCommentsQuery>;
}

function stubRadixDomApis() {
  HTMLElement.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.releasePointerCapture = vi.fn();
  Element.prototype.scrollIntoView = vi.fn();
}

function setupRepliesMock(
  page1: Comment[],
  nextCursor: string | null,
  page2: Comment[] = []
) {
  mockedUseGetCommentsQuery.mockImplementation((args?: CommentsQuery) => {
    if (args?.parentId === PARENT_ID) {
      return makeCommentsQueryResult(page1, nextCursor);
    }

    return makeCommentsQueryResult([], null);
  });
  mockedUseLazyGetCommentsQuery.mockReturnValue([
    mockLoadReplies.mockReturnValue({
      unwrap: () => Promise.resolve({ items: page2, nextCursor: null }),
    }),
    { isFetching: false },
  ] as unknown as ReturnType<typeof useLazyGetCommentsQuery>);
}

function setupMutations() {
  mockedUseCreateCommentMutation.mockReturnValue([
    mockCreateComment.mockReturnValue({
      unwrap: () =>
        Promise.resolve(
          makeComment({
            id: "6a0c96bf4dbfb0b7a7569cc1",
            content: "@Иван Иванов, Новый ответ",
            parentId: PARENT_ID,
            replyToUserId: "507f1f77bcf86cd799439011",
            replyToDisplayName: "Иван Иванов",
          })
        ),
    }),
    { isLoading: false, reset: vi.fn() },
  ] as ReturnType<typeof useCreateCommentMutation>);

  mockedUseUpdateCommentMutation.mockReturnValue([
    mockUpdateComment.mockReturnValue({
      unwrap: () =>
        Promise.resolve(
          makeComment({
            id: PARENT_ID,
            content: "Обновлённый комментарий",
            isOwner: true,
            replyCount: 2,
          })
        ),
    }),
    { isLoading: false, reset: vi.fn() },
  ] as ReturnType<typeof useUpdateCommentMutation>);

  mockedUseDeleteCommentMutation.mockReturnValue([
    mockDeleteComment.mockReturnValue({
      unwrap: () =>
        Promise.resolve(
          makeComment({ id: PARENT_ID, content: "Удалён", isOwner: true })
        ),
    }),
    { isLoading: false, reset: vi.fn() },
  ] as ReturnType<typeof useDeleteCommentMutation>);

  mockedUseLikeCommentMutation.mockReturnValue([
    mockLikeComment.mockReturnValue({
      unwrap: () =>
        Promise.resolve(
          makeComment({
            id: PARENT_ID,
            content: "Родительский комментарий",
            likedByUser: true,
            likeCount: 1,
            replyCount: 2,
          })
        ),
    }),
    { isLoading: false, reset: vi.fn() },
  ] as ReturnType<typeof useLikeCommentMutation>);

  mockedUseUnlikeCommentMutation.mockReturnValue([
    mockUnlikeComment.mockReturnValue({
      unwrap: () =>
        Promise.resolve(
          makeComment({
            id: PARENT_ID,
            content: "Родительский комментарий",
            likedByUser: false,
            likeCount: 0,
            replyCount: 2,
          })
        ),
    }),
    { isLoading: false, reset: vi.fn() },
  ] as ReturnType<typeof useUnlikeCommentMutation>);
}

function parentComment(overrides: Partial<Comment> = {}) {
  return makeComment({
    id: PARENT_ID,
    content: "Родительский комментарий",
    replyCount: 2,
    isOwner: true,
    ...overrides,
  });
}

function replyComment(overrides: Partial<Comment> = {}) {
  return makeComment({
    id: REPLY_ID_1,
    content: "@Иван Иванов, Текст ответа",
    parentId: PARENT_ID,
    replyToUserId: "507f1f77bcf86cd799439011",
    replyToDisplayName: "Иван Иванов",
    isOwner: true,
    ...overrides,
  });
}

describe("CommentThreadItem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stubRadixDomApis();
    setupMutations();
    setupRepliesMock([], null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("корневой комментарий", () => {
    test("ставит лайк комментария", async () => {
      // Arrange
      const { user } = renderWithProviders(
        <CommentThreadItem
          postId={DEFAULT_POST_ID}
          comment={parentComment({ likedByUser: false, likeCount: 0 })}
          sort="top"
        />
      );

      // Act
      await user.click(
        screen.getByRole("button", { name: "Поставить лайк комментария" })
      );

      // Assert
      await vi.waitFor(() => {
        expect(mockLikeComment).toHaveBeenCalledWith({
          id: PARENT_ID,
          query: expect.objectContaining({
            postId: DEFAULT_POST_ID,
            parentId: null,
          }),
        });
      });
    });

    test("убирает лайк комментария", async () => {
      // Arrange
      const { user } = renderWithProviders(
        <CommentThreadItem
          postId={DEFAULT_POST_ID}
          comment={parentComment({ likedByUser: true, likeCount: 1 })}
          sort="top"
        />
      );

      // Act
      await user.click(
        screen.getByRole("button", { name: "Убрать лайк у комментария" })
      );

      // Assert
      await vi.waitFor(() => {
        expect(mockUnlikeComment).toHaveBeenCalledWith({
          id: PARENT_ID,
          query: expect.objectContaining({
            postId: DEFAULT_POST_ID,
            parentId: null,
          }),
        });
      });
    });

    test("показывает ответы на комментарий", async () => {
      // Arrange
      setupRepliesMock(
        [
          makeComment({
            id: REPLY_ID_1,
            content: "@Иван Иванов, Ответ 1",
            parentId: PARENT_ID,
            replyToDisplayName: "Иван Иванов",
          }),
        ],
        null
      );
      const { user } = renderWithProviders(
        <CommentThreadItem
          postId={DEFAULT_POST_ID}
          comment={parentComment()}
          sort="top"
        />
      );

      // Act
      await user.click(screen.getByRole("button", { name: "Показать ответы" }));

      // Assert
      await vi.waitFor(() => {
        expect(
          screen.getByRole("button", { name: "Скрыть ответы" })
        ).toBeInTheDocument();
      });
      expect(screen.getByText("Ответ 1")).toBeInTheDocument();
      expect(mockedUseGetCommentsQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          postId: DEFAULT_POST_ID,
          parentId: PARENT_ID,
        }),
        expect.anything()
      );
    });

    test("догружает следующие ответы", async () => {
      // Arrange
      setupRepliesMock(
        [
          makeComment({
            id: REPLY_ID_1,
            content: "@Иван Иванов, Ответ 1",
            parentId: PARENT_ID,
            replyToDisplayName: "Иван Иванов",
          }),
        ],
        REPLY_CURSOR,
        [
          makeComment({
            id: REPLY_ID_2,
            content: "@Иван Иванов, Ответ 2",
            parentId: PARENT_ID,
            replyToDisplayName: "Иван Иванов",
          }),
        ]
      );
      const { user } = renderWithProviders(
        <CommentThreadItem
          postId={DEFAULT_POST_ID}
          comment={parentComment()}
          sort="top"
        />
      );
      await user.click(screen.getByRole("button", { name: "Показать ответы" }));
      await vi.waitFor(() => {
        expect(screen.getByText("Ответ 1")).toBeInTheDocument();
      });

      // Act
      await user.click(
        screen.getByRole("button", { name: "Показать следующие комментарии" })
      );

      // Assert
      expect(await screen.findByText("Ответ 2")).toBeInTheDocument();
      expect(mockLoadReplies).toHaveBeenCalledWith(
        expect.objectContaining({
          parentId: PARENT_ID,
          cursor: REPLY_CURSOR,
        })
      );
    });

    test("оставляет ответ на комментарий", async () => {
      // Arrange
      const { user } = renderWithProviders(
        <CommentThreadItem
          postId={DEFAULT_POST_ID}
          comment={parentComment()}
          sort="top"
        />
      );

      // Act
      await user.click(
        screen.getByRole("button", { name: "Открыть форму ответа" })
      );
      await user.type(
        screen.getByPlaceholderText("Напишите комментарий"),
        "Новый ответ"
      );
      await user.click(screen.getByRole("button", { name: "Ответить" }));

      // Assert
      await vi.waitFor(() => {
        expect(mockCreateComment).toHaveBeenCalledTimes(1);
      });
      const formData = mockCreateComment.mock.calls[0]?.[0] as FormData;
      expect(formData.get("parentId")).toBe(PARENT_ID);
      expect(formData.get("content")).toBe("@Иван Иванов, Новый ответ");
    });

    test("редактирует комментарий", async () => {
      // Arrange
      const { user } = renderWithProviders(
        <CommentThreadItem
          postId={DEFAULT_POST_ID}
          comment={parentComment()}
          sort="top"
        />
      );

      // Act
      await user.click(
        screen.getByRole("button", { name: "Редактировать комментарий" })
      );
      const editor = screen.getByRole("textbox");
      await user.clear(editor);
      await user.type(editor, "Обновлённый комментарий");
      await user.click(screen.getByRole("button", { name: "Сохранить" }));

      // Assert
      await vi.waitFor(() => {
        expect(mockUpdateComment).toHaveBeenCalledWith({
          id: PARENT_ID,
          body: expect.any(FormData),
        });
      });
      const { body } = mockUpdateComment.mock.calls[0]?.[0] as {
        id: string;
        body: FormData;
      };
      expect(body.get("content")).toBe("Обновлённый комментарий");
    });

    test("отменяет редактирование комментария", async () => {
      // Arrange
      const { user } = renderWithProviders(
        <CommentThreadItem
          postId={DEFAULT_POST_ID}
          comment={parentComment()}
          sort="top"
        />
      );

      // Act
      await user.click(
        screen.getByRole("button", { name: "Редактировать комментарий" })
      );
      const editor = screen.getByRole("textbox");
      await user.clear(editor);
      await user.type(editor, "Черновик");
      await user.click(screen.getByRole("button", { name: "Отмена" }));

      // Assert
      expect(screen.getByText("Родительский комментарий")).toBeInTheDocument();
      expect(mockUpdateComment).not.toHaveBeenCalled();
    });

    test("удаляет комментарий", async () => {
      // Arrange
      const { user } = renderWithProviders(
        <CommentThreadItem
          postId={DEFAULT_POST_ID}
          comment={parentComment()}
          sort="top"
        />
      );

      // Act
      await user.click(
        screen.getByRole("button", { name: "Удалить комментарий" })
      );
      await user.click(screen.getByRole("button", { name: "Да" }));

      // Assert
      await vi.waitFor(() => {
        expect(mockDeleteComment).toHaveBeenCalledWith({
          id: PARENT_ID,
          postId: DEFAULT_POST_ID,
        });
      });
    });
  });

  describe("ответ", () => {
    function setupReplyLikeMocks(comment: Comment) {
      mockedUseLikeCommentMutation.mockReturnValue([
        mockLikeComment.mockReturnValue({
          unwrap: () =>
            Promise.resolve({ ...comment, likedByUser: true, likeCount: 1 }),
        }),
        { isLoading: false, reset: vi.fn() },
      ] as ReturnType<typeof useLikeCommentMutation>);
      mockedUseUnlikeCommentMutation.mockReturnValue([
        mockUnlikeComment.mockReturnValue({
          unwrap: () =>
            Promise.resolve({ ...comment, likedByUser: false, likeCount: 0 }),
        }),
        { isLoading: false, reset: vi.fn() },
      ] as ReturnType<typeof useUnlikeCommentMutation>);
      mockedUseUpdateCommentMutation.mockReturnValue([
        mockUpdateComment.mockReturnValue({
          unwrap: () =>
            Promise.resolve({
              ...comment,
              content: "Обновлённый ответ",
            }),
        }),
        { isLoading: false, reset: vi.fn() },
      ] as ReturnType<typeof useUpdateCommentMutation>);
      mockedUseDeleteCommentMutation.mockReturnValue([
        mockDeleteComment.mockReturnValue({
          unwrap: () => Promise.resolve(comment),
        }),
        { isLoading: false, reset: vi.fn() },
      ] as ReturnType<typeof useDeleteCommentMutation>);
    }

    test("ставит лайк ответу", async () => {
      // Arrange
      const reply = replyComment({ likedByUser: false, likeCount: 0 });
      setupReplyLikeMocks(reply);
      const { user } = renderWithProviders(
        <CommentThreadItem
          postId={DEFAULT_POST_ID}
          comment={reply}
          sort="top"
        />
      );

      // Act
      await user.click(
        screen.getByRole("button", { name: "Поставить лайк комментария" })
      );

      // Assert
      await vi.waitFor(() => {
        expect(mockLikeComment).toHaveBeenCalledWith({
          id: REPLY_ID_1,
          query: expect.objectContaining({ parentId: PARENT_ID }),
        });
      });
    });

    test("убирает лайк с ответа", async () => {
      // Arrange
      const reply = replyComment({ likedByUser: true, likeCount: 1 });
      setupReplyLikeMocks(reply);
      const { user } = renderWithProviders(
        <CommentThreadItem
          postId={DEFAULT_POST_ID}
          comment={reply}
          sort="top"
        />
      );

      // Act
      await user.click(
        screen.getByRole("button", { name: "Убрать лайк у комментария" })
      );

      // Assert
      await vi.waitFor(() => {
        expect(mockUnlikeComment).toHaveBeenCalledWith({
          id: REPLY_ID_1,
          query: expect.objectContaining({ parentId: PARENT_ID }),
        });
      });
    });

    test("редактирует ответ", async () => {
      // Arrange
      const reply = replyComment();
      setupReplyLikeMocks(reply);
      const { user } = renderWithProviders(
        <CommentThreadItem
          postId={DEFAULT_POST_ID}
          comment={reply}
          sort="top"
        />
      );

      // Act
      await user.click(
        screen.getByRole("button", { name: "Редактировать комментарий" })
      );
      const editor = screen.getByRole("textbox");
      await user.clear(editor);
      await user.type(editor, "Обновлённый ответ");
      await user.click(screen.getByRole("button", { name: "Сохранить" }));

      // Assert
      await vi.waitFor(() => {
        expect(mockUpdateComment).toHaveBeenCalledWith({
          id: REPLY_ID_1,
          body: expect.any(FormData),
        });
      });
    });

    test("удаляет ответ", async () => {
      // Arrange
      const reply = replyComment();
      setupReplyLikeMocks(reply);
      const { user } = renderWithProviders(
        <CommentThreadItem
          postId={DEFAULT_POST_ID}
          comment={reply}
          sort="top"
        />
      );

      // Act
      await user.click(
        screen.getByRole("button", { name: "Удалить комментарий" })
      );
      await user.click(screen.getByRole("button", { name: "Да" }));

      // Assert
      await vi.waitFor(() => {
        expect(mockDeleteComment).toHaveBeenCalledWith({
          id: REPLY_ID_1,
          postId: DEFAULT_POST_ID,
        });
      });
    });
  });
});
