import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import {
  useCreateCommentMutation,
  useGetCommentsQuery,
  useLazyGetCommentsQuery,
} from "../../api/comments.api";
import { DEFAULT_POST_ID, makeComment } from "../../lib/test/make-comment";
import type { CommentsQuery } from "../../model/types";

import { CommentListRoot } from "./comment-list-root";

import "@/features/comments/api/comments.api";
import { renderWithProviders } from "@/shared/lib/test/render-with-providers";

const NEXT_CURSOR = "comments-cursor-2";

const PAGE_1 = [
  makeComment({ id: "6a0c96bf4dbfb0b7a7569ff1", content: "Комментарий 1" }),
];
const PAGE_2 = [
  makeComment({ id: "6a0c96bf4dbfb0b7a7569ff2", content: "Комментарий 2" }),
];

const mockLoadComments = vi.fn();
const mockCreateComment = vi.fn();

vi.mock("../../api/comments.api", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../../api/comments.api")>();

  return {
    ...actual,
    useGetCommentsQuery: vi.fn(),
    useLazyGetCommentsQuery: vi.fn(),
    useCreateCommentMutation: vi.fn(),
  };
});

const mockedUseGetCommentsQuery = vi.mocked(useGetCommentsQuery);
const mockedUseLazyGetCommentsQuery = vi.mocked(useLazyGetCommentsQuery);
const mockedUseCreateCommentMutation = vi.mocked(useCreateCommentMutation);

function makeCommentsQueryResult(
  items: typeof PAGE_1,
  nextCursor: string | null
) {
  return {
    data: { items, nextCursor },
    isLoading: false,
    isFetching: false,
    refetch: vi.fn(),
  } as ReturnType<typeof useGetCommentsQuery>;
}

function stubRadixDomApis() {
  HTMLElement.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.releasePointerCapture = vi.fn();
  Element.prototype.scrollIntoView = vi.fn();
}

function mockRootCommentsFirstPage(nextCursor: string | null = null) {
  mockedUseGetCommentsQuery.mockImplementation((args?: CommentsQuery) => {
    if (args?.parentId) {
      return makeCommentsQueryResult([], null);
    }

    return makeCommentsQueryResult(PAGE_1, nextCursor);
  });
}

describe("CommentListRoot", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stubRadixDomApis();
    mockRootCommentsFirstPage();
    mockedUseLazyGetCommentsQuery.mockReturnValue([
      mockLoadComments.mockReturnValue({
        unwrap: () => Promise.resolve({ items: PAGE_2, nextCursor: null }),
      }),
      { isFetching: false },
    ] as unknown as ReturnType<typeof useLazyGetCommentsQuery>);
    mockedUseCreateCommentMutation.mockReturnValue([
      mockCreateComment.mockReturnValue({
        unwrap: () =>
          Promise.resolve(
            makeComment({ id: "6a0c96bf4dbfb0b7a7569ff3", content: "Новый" })
          ),
      }),
      { isLoading: false, reset: vi.fn() },
    ] as ReturnType<typeof useCreateCommentMutation>);
  });

  test("показывает комментарии первой страницы", () => {
    // Arrange
    mockRootCommentsFirstPage();

    // Act
    renderWithProviders(<CommentListRoot postId={DEFAULT_POST_ID} />);

    // Assert
    expect(screen.getByText("Комментарий 1")).toBeInTheDocument();
  });

  test("догружает следующие комментарии", async () => {
    // Arrange
    mockRootCommentsFirstPage(NEXT_CURSOR);
    const { user } = renderWithProviders(
      <CommentListRoot postId={DEFAULT_POST_ID} />
    );

    // Act
    await user.click(
      screen.getByRole("button", { name: "Показать следующие комментарии" })
    );

    // Assert
    expect(await screen.findByText("Комментарий 2")).toBeInTheDocument();
    expect(mockLoadComments).toHaveBeenCalledWith(
      expect.objectContaining({
        postId: DEFAULT_POST_ID,
        parentId: null,
        cursor: NEXT_CURSOR,
      })
    );
  });

  test("отправляет корневой комментарий", async () => {
    // Arrange
    const { user } = renderWithProviders(
      <CommentListRoot postId={DEFAULT_POST_ID} />
    );

    // Act
    await user.type(
      screen.getByPlaceholderText("Напишите комментарий"),
      "Новый комментарий"
    );
    await user.click(screen.getByRole("button", { name: "Отправить" }));

    // Assert
    await vi.waitFor(() => {
      expect(mockCreateComment).toHaveBeenCalledTimes(1);
    });
    const formData = mockCreateComment.mock.calls[0]?.[0] as FormData;
    expect(formData.get("postId")).toBe(DEFAULT_POST_ID);
    expect(formData.get("content")).toBe("Новый комментарий");
  });
});
