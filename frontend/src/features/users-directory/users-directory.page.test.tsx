import { screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { useGetUsersDirectoryQuery } from "./api/users-directory.api";
import type { UsersDirectoryQueryArgs } from "./api/users-directory.api";
import { Component as UsersDirectoryPage } from "./users-directory.page";

import type { User } from "@/features/auth/lib/types";
import type { FollowListUser } from "@/features/follow/api/follow.api";
import {
  useFollowUserMutation,
  useUnfollowUserMutation,
} from "@/features/follow/api/follow.api";
import "@/features/follow/api/follow.api";
import "@/features/users-directory/api/users-directory.api";
import { renderWithProviders } from "@/shared/lib/test/render-with-providers";
import { ROUTES } from "@/shared/model/routes";

const NEXT_CURSOR = "cursor-users-page-2";

const CURRENT_USER_ID = "507f1f77bcf86cd799439099";
const USER_A_ID = "507f1f77bcf86cd7994390aa";
const USER_B_ID = "507f1f77bcf86cd7994390bb";

const SKILL_ID_1 = "507f1f77bcf86cd799439011";
const SKILL_ID_2 = "507f1f77bcf86cd799439012";

let intersectionCallback: IntersectionObserverCallback;

vi.mock("@/shared/lib/react/use-debounced-value", () => ({
  useDebouncedValue: <T,>(value: T) => value,
}));

vi.mock("@/features/skills/api/skills.api", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/features/skills/api/skills.api")>();

  return {
    ...actual,
    useResolveSkillsByIdsQuery: vi.fn(() => ({
      data: [],
      isUninitialized: false,
      isLoading: false,
      isFetching: false,
      isSuccess: true,
      isError: false,
      refetch: vi.fn(),
    })) as unknown as typeof actual.useResolveSkillsByIdsQuery,
    useLazyListSkillsQuery: vi.fn(() => [
      vi.fn().mockReturnValue({
        unwrap: () => Promise.resolve([]),
      }),
      { isLoading: false, isFetching: false, reset: vi.fn() },
      {},
    ]) as unknown as typeof actual.useLazyListSkillsQuery,
  };
});

vi.mock("./api/users-directory.api", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("./api/users-directory.api")>();

  return {
    ...actual,
    useGetUsersDirectoryQuery: vi.fn(),
  };
});

vi.mock("@/features/follow/api/follow.api", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/features/follow/api/follow.api")>();

  return {
    ...actual,
    useFollowUserMutation: vi.fn(),
    useUnfollowUserMutation: vi.fn(),
  };
});

const mockedUseGetUsersDirectoryQuery = vi.mocked(useGetUsersDirectoryQuery);
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

function makeGetUsersDirectoryQueryResult(data: {
  items: FollowListUser[];
  nextCursor: string | null;
}): ReturnType<typeof useGetUsersDirectoryQuery> {
  return {
    data,
    isLoading: false,
    isFetching: false,
    refetch: vi.fn(),
  } as ReturnType<typeof useGetUsersDirectoryQuery>;
}

function mockUsersDirectoryFirstPageOnly() {
  mockedUseGetUsersDirectoryQuery.mockImplementation(() =>
    makeGetUsersDirectoryQueryResult({
      items: PAGE_1_USERS,
      nextCursor: null,
    })
  );
}

function mockUsersDirectoryWithPagination() {
  mockedUseGetUsersDirectoryQuery.mockImplementation(
    (args?: UsersDirectoryQueryArgs) => {
      const cursor = args?.cursor ?? null;

      if (!cursor) {
        return makeGetUsersDirectoryQueryResult({
          items: PAGE_1_USERS,
          nextCursor: NEXT_CURSOR,
        });
      }

      return makeGetUsersDirectoryQueryResult({
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

describe("UsersDirectoryPage", () => {
  beforeEach(() => {
    intersectionCallback = vi.fn();
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
    stubRadixDomApis();
    mockUsersDirectoryFirstPageOnly();
    setupFollowMutationMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  test("показывает заголовок и карточки пользователей первой страницы", () => {
    // Arrange
    mockUsersDirectoryFirstPageOnly();

    // Act
    renderWithProviders(<UsersDirectoryPage />, {
      initialRoute: ROUTES.USERS,
      authenticatedUser: makeAuthenticatedUser(),
    });

    // Assert
    expect(
      screen.getByRole("heading", { name: "Пользователи" })
    ).toBeInTheDocument();
    expect(screen.getByText("Пётр Петров")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Профиль: Пётр Петров" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Подписаться" })
    ).toBeInTheDocument();
  });

  test("при клике «Подписаться» вызывает подписку на пользователя из карточки", async () => {
    // Arrange
    mockUsersDirectoryFirstPageOnly();
    const { user } = renderWithProviders(<UsersDirectoryPage />, {
      initialRoute: ROUTES.USERS,
      authenticatedUser: makeAuthenticatedUser(),
    });

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
    mockedUseGetUsersDirectoryQuery.mockImplementation(() =>
      makeGetUsersDirectoryQueryResult({
        items: [makeFollowListUser(USER_A_ID, "Пётр", "Петров", true)],
        nextCursor: null,
      })
    );
    const { user } = renderWithProviders(<UsersDirectoryPage />, {
      initialRoute: ROUTES.USERS,
      authenticatedUser: makeAuthenticatedUser(),
    });
    expect(
      screen.getByRole("button", { name: "Отписаться" })
    ).toBeInTheDocument();

    // Act
    await user.click(screen.getByRole("button", { name: "Отписаться" }));

    // Assert
    expect(mockUnfollowUser).toHaveBeenCalledTimes(1);
    expect(mockUnfollowUser).toHaveBeenCalledWith({
      followingId: USER_A_ID,
    });
    expect(mockFollowUser).not.toHaveBeenCalled();
  });

  test("подгружает следующую страницу при появлении sentinel в viewport", async () => {
    // Arrange
    mockUsersDirectoryWithPagination();
    renderWithProviders(<UsersDirectoryPage />, {
      initialRoute: ROUTES.USERS,
      authenticatedUser: makeAuthenticatedUser(),
    });
    expect(screen.getByText("Пётр Петров")).toBeInTheDocument();
    expect(screen.queryByText("Анна Сидорова")).not.toBeInTheDocument();

    // Act
    triggerSentinelVisible();

    // Assert
    expect(await screen.findByText("Анна Сидорова")).toBeInTheDocument();
    expect(mockedUseGetUsersDirectoryQuery).toHaveBeenCalledWith(
      expect.objectContaining({ cursor: NEXT_CURSOR, limit: 10 })
    );
  });

  test("передаёт поисковый запрос в API при вводе в поле поиска", async () => {
    // Arrange
    const { user } = renderWithProviders(<UsersDirectoryPage />, {
      initialRoute: ROUTES.USERS,
      authenticatedUser: makeAuthenticatedUser(),
    });

    // Act
    await user.type(
      screen.getByLabelText("Поиск пользователей по ФИО"),
      "Иванов"
    );

    // Assert
    await vi.waitFor(() => {
      expect(mockedUseGetUsersDirectoryQuery).toHaveBeenCalledWith(
        expect.objectContaining({ q: "Иванов", limit: 10 })
      );
    });
  });

  test("передаёт выбранные навыки из URL в API", () => {
    // Arrange
    mockUsersDirectoryFirstPageOnly();

    // Act
    renderWithProviders(<UsersDirectoryPage />, {
      initialEntries: [`${ROUTES.USERS}?skills=${SKILL_ID_2},${SKILL_ID_1}`],
      authenticatedUser: makeAuthenticatedUser(),
    });

    // Assert
    expect(mockedUseGetUsersDirectoryQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        limit: 10,
        skillIds: expect.arrayContaining([SKILL_ID_1, SKILL_ID_2]),
      })
    );
    const firstCallArg = mockedUseGetUsersDirectoryQuery.mock.calls[0]?.[0] as
      | UsersDirectoryQueryArgs
      | undefined;
    expect(firstCallArg?.skillIds).toHaveLength(2);
  });
});
