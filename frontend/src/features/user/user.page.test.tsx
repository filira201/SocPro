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
import type { ProjectListItem } from "@/features/projects/model/types";
import { renderWithProviders } from "@/shared/lib/test/render-with-providers";
import { ROUTES } from "@/shared/model/routes";

const CURRENT_USER_ID = "507f1f77bcf86cd799439099";
const PROJECT_ID = "6a04cae90445f0b3a1d38699";

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

const mockedUseGetUserByIdQuery = vi.mocked(useGetUserByIdQuery);
const mockedUseGetUserProfileProjectsQuery = vi.mocked(
  useGetUserProfileProjectsQuery
);

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

function mockProfileProjects(items: ProjectListItem[]) {
  mockedUseGetUserProfileProjectsQuery.mockImplementation(() =>
    makeGetUserProfileProjectsQueryResult({ items, nextCursor: null })
  );
}

function mockProfileProjectsEmpty() {
  mockProfileProjects([]);
}

const ownProfileRoute = href(ROUTES.USER_DETAILS, { userId: CURRENT_USER_ID });

function renderOwnProfilePage(
  initialEntries: string | string[] = ownProfileRoute
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
      authenticatedUser: makeAuthenticatedUser(),
    }
  );
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
