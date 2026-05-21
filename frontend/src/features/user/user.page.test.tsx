import { screen } from "@testing-library/react";
import { href, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { useGetUserProfileProjectsQuery } from "./api/user-profile-projects.api";
import type { UserProfileProjectsQueryArgs } from "./api/user-profile-projects.api";
import { Component as UserPage } from "./user.page";

import { displayPublicName } from "@/features/auth";
import { useGetUserByIdQuery } from "@/features/auth/api/auth.api";
import type { User } from "@/features/auth/lib/types";
import "@/features/auth/api/auth.api";
import "@/features/user/api/user-profile-projects.api";
import {
  useFollowUserMutation,
  useUnfollowUserMutation,
} from "@/features/follow/api/follow.api";
import {
  useCancelApplicationMutation,
  useGetManagedProjectsListQuery,
  useInviteUserToProjectMutation,
} from "@/features/projects/api/projects.api";
import type {
  ManagedProjectListItem,
  ManagedProjectsListQuery,
  ProjectListItem,
} from "@/features/projects/model/types";
import "@/features/follow/api/follow.api";
import "@/features/projects/api/projects.api";
import { renderWithProviders } from "@/shared/lib/test/render-with-providers";
import { ROUTES } from "@/shared/model/routes";

const CURRENT_USER_ID = "507f1f77bcf86cd799439099";
const OTHER_USER_ID = "507f1f77bcf86cd7994390aa";
const PROJECT_ID = "6a04cae90445f0b3a1d38699";
const APPLICATION_ID = "6a04cae90445f0b3a1d38601";
const MANAGED_PROJECT_TITLE = "Дипломный проект для приглашения";

const FOLLOWERS_STUB_TEXT = "Страница подписчиков (тест)";
const FOLLOWING_STUB_TEXT = "Страница подписок (тест)";
const PROJECT_DETAILS_STUB_TEXT = "Страница проекта (тест)";

const FOLLOWERS_COUNT = 12;
const FOLLOWING_COUNT = 7;

vi.mock("@/shared/lib/react/use-debounced-value", () => ({
  useDebouncedValue: <T,>(value: T) => value,
}));

vi.mock("@/features/auth/api/auth.api", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/features/auth/api/auth.api")>();

  return {
    ...actual,
    useGetUserByIdQuery: vi.fn(),
  };
});

vi.mock("./api/user-profile-projects.api", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("./api/user-profile-projects.api")>();

  return {
    ...actual,
    useGetUserProfileProjectsQuery: vi.fn(),
  };
});

vi.mock("@/features/projects/api/projects.api", async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import("@/features/projects/api/projects.api")
    >();

  return {
    ...actual,
    useGetManagedProjectsListQuery: vi.fn(),
    useInviteUserToProjectMutation: vi.fn(),
    useCancelApplicationMutation: vi.fn(),
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

const mockedUseGetUserByIdQuery = vi.mocked(useGetUserByIdQuery);
const mockedUseGetUserProfileProjectsQuery = vi.mocked(
  useGetUserProfileProjectsQuery
);
const mockedUseGetManagedProjectsListQuery = vi.mocked(
  useGetManagedProjectsListQuery
);
const mockedUseInviteUserToProjectMutation = vi.mocked(
  useInviteUserToProjectMutation
);
const mockedUseCancelApplicationMutation = vi.mocked(
  useCancelApplicationMutation
);
const mockedUseFollowUserMutation = vi.mocked(useFollowUserMutation);
const mockedUseUnfollowUserMutation = vi.mocked(useUnfollowUserMutation);

const mockFollowUser = vi.fn();
const mockUnfollowUser = vi.fn();
const mockInviteUser = vi.fn();
const mockCancelApplication = vi.fn();

class MockIntersectionObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();

  constructor(_cb: IntersectionObserverCallback) {
    void _cb;
  }
}

function stubRadixDomApis() {
  HTMLElement.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.releasePointerCapture = vi.fn();
  Element.prototype.scrollIntoView = vi.fn();
}

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

function makeOtherProfileUser(): User {
  return {
    id: OTHER_USER_ID,
    email: "petr@example.com",
    firstName: "Пётр",
    lastName: "Петров",
    patronymic: null,
    avatarUrl: null,
    bio: "Ищу проект для стажировки.",
    dateOfBirth: null,
    createdAt: "2026-02-01T00:00:00.000Z",
    isFollowing: false,
    followersCount: 3,
    followingCount: 5,
    skills: [{ id: "507f1f77bcf86cd799439013", name: "Python" }],
  };
}

function makeProfileUser(): User {
  return {
    ...makeAuthenticatedUser(),
    bio: "Студентка, ищу команду для диплома.",
    contacts: ["@maria_socpro", "maria@uni.example"],
    university: "МГУ",
    faculty: "ВМК",
    course: "4",
    resumeUrl: "/uploads/resume.pdf",
    resumeOriginalName: "resume.pdf",
    followersCount: FOLLOWERS_COUNT,
    followingCount: FOLLOWING_COUNT,
    skills: [
      { id: "507f1f77bcf86cd799439011", name: "React" },
      { id: "507f1f77bcf86cd799439012", name: "TypeScript" },
    ],
  };
}

function makeManagedProjectListItem(
  overrides: Partial<ManagedProjectListItem> &
    Pick<ManagedProjectListItem, "title">
): ManagedProjectListItem {
  return {
    ...makeProjectListItem({
      id: PROJECT_ID,
      title: overrides.title ?? MANAGED_PROJECT_TITLE,
      ...overrides,
    }),
    inviteeApplication: null,
    inviteeIsMember: false,
    ...overrides,
  };
}

function makeProjectListItem(
  overrides: Partial<ProjectListItem> & Pick<ProjectListItem, "title">
): ProjectListItem {
  const owner = makeAuthenticatedUser();

  return {
    id: PROJECT_ID,
    title: overrides.title,
    description: "Описание проекта для тестовой карточки.",
    goals: "Цели проекта для теста.",
    status: "OPEN",
    acceptingApplications: true,
    statusUpdatedAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    owner,
    requiredSkills: [],
    _count: { members: 2, applications: 0, attachments: 0 },
    ...overrides,
  };
}

function makeGetUserByIdQueryResult(
  user: User | undefined
): ReturnType<typeof useGetUserByIdQuery> {
  return {
    data: user,
    isLoading: false,
    isFetching: false,
    error: undefined,
    refetch: vi.fn(),
  } as ReturnType<typeof useGetUserByIdQuery>;
}

function makeGetUserProfileProjectsQueryResult(data: {
  items: ProjectListItem[];
  nextCursor: string | null;
}): ReturnType<typeof useGetUserProfileProjectsQuery> {
  return {
    data,
    isLoading: false,
    isFetching: false,
    error: undefined,
    refetch: vi.fn(),
  } as ReturnType<typeof useGetUserProfileProjectsQuery>;
}

function mockProfileUserLoaded() {
  mockedUseGetUserByIdQuery.mockImplementation((userId: string) =>
    makeGetUserByIdQueryResult(
      userId === CURRENT_USER_ID ? makeProfileUser() : undefined
    )
  );
}

function mockOtherAndOwnProfileUsersLoaded() {
  mockedUseGetUserByIdQuery.mockImplementation((userId: string) => {
    if (userId === CURRENT_USER_ID) {
      return makeGetUserByIdQueryResult(makeProfileUser());
    }

    if (userId === OTHER_USER_ID) {
      return makeGetUserByIdQueryResult(makeOtherProfileUser());
    }

    return makeGetUserByIdQueryResult(undefined);
  });
}

function makeGetManagedProjectsListQueryResult(data: {
  items: ManagedProjectListItem[];
  nextCursor: string | null;
}): ReturnType<typeof useGetManagedProjectsListQuery> {
  return {
    data,
    currentData: data,
    isLoading: false,
    isFetching: false,
    error: undefined,
    refetch: vi.fn(),
  } as ReturnType<typeof useGetManagedProjectsListQuery>;
}

function mockManagedProjectsEmpty() {
  mockedUseGetManagedProjectsListQuery.mockImplementation(() =>
    makeGetManagedProjectsListQueryResult({ items: [], nextCursor: null })
  );
}

function mockManagedProjectsWith(items: ManagedProjectListItem[]) {
  mockedUseGetManagedProjectsListQuery.mockImplementation(
    (args: ManagedProjectsListQuery) => {
      if (args.inviteeId !== OTHER_USER_ID) {
        return makeGetManagedProjectsListQueryResult({
          items: [],
          nextCursor: null,
        });
      }

      return makeGetManagedProjectsListQueryResult({
        items,
        nextCursor: null,
      });
    }
  );
}

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

function setupInviteMutationMock() {
  mockedUseInviteUserToProjectMutation.mockReturnValue([
    mockInviteUser.mockReturnValue({
      unwrap: () => Promise.resolve({ id: APPLICATION_ID }),
    }),
    { isLoading: false, reset: vi.fn() },
  ] as unknown as ReturnType<typeof useInviteUserToProjectMutation>);
}

function setupCancelApplicationMutationMock() {
  mockedUseCancelApplicationMutation.mockReturnValue([
    mockCancelApplication.mockReturnValue({
      unwrap: () => Promise.resolve({ message: "Заявка отозвана" }),
    }),
    { isLoading: false, reset: vi.fn() },
  ] as unknown as ReturnType<typeof useCancelApplicationMutation>);
}

function mockProfileProjects(items: ProjectListItem[]) {
  mockedUseGetUserProfileProjectsQuery.mockImplementation(() =>
    makeGetUserProfileProjectsQueryResult({ items, nextCursor: null })
  );
}

function mockProfileProjectsEmpty() {
  mockProfileProjects([]);
}

const ownProfileRoute = href(ROUTES.USER_DETAILS, { userId: CURRENT_USER_ID });
const otherProfileRoute = href(ROUTES.USER_DETAILS, { userId: OTHER_USER_ID });

function renderUserProfileRoutes(
  initialEntries: string | string[],
  authenticatedUser: User
) {
  const entries = Array.isArray(initialEntries)
    ? initialEntries
    : [initialEntries];

  return renderWithProviders(
    <Routes>
      <Route path={ROUTES.USER_DETAILS} element={<UserPage />} />
      <Route
        path={ROUTES.FOLLOWERS}
        element={<div>{FOLLOWERS_STUB_TEXT}</div>}
      />
      <Route
        path={ROUTES.FOLLOWING}
        element={<div>{FOLLOWING_STUB_TEXT}</div>}
      />
      <Route
        path={ROUTES.PROJECT_DETAILS}
        element={<div>{PROJECT_DETAILS_STUB_TEXT}</div>}
      />
    </Routes>,
    {
      initialEntries: entries,
      authenticatedUser,
    }
  );
}

function renderOwnProfilePage(
  initialEntries: string | string[] = ownProfileRoute
) {
  const entries = Array.isArray(initialEntries)
    ? initialEntries
    : [initialEntries];

  return renderUserProfileRoutes(entries, makeAuthenticatedUser());
}

function renderOtherProfilePage(
  initialEntries: string | string[] = otherProfileRoute
) {
  const entries = Array.isArray(initialEntries)
    ? initialEntries
    : [initialEntries];

  return renderUserProfileRoutes(entries, makeAuthenticatedUser());
}

async function expandProfileProjects(
  user: ReturnType<typeof renderWithProviders>["user"]
) {
  await user.click(
    screen.getByRole("button", { name: "Показать проекты в участии" })
  );
  await screen.findByLabelText("Поиск проектов пользователя по названию");
}

describe("UserPage (свой профиль)", () => {
  beforeEach(() => {
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
    vi.clearAllMocks();
    stubRadixDomApis();
    mockProfileUserLoaded();
    mockProfileProjectsEmpty();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  test("показывает карточку профиля со всеми секциями и кнопкой редактирования", () => {
    // Arrange
    const profile = makeProfileUser();

    // Act
    renderOwnProfilePage();

    // Assert
    expect(
      screen.getByRole("heading", { name: displayPublicName(profile) })
    ).toBeInTheDocument();
    expect(screen.getByText("Навыки")).toBeInTheDocument();
    expect(screen.getByText("React")).toBeInTheDocument();
    expect(screen.getByText("TypeScript")).toBeInTheDocument();
    expect(screen.getByText("Контакты")).toBeInTheDocument();
    expect(screen.getByText("@maria_socpro")).toBeInTheDocument();
    expect(screen.getByText("О себе")).toBeInTheDocument();
    expect(screen.getByText(profile.bio!)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "resume.pdf" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Редактировать профиль" })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Подписаться" })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Отписаться" })
    ).not.toBeInTheDocument();
  });

  test("ссылки подписчиков и подписок ведут на страницы списков пользователя", () => {
    // Arrange
    mockProfileUserLoaded();

    // Act
    renderOwnProfilePage();

    // Assert
    expect(
      screen.getByRole("link", { name: `Подписчики: ${FOLLOWERS_COUNT}` })
    ).toHaveAttribute(
      "href",
      href(ROUTES.FOLLOWERS, { userId: CURRENT_USER_ID })
    );
    expect(
      screen.getByRole("link", { name: `Подписок: ${FOLLOWING_COUNT}` })
    ).toHaveAttribute(
      "href",
      href(ROUTES.FOLLOWING, { userId: CURRENT_USER_ID })
    );
  });

  test("при клике на подписчиков открывает страницу подписчиков", async () => {
    // Arrange
    const { user } = renderOwnProfilePage();

    // Act
    await user.click(
      screen.getByRole("link", { name: `Подписчики: ${FOLLOWERS_COUNT}` })
    );

    // Assert
    expect(screen.getByText(FOLLOWERS_STUB_TEXT)).toBeInTheDocument();
  });

  test("при клике на подписки открывает страницу подписок", async () => {
    // Arrange
    const { user } = renderOwnProfilePage();

    // Act
    await user.click(
      screen.getByRole("link", { name: `Подписок: ${FOLLOWING_COUNT}` })
    );

    // Assert
    expect(screen.getByText(FOLLOWING_STUB_TEXT)).toBeInTheDocument();
  });

  test("раскрывает блок проектов в участии и запрашивает список у API", async () => {
    // Arrange
    const { user } = renderOwnProfilePage();
    expect(mockedUseGetUserProfileProjectsQuery).not.toHaveBeenCalled();

    // Act
    await expandProfileProjects(user);

    // Assert
    expect(
      screen.getByRole("heading", { name: "Проекты в участии" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("checkbox", {
        name: "Только проекты, где пользователь — автор",
      })
    ).toBeInTheDocument();
    expect(mockedUseGetUserProfileProjectsQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: CURRENT_USER_ID,
        limit: 10,
      })
    );
  });

  test("скрывает блок проектов в участии после повторного клика", async () => {
    // Arrange
    const { user } = renderOwnProfilePage();
    await expandProfileProjects(user);

    // Act
    await user.click(
      screen.getByRole("button", { name: "Скрыть проекты в участии" })
    );

    // Assert
    expect(
      screen.queryByLabelText("Поиск проектов пользователя по названию")
    ).not.toBeInTheDocument();
  });

  test("передаёт поиск по названию проекта в API", async () => {
    // Arrange
    const { user } = renderOwnProfilePage();
    await expandProfileProjects(user);

    // Act
    await user.type(
      screen.getByLabelText("Поиск проектов пользователя по названию"),
      "диплом"
    );

    // Assert
    await vi.waitFor(() => {
      expect(mockedUseGetUserProfileProjectsQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: CURRENT_USER_ID,
          q: "диплом",
          limit: 10,
        } satisfies Partial<UserProfileProjectsQueryArgs>)
      );
    });
  });

  test("передаёт фильтр «только автор» в API", async () => {
    // Arrange
    const { user } = renderOwnProfilePage();
    await expandProfileProjects(user);

    // Act
    await user.click(
      screen.getByRole("checkbox", {
        name: "Только проекты, где пользователь — автор",
      })
    );

    // Assert
    expect(mockedUseGetUserProfileProjectsQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: CURRENT_USER_ID,
        authorOnly: true,
        limit: 10,
      })
    );
  });

  test("показывает карточку проекта и переходит на страницу проекта по клику на название", async () => {
    // Arrange
    const projectTitle = "Дипломный проект SocPro";
    mockProfileProjects([
      makeProjectListItem({ id: PROJECT_ID, title: projectTitle }),
    ]);
    const { user } = renderOwnProfilePage();
    await expandProfileProjects(user);

    const projectLink = screen.getByRole("link", { name: projectTitle });
    expect(projectLink).toHaveAttribute(
      "href",
      href(ROUTES.PROJECT_DETAILS, { id: PROJECT_ID })
    );

    // Act
    await user.click(projectLink);

    // Assert
    expect(screen.getByText(PROJECT_DETAILS_STUB_TEXT)).toBeInTheDocument();
  });
});

describe("UserPage (чужой профиль)", () => {
  beforeEach(() => {
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
    vi.clearAllMocks();
    stubRadixDomApis();
    mockOtherAndOwnProfileUsersLoaded();
    mockProfileProjectsEmpty();
    mockManagedProjectsEmpty();
    setupFollowMutationMocks();
    setupInviteMutationMock();
    setupCancelApplicationMutationMock();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  test("не показывает редактирование, показывает подписку и скрывает заявки без управляемых проектов", () => {
    // Arrange
    const otherProfile = makeOtherProfileUser();

    // Act
    renderOtherProfilePage();

    // Assert
    expect(
      screen.getByRole("heading", { name: displayPublicName(otherProfile) })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Редактировать профиль" })
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Подписаться" })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Заявки" })
    ).not.toBeInTheDocument();
  });

  test("показывает кнопку заявок при управляемых проектах автора или администратора", () => {
    // Arrange
    mockManagedProjectsWith([
      makeManagedProjectListItem({
        title: MANAGED_PROJECT_TITLE,
        inviteeApplication: null,
        inviteeIsMember: false,
        acceptingApplications: true,
      }),
    ]);

    // Act
    renderOtherProfilePage();

    // Assert
    expect(screen.getByRole("button", { name: "Заявки" })).toBeInTheDocument();
  });

  test("отправляет приглашение в проект пользователю", async () => {
    // Arrange
    mockManagedProjectsWith([
      makeManagedProjectListItem({
        title: MANAGED_PROJECT_TITLE,
        inviteeApplication: null,
        inviteeIsMember: false,
        acceptingApplications: true,
      }),
    ]);
    const { user } = renderOtherProfilePage();

    // Act
    await user.click(screen.getByRole("button", { name: "Заявки" }));
    await user.click(await screen.findByRole("button", { name: "Пригласить" }));
    await user.click(screen.getByRole("button", { name: "Отправить" }));

    // Assert
    await vi.waitFor(() => {
      expect(mockInviteUser).toHaveBeenCalledWith({
        projectId: PROJECT_ID,
        inviteeId: OTHER_USER_ID,
        body: { message: undefined },
      });
    });
    expect(
      screen.queryByRole("button", { name: "Отправить" })
    ).not.toBeInTheDocument();
  });

  test("отзывает отправленное приглашение в проект", async () => {
    // Arrange
    mockManagedProjectsWith([
      makeManagedProjectListItem({
        title: MANAGED_PROJECT_TITLE,
        inviteeApplication: {
          id: APPLICATION_ID,
          status: "PENDING",
          invitedById: CURRENT_USER_ID,
        },
        inviteeIsMember: false,
        acceptingApplications: true,
      }),
    ]);
    const { user } = renderOtherProfilePage();

    // Act
    await user.click(screen.getByRole("button", { name: "Заявки" }));
    await user.click(
      await screen.findByRole("button", { name: "Отозвать приглашение" })
    );
    await user.click(screen.getByRole("button", { name: "Да, отозвать" }));

    // Assert
    await vi.waitFor(() => {
      expect(mockCancelApplication).toHaveBeenCalledWith({
        applicationId: APPLICATION_ID,
        projectId: PROJECT_ID,
        managedInviteeId: OTHER_USER_ID,
      });
    });
    expect(
      screen.queryByRole("button", { name: "Да, отозвать" })
    ).not.toBeInTheDocument();
  });
});
