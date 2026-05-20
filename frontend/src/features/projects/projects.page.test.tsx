import { screen } from "@testing-library/react";
import { href } from "react-router";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { useGetProjectsListQuery } from "./api/projects.api";
import type { ProjectListItem, ProjectsListQuery } from "./model/types";
import { Component as ProjectsPage } from "./projects.page";

import type { User } from "@/features/auth/lib/types";
import { renderWithProviders } from "@/shared/lib/test/render-with-providers";
import { ROUTES } from "@/shared/model/routes";

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

vi.mock("./api/projects.api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./api/projects.api")>();

  return {
    ...actual,
    useGetProjectsListQuery: vi.fn(),
  };
});

const mockedUseGetProjectsListQuery = vi.mocked(useGetProjectsListQuery);

const NEXT_CURSOR = "cursor-projects-page-2";

const CURRENT_USER_ID = "507f1f77bcf86cd799439099";
const OTHER_OWNER_ID = "507f1f77bcf86cd799439011";

const SKILL_ID_1 = "507f1f77bcf86cd799439012";
const SKILL_ID_2 = "507f1f77bcf86cd799439013";

const PROJECT_1_ID = "6a04cae90445f0b3a1d38610";
const PROJECT_2_ID = "6a04cae90445f0b3a1d38611";

let intersectionCallback: IntersectionObserverCallback;

class MockIntersectionObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();

  constructor(cb: IntersectionObserverCallback) {
    intersectionCallback = cb;
  }
}

function triggerSentinelVisible() {
  intersectionCallback(
    [{ isIntersecting: true } as IntersectionObserverEntry],
    {} as IntersectionObserver
  );
}

function stubRadixDomApis() {
  HTMLElement.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.releasePointerCapture = vi.fn();
  Element.prototype.scrollIntoView = vi.fn();
}

function makeUser(overrides: Partial<User>): User {
  return {
    id: OTHER_OWNER_ID,
    email: "owner@example.com",
    firstName: "Иван",
    lastName: "Иванов",
    patronymic: null,
    avatarUrl: null,
    bio: null,
    dateOfBirth: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeProjectListItem(args: {
  id: string;
  title: string;
  owner: User;
  acceptingApplications?: boolean;
}): ProjectListItem {
  return {
    id: args.id,
    title: args.title,
    description: "Описание проекта для тестовой карточки.",
    goals: "Цели проекта для теста.",
    status: "OPEN",
    acceptingApplications: args.acceptingApplications ?? false,
    statusUpdatedAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    owner: args.owner,
    requiredSkills: [],
    _count: { members: 2, applications: 0, attachments: 0 },
  };
}

const OWNER_OTHER = makeUser({ id: OTHER_OWNER_ID });

const PAGE_1: ProjectListItem[] = [
  makeProjectListItem({
    id: PROJECT_1_ID,
    title: "Проект страница 1",
    owner: OWNER_OTHER,
    acceptingApplications: true,
  }),
];

const PAGE_2: ProjectListItem[] = [
  makeProjectListItem({
    id: PROJECT_2_ID,
    title: "Проект страница 2",
    owner: OWNER_OTHER,
  }),
];

function makeAuthenticatedUser(): User {
  return makeUser({
    id: CURRENT_USER_ID,
    email: "me@example.com",
    firstName: "Мария",
    lastName: "Иванова",
  });
}

function makeGetProjectsListQueryResult(data: {
  items: ProjectListItem[];
  nextCursor: string | null;
}): ReturnType<typeof useGetProjectsListQuery> {
  return {
    data,
    isLoading: false,
    isFetching: false,
    error: undefined,
    refetch: vi.fn(),
  } as ReturnType<typeof useGetProjectsListQuery>;
}

function mockProjectsFirstPageOnly() {
  mockedUseGetProjectsListQuery.mockImplementation(() =>
    makeGetProjectsListQueryResult({
      items: PAGE_1,
      nextCursor: null,
    })
  );
}

function mockProjectsFirstPageOnlyEmpty() {
  mockedUseGetProjectsListQuery.mockImplementation(() =>
    makeGetProjectsListQueryResult({
      items: [],
      nextCursor: null,
    })
  );
}

function mockProjectsWithPagination() {
  mockedUseGetProjectsListQuery.mockImplementation(
    (args?: ProjectsListQuery) => {
      const cursor = args?.cursor ?? null;

      if (!cursor) {
        return makeGetProjectsListQueryResult({
          items: PAGE_1,
          nextCursor: NEXT_CURSOR,
        });
      }

      return makeGetProjectsListQueryResult({
        items: [...PAGE_1, ...PAGE_2],
        nextCursor: null,
      });
    }
  );
}

describe("ProjectsPage", () => {
  beforeEach(() => {
    intersectionCallback = vi.fn();
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
    stubRadixDomApis();
    mockProjectsFirstPageOnly();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  test("показывает заголовок и карточки проектов первой страницы", () => {
    // Arrange
    mockProjectsFirstPageOnly();

    // Act
    renderWithProviders(<ProjectsPage />, {
      initialRoute: ROUTES.PROJECTS,
      authenticatedUser: makeAuthenticatedUser(),
    });

    // Assert
    expect(
      screen.getByRole("heading", { name: "Проекты" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Проект страница 1" })
    ).toHaveAttribute(
      "href",
      href(ROUTES.PROJECT_DETAILS, { id: PROJECT_1_ID })
    );
  });

  test("показывает бейдж «Мой проект», если автор совпадает с текущим пользователем", () => {
    // Arrange
    const mine = makeProjectListItem({
      id: PROJECT_1_ID,
      title: "Мой дипломный проект",
      owner: makeAuthenticatedUser(),
    });
    mockedUseGetProjectsListQuery.mockImplementation(() =>
      makeGetProjectsListQueryResult({ items: [mine], nextCursor: null })
    );

    // Act
    renderWithProviders(<ProjectsPage />, {
      initialRoute: ROUTES.PROJECTS,
      authenticatedUser: makeAuthenticatedUser(),
    });

    // Assert
    expect(screen.getByText("Мой проект")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Мой дипломный проект" })
    ).toBeInTheDocument();
  });

  test("показывает «Пока нет проектов», когда выдача пуста без фильтров", () => {
    // Arrange
    mockProjectsFirstPageOnlyEmpty();

    // Act
    renderWithProviders(<ProjectsPage />, {
      initialRoute: ROUTES.PROJECTS,
      authenticatedUser: makeAuthenticatedUser(),
    });

    // Assert
    expect(screen.getByText("Пока нет проектов")).toBeInTheDocument();
  });

  test("показывает «По заданным условиям проекты не найдены», когда есть фильтр и выдача пуста", () => {
    // Arrange
    mockProjectsFirstPageOnlyEmpty();

    // Act
    renderWithProviders(<ProjectsPage />, {
      initialEntries: [`${ROUTES.PROJECTS}?q=никого`],
      authenticatedUser: makeAuthenticatedUser(),
    });

    // Assert
    expect(
      screen.getByText("По заданным условиям проекты не найдены")
    ).toBeInTheDocument();
  });

  test("передаёт поиск по названию в API при вводе в поле поиска", async () => {
    // Arrange
    const { user } = renderWithProviders(<ProjectsPage />, {
      initialRoute: ROUTES.PROJECTS,
      authenticatedUser: makeAuthenticatedUser(),
    });

    // Act
    await user.type(
      screen.getByLabelText("Поиск проектов по названию"),
      "диплом"
    );

    // Assert
    await vi.waitFor(() => {
      expect(mockedUseGetProjectsListQuery).toHaveBeenCalledWith(
        expect.objectContaining({ q: "диплом", limit: 10 })
      );
    });
  });

  test("передаёт фильтр «только где я участник» в API", async () => {
    // Arrange
    const { user } = renderWithProviders(<ProjectsPage />, {
      initialRoute: ROUTES.PROJECTS,
      authenticatedUser: makeAuthenticatedUser(),
    });

    // Act
    await user.click(
      screen.getByRole("checkbox", {
        name: "Только проекты, где я участник",
      })
    );

    // Assert
    expect(mockedUseGetProjectsListQuery).toHaveBeenCalledWith(
      expect.objectContaining({ member: true, limit: 10 })
    );
  });

  test("передаёт фильтр «только с открытыми заявками» в API", async () => {
    // Arrange
    const { user } = renderWithProviders(<ProjectsPage />, {
      initialRoute: ROUTES.PROJECTS,
      authenticatedUser: makeAuthenticatedUser(),
    });

    // Act
    await user.click(
      screen.getByRole("checkbox", { name: "Только с открытыми заявками" })
    );

    // Assert
    expect(mockedUseGetProjectsListQuery).toHaveBeenCalledWith(
      expect.objectContaining({ acceptingApplications: true, limit: 10 })
    );
  });

  test("передаёт сортировку «сначала старые» в API", async () => {
    // Arrange
    const { user } = renderWithProviders(<ProjectsPage />, {
      initialRoute: ROUTES.PROJECTS,
      authenticatedUser: makeAuthenticatedUser(),
    });

    // Act
    await user.click(screen.getByRole("combobox"));
    await user.click(
      await screen.findByRole("option", { name: "Сначала старые" })
    );

    // Assert
    expect(mockedUseGetProjectsListQuery).toHaveBeenCalledWith(
      expect.objectContaining({ sort: "old", limit: 10 })
    );
  });

  test("передаёт выбранные навыки из URL в API", () => {
    // Arrange
    mockProjectsFirstPageOnly();

    // Act
    renderWithProviders(<ProjectsPage />, {
      initialEntries: [`${ROUTES.PROJECTS}?skills=${SKILL_ID_2},${SKILL_ID_1}`],
      authenticatedUser: makeAuthenticatedUser(),
    });

    // Assert
    expect(mockedUseGetProjectsListQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        limit: 10,
        skillIds: expect.arrayContaining([SKILL_ID_1, SKILL_ID_2]),
      })
    );
    const firstArg = mockedUseGetProjectsListQuery.mock.calls[0]?.[0] as
      | ProjectsListQuery
      | undefined;
    expect(firstArg?.skillIds).toHaveLength(2);
  });

  test("подгружает следующую страницу при появлении sentinel в viewport", async () => {
    // Arrange
    mockProjectsWithPagination();
    renderWithProviders(<ProjectsPage />, {
      initialRoute: ROUTES.PROJECTS,
      authenticatedUser: makeAuthenticatedUser(),
    });
    expect(
      screen.getByRole("link", { name: "Проект страница 1" })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Проект страница 2" })
    ).not.toBeInTheDocument();

    // Act
    triggerSentinelVisible();

    // Assert
    expect(
      await screen.findByRole("link", { name: "Проект страница 2" })
    ).toBeInTheDocument();
    expect(mockedUseGetProjectsListQuery).toHaveBeenCalledWith(
      expect.objectContaining({ cursor: NEXT_CURSOR, limit: 10 })
    );
  });
});
