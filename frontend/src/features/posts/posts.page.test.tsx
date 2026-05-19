import { screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { useGetPostsQuery } from "./api/posts.api";
import type { Post, PostsQuery } from "./model/types";
import { Component as PostsPage } from "./posts.page";

import "@/features/posts/api/posts.api";
import { renderWithProviders } from "@/shared/lib/test/render-with-providers";
import { ROUTES } from "@/shared/model/routes";

const NEXT_CURSOR = "cursor-page-2";

const PAGE_1: Post[] = [
  makePost("6a04cae90445f0b3a1d3861a", "Пост страница 1"),
];
const PAGE_2: Post[] = [
  makePost("6a04cae90445f0b3a1d3861b", "Пост страница 2"),
];

let intersectionCallback: IntersectionObserverCallback;

vi.mock("@/shared/lib/react/use-debounced-value", () => ({
  useDebouncedValue: <T,>(value: T) => value,
}));

vi.mock("./api/posts.api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./api/posts.api")>();

  return {
    ...actual,
    useGetPostsQuery: vi.fn(),
  };
});

const mockedUseGetPostsQuery = vi.mocked(useGetPostsQuery);

function makePost(id: string, content: string): Post {
  return {
    id,
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

function makeGetPostsQueryResult(data: {
  items: Post[];
  nextCursor: string | null;
}): ReturnType<typeof useGetPostsQuery> {
  return {
    data,
    isLoading: false,
    isFetching: false,
    refetch: vi.fn(),
  } as ReturnType<typeof useGetPostsQuery>;
}

function mockPostsFirstPageOnly() {
  mockedUseGetPostsQuery.mockImplementation(() =>
    makeGetPostsQueryResult({ items: PAGE_1, nextCursor: null })
  );
}

function mockPostsWithPagination() {
  mockedUseGetPostsQuery.mockImplementation((args?: PostsQuery) => {
    const cursor = args?.cursor ?? null;

    if (!cursor) {
      return makeGetPostsQueryResult({
        items: PAGE_1,
        nextCursor: NEXT_CURSOR,
      });
    }

    return makeGetPostsQueryResult({
      items: [...PAGE_1, ...PAGE_2],
      nextCursor: null,
    });
  });
}

function triggerSentinelVisible() {
  intersectionCallback(
    [{ isIntersecting: true } as IntersectionObserverEntry],
    {} as IntersectionObserver
  );
}

class MockIntersectionObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();

  constructor(cb: IntersectionObserverCallback) {
    intersectionCallback = cb;
  }
}

function stubRadixDomApis() {
  HTMLElement.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.releasePointerCapture = vi.fn();
  Element.prototype.scrollIntoView = vi.fn();
}

describe("PostsPage", () => {
  beforeEach(() => {
    intersectionCallback = vi.fn();
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
    stubRadixDomApis();
    mockPostsFirstPageOnly();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  test("открывает страницу ленты и показывает посты первой страницы", () => {
    // Arrange
    mockPostsFirstPageOnly();

    // Act
    renderWithProviders(<PostsPage />, { initialRoute: ROUTES.POSTS });

    // Assert
    expect(screen.getByText("Лента публикаций")).toBeInTheDocument();
    expect(screen.getByText("Пост страница 1")).toBeInTheDocument();
  });

  test("подгружает следующую страницу при появлении sentinel в viewport", async () => {
    // Arrange
    mockPostsWithPagination();
    renderWithProviders(<PostsPage />, { initialRoute: ROUTES.POSTS });
    expect(screen.getByText("Пост страница 1")).toBeInTheDocument();
    expect(screen.queryByText("Пост страница 2")).not.toBeInTheDocument();

    // Act
    triggerSentinelVisible();

    // Assert
    expect(await screen.findByText("Пост страница 2")).toBeInTheDocument();
    expect(mockedUseGetPostsQuery).toHaveBeenCalledWith(
      expect.objectContaining({ cursor: NEXT_CURSOR })
    );
  });

  test("передаёт поисковый запрос в API при вводе в поле поиска", async () => {
    // Arrange
    const { user } = renderWithProviders(<PostsPage />, {
      initialRoute: ROUTES.POSTS,
    });

    // Act
    await user.type(screen.getByLabelText("Поиск публикаций"), "диплом");

    // Assert
    await vi.waitFor(() => {
      expect(mockedUseGetPostsQuery).toHaveBeenCalledWith(
        expect.objectContaining({ q: "диплом", limit: 10 })
      );
    });
  });

  test("передаёт фильтр «только мои публикации» в API", async () => {
    // Arrange
    const { user } = renderWithProviders(<PostsPage />, {
      initialRoute: ROUTES.POSTS,
    });

    // Act
    await user.click(
      screen.getByRole("checkbox", { name: "Только мои публикации" })
    );

    // Assert
    expect(mockedUseGetPostsQuery).toHaveBeenCalledWith(
      expect.objectContaining({ mine: true, limit: 10 })
    );
  });

  test("передаёт сортировку «сначала старые» в API", async () => {
    // Arrange
    const { user } = renderWithProviders(<PostsPage />, {
      initialRoute: ROUTES.POSTS,
    });

    // Act
    await user.click(screen.getByRole("combobox"));
    await user.click(
      await screen.findByRole("option", { name: "Сначала старые" })
    );

    // Assert
    expect(mockedUseGetPostsQuery).toHaveBeenCalledWith(
      expect.objectContaining({ sort: "old", limit: 10 })
    );
  });
});
