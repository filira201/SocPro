import { screen } from "@testing-library/react";
import { href, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { Component as FollowingPage } from "./following.page";

import type { User } from "@/features/auth/lib/types";
import type {
  FollowListQueryArgs,
  FollowListUser,
} from "@/features/follow/api/follow.api";
import {
  useFollowUserMutation,
  useGetUserFollowersQuery,
  useGetUserFollowingQuery,
  useUnfollowUserMutation,
} from "@/features/follow/api/follow.api";
import "@/features/follow/api/follow.api";
import { renderWithProviders } from "@/shared/lib/test/render-with-providers";
import { ROUTES } from "@/shared/model/routes";

const NEXT_CURSOR = "cursor-following-page-2";

const LIST_OWNER_ID = "507f1f77bcf86cd7994390cc";
const CURRENT_USER_ID = "507f1f77bcf86cd799439099";
const USER_A_ID = "507f1f77bcf86cd7994390aa";
const USER_B_ID = "507f1f77bcf86cd7994390bb";

const followingRoute = href(ROUTES.FOLLOWING, { userId: LIST_OWNER_ID });

let intersectionCallback: IntersectionObserverCallback;

vi.mock("@/shared/lib/react/use-debounced-value", () => ({
  useDebouncedValue: <T,>(value: T) => value,
}));

vi.mock("@/features/follow/api/follow.api", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/features/follow/api/follow.api")>();

  return {
    ...actual,
    useGetUserFollowersQuery: vi.fn(),
    useGetUserFollowingQuery: vi.fn(),
    useFollowUserMutation: vi.fn(),
    useUnfollowUserMutation: vi.fn(),
  };
});

const mockedUseGetUserFollowersQuery = vi.mocked(useGetUserFollowersQuery);
const mockedUseGetUserFollowingQuery = vi.mocked(useGetUserFollowingQuery);
const mockedUseFollowUserMutation = vi.mocked(useFollowUserMutation);
const mockedUseUnfollowUserMutation = vi.mocked(useUnfollowUserMutation);

const mockFollowUser = vi.fn();
const mockUnfollowUser = vi.fn();

function setupFollowMutationMocks() {
  mockedUseFollowUserMutation.mockReturnValue([
    mockFollowUser,
    { isLoading: false, reset: vi.fn() },
  ] as unknown as ReturnType<typeof useFollowUserMutation>);

  mockedUseUnfollowUserMutation.mockReturnValue([
    mockUnfollowUser,
    { isLoading: false, reset: vi.fn() },
  ] as unknown as ReturnType<typeof useUnfollowUserMutation>);
}

function makeFollowListUser(
  id: string,
  firstName: string,
  lastName: string | null,
  isFollowing: boolean
): FollowListUser {
  return {
    id,
    email: `${id.slice(-6)}@example.com`,
    firstName,
    lastName,
    patronymic: null,
    avatarUrl: null,
    bio: null,
    dateOfBirth: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    isFollowing,
  };
}

const PAGE_1_USERS: FollowListUser[] = [
  makeFollowListUser(USER_A_ID, "Пётр", "Петров", false),
];
const PAGE_2_USERS: FollowListUser[] = [
  makeFollowListUser(USER_B_ID, "Анна", "Сидорова", true),
];

function makeAuthenticatedUser(): User {
  return {
    id: CURRENT_USER_ID,
    email: "me@example.com",
    firstName: "Мария",
    lastName: "Иванова",
    patronymic: null,
    avatarUrl: null,
    bio: null,
    dateOfBirth: null,
    createdAt: "2026-01-01T00:00:00.000Z",
  };
}

function makeFollowingListQueryResult(data: {
  items: FollowListUser[];
  nextCursor: string | null;
}): ReturnType<typeof useGetUserFollowingQuery> {
  return {
    data,
    isLoading: false,
    isFetching: false,
    refetch: vi.fn(),
  } as ReturnType<typeof useGetUserFollowingQuery>;
}

function makeIdleFollowersQueryResult(): ReturnType<
  typeof useGetUserFollowersQuery
> {
  return {
    data: undefined,
    isLoading: false,
    isFetching: false,
    isUninitialized: true,
    isSuccess: false,
    isError: false,
    refetch: vi.fn(),
  } as ReturnType<typeof useGetUserFollowersQuery>;
}

function mockFollowingFirstPageOnly() {
  mockedUseGetUserFollowingQuery.mockImplementation(() =>
    makeFollowingListQueryResult({
      items: PAGE_1_USERS,
      nextCursor: null,
    })
  );
}

function mockFollowingWithPagination() {
  mockedUseGetUserFollowingQuery.mockImplementation(
    (args?: FollowListQueryArgs) => {
      const cursor = args?.cursor ?? null;

      if (!cursor) {
        return makeFollowingListQueryResult({
          items: PAGE_1_USERS,
          nextCursor: NEXT_CURSOR,
        });
      }

      return makeFollowingListQueryResult({
        items: [...PAGE_1_USERS, ...PAGE_2_USERS],
        nextCursor: null,
      });
    }
  );
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

function renderFollowingPage(initialRoute = followingRoute) {
  return renderWithProviders(
    <Routes>
      <Route path={ROUTES.FOLLOWING} element={<FollowingPage />} />
    </Routes>,
    { initialRoute, authenticatedUser: makeAuthenticatedUser() }
  );
}

describe("FollowingPage", () => {
  beforeEach(() => {
    intersectionCallback = vi.fn();
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
    stubRadixDomApis();
    mockedUseGetUserFollowersQuery.mockReturnValue(
      makeIdleFollowersQueryResult()
    );
    mockFollowingFirstPageOnly();
    setupFollowMutationMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  test("показывает сообщение при некорректном userId в ссылке", () => {
    // Arrange
    mockFollowingFirstPageOnly();

    // Act
    renderFollowingPage("/following/abc");

    // Assert
    expect(screen.getByText("Некорректная ссылка")).toBeInTheDocument();
    expect(
      screen.queryByLabelText("Поиск подписок по ФИО")
    ).not.toBeInTheDocument();
  });

  test("показывает заголовок и карточки подписок первой страницы", () => {
    // Arrange
    mockFollowingFirstPageOnly();

    // Act
    renderFollowingPage();

    // Assert
    expect(
      screen.getByRole("heading", { name: "Подписки" })
    ).toBeInTheDocument();
    expect(screen.getByText("Пётр Петров")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Профиль: Пётр Петров" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Подписаться" })
    ).toBeInTheDocument();
  });

  test("подгружает следующую страницу при появлении sentinel в viewport", async () => {
    // Arrange
    mockFollowingWithPagination();
    renderFollowingPage();
    expect(screen.getByText("Пётр Петров")).toBeInTheDocument();
    expect(screen.queryByText("Анна Сидорова")).not.toBeInTheDocument();

    // Act
    triggerSentinelVisible();

    // Assert
    expect(await screen.findByText("Анна Сидорова")).toBeInTheDocument();
    expect(mockedUseGetUserFollowingQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        cursor: NEXT_CURSOR,
        limit: 10,
        userId: LIST_OWNER_ID,
      }),
      expect.anything()
    );
  });

  test("передаёт поисковый запрос в API при вводе в поле поиска", async () => {
    // Arrange
    const { user } = renderFollowingPage();

    // Act
    await user.type(screen.getByLabelText("Поиск подписок по ФИО"), "Иванов");

    // Assert
    await vi.waitFor(() => {
      expect(mockedUseGetUserFollowingQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          q: "Иванов",
          limit: 10,
          userId: LIST_OWNER_ID,
        }),
        expect.anything()
      );
    });
  });

  test("при клике «Подписаться» вызывает подписку на пользователя из карточки", async () => {
    // Arrange
    mockFollowingFirstPageOnly();
    const { user } = renderFollowingPage();

    // Act
    await user.click(screen.getByRole("button", { name: "Подписаться" }));

    // Assert
    expect(mockFollowUser).toHaveBeenCalledTimes(1);
    expect(mockFollowUser).toHaveBeenCalledWith({
      followingId: USER_A_ID,
    });
    expect(mockUnfollowUser).not.toHaveBeenCalled();
  });

  test("при клике «Отписаться» вызывает отписку от пользователя из карточки", async () => {
    // Arrange
    mockedUseGetUserFollowingQuery.mockImplementation(() =>
      makeFollowingListQueryResult({
        items: [makeFollowListUser(USER_A_ID, "Пётр", "Петров", true)],
        nextCursor: null,
      })
    );
    const { user } = renderFollowingPage();

    // Act
    await user.click(screen.getByRole("button", { name: "Отписаться" }));

    // Assert
    expect(mockUnfollowUser).toHaveBeenCalledTimes(1);
    expect(mockUnfollowUser).toHaveBeenCalledWith({
      followingId: USER_A_ID,
    });
    expect(mockFollowUser).not.toHaveBeenCalled();
  });
});
