import { screen } from "@testing-library/react";
import { href, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import {
  useAcceptProjectInvitationMutation,
  useApplyToProjectMutation,
  useCancelApplicationMutation,
  useGetProjectByIdQuery,
  useGetProjectMembersQuery,
  useRemoveProjectMemberMutation,
  useUpdateProjectMemberRoleMutation,
} from "./api/projects.api";
import type { ProjectDetail, ProjectMemberRow } from "./model/types";
import { Component as ProjectDetailPage } from "./project-detail.page";

import type { User } from "@/features/auth/lib/types";
import { renderWithProviders } from "@/shared/lib/test/render-with-providers";
import { ROUTES } from "@/shared/model/routes";

vi.mock("@/shared/lib/react/use-debounced-value", () => ({
  useDebouncedValue: <T,>(value: T) => value,
}));

vi.mock("./api/projects.api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./api/projects.api")>();

  return {
    ...actual,
    useGetProjectByIdQuery: vi.fn(),
    useApplyToProjectMutation: vi.fn(),
    useCancelApplicationMutation: vi.fn(),
    useAcceptProjectInvitationMutation: vi.fn(),
    useGetProjectMembersQuery: vi.fn(),
    useRemoveProjectMemberMutation: vi.fn(),
    useUpdateProjectMemberRoleMutation: vi.fn(),
  };
});

const mockedUseGetProjectByIdQuery = vi.mocked(useGetProjectByIdQuery);
const mockedUseApplyToProjectMutation = vi.mocked(useApplyToProjectMutation);
const mockedUseCancelApplicationMutation = vi.mocked(
  useCancelApplicationMutation
);
const mockedUseAcceptProjectInvitationMutation = vi.mocked(
  useAcceptProjectInvitationMutation
);
const mockedUseGetProjectMembersQuery = vi.mocked(useGetProjectMembersQuery);
const mockedUseRemoveProjectMemberMutation = vi.mocked(
  useRemoveProjectMemberMutation
);
const mockedUseUpdateProjectMemberRoleMutation = vi.mocked(
  useUpdateProjectMemberRoleMutation
);

const VISITOR_USER_ID = "507f1f77bcf86cd799439088";
const OWNER_USER_ID = "507f1f77bcf86cd799439099";
const PROJECT_ID = "6a04cae90445f0b3a1d386aa";
const MEMBER_ROW_ID = "507f1f77bcf86cd799439081";
const APPLICATION_ID = "507f1f77bcf86cd799439077";

function makeUser(overrides: Partial<User>): User {
  return {
    id: OWNER_USER_ID,
    email: "owner@example.com",
    firstName: "Алексей",
    lastName: "Соколов",
    patronymic: null,
    avatarUrl: null,
    bio: null,
    dateOfBirth: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeVisitorUser(): User {
  return makeUser({
    id: VISITOR_USER_ID,
    email: "visitor@example.com",
    firstName: "Олег",
    lastName: "Новиков",
  });
}

function makeOwnerMemberRow(owner: User): ProjectMemberRow {
  return {
    id: MEMBER_ROW_ID,
    userId: owner.id,
    role: "OWNER",
    joinedAt: "2026-01-01T00:00:00.000Z",
    user: owner,
  };
}

/** Чужой проект: текущий пользователь не владелец и не админ участников. */
function makeForeignProjectDetail(
  overrides?: Partial<ProjectDetail>
): ProjectDetail {
  const owner = makeUser({
    id: OWNER_USER_ID,
    firstName: "Алексей",
    lastName: "Соколов",
  });

  return {
    id: PROJECT_ID,
    title: "Дипломный кейс коллектива",
    description: "Описание доступно гостям на вкладке «Обзор».",
    goals: "Цели проекта описаны здесь же.",
    status: "OPEN",
    acceptingApplications: true,
    statusUpdatedAt: "2026-02-01T12:00:00.000Z",
    createdAt: "2026-01-01T10:00:00.000Z",
    updatedAt: "2026-02-02T14:30:00.000Z",
    owner,
    requiredSkills: [{ id: "507f1f77bcf86cd799439066", name: "TypeScript" }],
    members: [makeOwnerMemberRow(owner)],
    isOwner: false,
    isMember: false,
    myApplication: null,
    applications: [],
    attachments: [],
    ...overrides,
  };
}

function makeGetProjectByIdSuccess(
  project: ProjectDetail
): ReturnType<typeof useGetProjectByIdQuery> {
  return {
    data: project,
    isLoading: false,
    isError: false,
    error: undefined,
    refetch: vi.fn(),
  } as ReturnType<typeof useGetProjectByIdQuery>;
}

function stubNoNetworkFetchForRefetchTriggers() {
  vi.stubGlobal(
    "fetch",
    vi.fn(() =>
      Promise.resolve(
        new Response(JSON.stringify({ error: "Не для unit-теста" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        })
      )
    )
  );
}

class MockIntersectionObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();

  constructor(cb: IntersectionObserverCallback) {
    void cb;
  }
}

function stubRadixDomApis() {
  HTMLElement.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.releasePointerCapture = vi.fn();
  Element.prototype.scrollIntoView = vi.fn();
}

function renderProjectDetail(authenticatedUser = makeVisitorUser()) {
  const route = href(ROUTES.PROJECT_DETAILS, { id: PROJECT_ID });

  return renderWithProviders(
    <Routes>
      <Route path={ROUTES.PROJECT_DETAILS} element={<ProjectDetailPage />} />
    </Routes>,
    { initialEntries: [route], authenticatedUser }
  );
}

function setupDefaultMutationMocks() {
  mockedUseApplyToProjectMutation.mockReturnValue([
    vi.fn(() => ({
      unwrap: () => Promise.resolve({ id: APPLICATION_ID, status: "PENDING" }),
    })),
    { isLoading: false, reset: vi.fn() },
  ] as unknown as ReturnType<typeof useApplyToProjectMutation>);

  mockedUseCancelApplicationMutation.mockReturnValue([
    vi.fn(() => ({
      unwrap: () => Promise.resolve({ message: "OK" }),
    })),
    { isLoading: false, reset: vi.fn() },
  ] as unknown as ReturnType<typeof useCancelApplicationMutation>);

  mockedUseAcceptProjectInvitationMutation.mockReturnValue([
    vi.fn(),
    { isLoading: false, reset: vi.fn() },
  ] as unknown as ReturnType<typeof useAcceptProjectInvitationMutation>);

  mockedUseRemoveProjectMemberMutation.mockReturnValue([
    vi.fn(),
    { isLoading: false, reset: vi.fn() },
  ] as unknown as ReturnType<typeof useRemoveProjectMemberMutation>);

  mockedUseUpdateProjectMemberRoleMutation.mockReturnValue([
    vi.fn(),
    { isLoading: false, reset: vi.fn() },
  ] as unknown as ReturnType<typeof useUpdateProjectMemberRoleMutation>);

  mockedUseGetProjectMembersQuery.mockReturnValue({
    data: {
      items: [],
      total: 0,
      take: 10,
      skip: 0,
    },
    isLoading: false,
    isFetching: false,
    error: undefined,
    refetch: vi.fn(),
  } as unknown as ReturnType<typeof useGetProjectMembersQuery>);
}

describe("ProjectDetailPage — гость (не владелец и не админ)", () => {
  beforeEach(() => {
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
    stubRadixDomApis();
    stubNoNetworkFetchForRefetchTriggers();
    setupDefaultMutationMocks();

    mockedUseGetProjectByIdQuery.mockImplementation(
      (arg: string | undefined) => {
        const idArg = typeof arg === "string" ? arg : undefined;

        return idArg === PROJECT_ID
          ? makeGetProjectByIdSuccess(makeForeignProjectDetail())
          : ({
              data: undefined,
              isLoading: false,
              isError: false,
              error: undefined,
              refetch: vi.fn(),
            } as ReturnType<typeof useGetProjectByIdQuery>);
      }
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  test("видит вкладки «Обзор» и «Участники», без «Заявок» и «Настройки»", () => {
    // Arrange
    mockedUseGetProjectByIdQuery.mockImplementation(() =>
      makeGetProjectByIdSuccess(makeForeignProjectDetail())
    );

    // Act
    renderProjectDetail();

    // Assert
    expect(screen.getByRole("button", { name: "Обзор" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Участники" })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /^Заявки/ })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Настройки" })
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /Дипломный кейс/ })
    ).toBeInTheDocument();
  });

  test("переходит на «Обзор» и «Участники» и показывает контент разделов", async () => {
    // Arrange
    const owner = makeUser({
      id: OWNER_USER_ID,
      firstName: "Алексей",
      lastName: "Соколов",
    });
    const memberRow = makeOwnerMemberRow(owner);

    mockedUseGetProjectByIdQuery.mockImplementation(() =>
      makeGetProjectByIdSuccess(makeForeignProjectDetail())
    );

    mockedUseGetProjectMembersQuery.mockImplementation(() => ({
      data: {
        items: [memberRow],
        total: 1,
        take: 10,
        skip: 0,
      },
      isLoading: false,
      isFetching: false,
      error: undefined,
      refetch: vi.fn(),
    }));

    const { user } = renderProjectDetail();

    // Act — обзор (по умолчанию)
    // Assert обзора
    expect(
      screen.getByRole("heading", { name: "Описание" })
    ).toBeInTheDocument();
    expect(screen.getByText(/Описание доступно гостям/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Участники" }));

    // Assert — участники
    expect(
      screen.getByRole("heading", { name: "Участники" })
    ).toBeInTheDocument();
    const ownerLinks = screen.getAllByRole("link", {
      name: "Алексей Соколов",
    });
    const ownerHref = href(ROUTES.USER_DETAILS, { userId: OWNER_USER_ID });
    expect(ownerLinks.some((a) => a.getAttribute("href") === ownerHref)).toBe(
      true
    );
    expect(
      screen.queryByRole("button", { name: "Исключить" })
    ).not.toBeInTheDocument();
  });

  test("подаёт заявку через диалог «Отправить»", async () => {
    // Arrange
    const mockApply = vi.fn(
      () =>
        ({
          unwrap: () =>
            Promise.resolve({ id: APPLICATION_ID, status: "PENDING" }),
        }) as unknown as ReturnType<
          ReturnType<typeof useApplyToProjectMutation>[0]
        >
    );

    mockedUseApplyToProjectMutation.mockReturnValue([
      mockApply,
      { isLoading: false, reset: vi.fn() },
    ] as unknown as ReturnType<typeof useApplyToProjectMutation>);

    const { user } = renderProjectDetail();

    // Act
    await user.click(screen.getByRole("button", { name: "Подать заявку" }));

    await user.click(screen.getByRole("button", { name: "Отправить" }));

    // Assert
    await vi.waitFor(() => {
      expect(mockApply).toHaveBeenCalledTimes(1);
    });
    expect(mockApply).toHaveBeenCalledWith({
      projectId: PROJECT_ID,
      body: {},
    });
  });

  test("отзывает собственную ожидающую заявку («Отозвать»)", async () => {
    // Arrange
    const mockCancel = vi.fn(
      () =>
        ({
          unwrap: () => Promise.resolve({ message: "OK" }),
        }) as unknown as ReturnType<
          ReturnType<typeof useCancelApplicationMutation>[0]
        >
    );

    mockedUseCancelApplicationMutation.mockReturnValue([
      mockCancel,
      { isLoading: false, reset: vi.fn() },
    ] as unknown as ReturnType<typeof useCancelApplicationMutation>);

    mockedUseGetProjectByIdQuery.mockImplementation(() =>
      makeGetProjectByIdSuccess(
        makeForeignProjectDetail({
          myApplication: {
            id: APPLICATION_ID,
            status: "PENDING",
            createdAt: "2026-02-03T09:00:00.000Z",
            invitedById: null,
            invitedBy: null,
          },
        })
      )
    );

    const { user } = renderProjectDetail();

    // Act
    await user.click(screen.getByRole("button", { name: "Отозвать заявку" }));
    await user.click(screen.getByRole("button", { name: "Да, отозвать" }));

    // Assert
    await vi.waitFor(() => {
      expect(mockCancel).toHaveBeenCalledTimes(1);
    });
    expect(mockCancel).toHaveBeenCalledWith({
      applicationId: APPLICATION_ID,
      projectId: PROJECT_ID,
    });
  });
});
