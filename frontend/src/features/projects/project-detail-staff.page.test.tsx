import { screen, within } from "@testing-library/react";
import { href, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import {
  useCancelApplicationMutation,
  useDecideApplicationMutation,
  useDeleteProjectMutation,
  useGetProjectByIdQuery,
  useGetProjectMembersQuery,
  useRemoveProjectMemberMutation,
  useUpdateProjectMutation,
  useUpdateProjectMemberRoleMutation,
} from "./api/projects.api";
import type {
  ProjectApplication,
  ProjectDetail,
  ProjectMemberRow,
} from "./model/types";
import { Component as ProjectDetailPage } from "./project-detail.page";

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
    useGetProjectByIdQuery: vi.fn(),
    useGetProjectMembersQuery: vi.fn(),
    useUpdateProjectMutation: vi.fn(),
    useUpdateProjectMemberRoleMutation: vi.fn(),
    useRemoveProjectMemberMutation: vi.fn(),
    useDeleteProjectMutation: vi.fn(),
    useDecideApplicationMutation: vi.fn(),
    useCancelApplicationMutation: vi.fn(),
  };
});

const mockedUseGetProjectByIdQuery = vi.mocked(useGetProjectByIdQuery);
const mockedUseGetProjectMembersQuery = vi.mocked(useGetProjectMembersQuery);
const mockedUseUpdateProjectMutation = vi.mocked(useUpdateProjectMutation);
const mockedUseUpdateProjectMemberRoleMutation = vi.mocked(
  useUpdateProjectMemberRoleMutation
);
const mockedUseRemoveProjectMemberMutation = vi.mocked(
  useRemoveProjectMemberMutation
);
const mockedUseDeleteProjectMutation = vi.mocked(useDeleteProjectMutation);
const mockedUseDecideApplicationMutation = vi.mocked(
  useDecideApplicationMutation
);
const mockedUseCancelApplicationMutation = vi.mocked(
  useCancelApplicationMutation
);

const mockNavigate = vi.fn();

vi.mock("react-router", async (importOriginal) => {
  const mod = await importOriginal<typeof import("react-router")>();

  return {
    ...mod,
    useNavigate: () => mockNavigate,
  };
});

const PROJECT_ID = "6a04cae90445f0b3a1d386cc";
const OWNER_ID = "507f1f77bcf86cd799439011";
const PLAIN_MEMBER_ID = "507f1f77bcf86cd799439022";
const ADMIN_ROLE_USER_ID = "507f1f77bcf86cd799439033";
const APPLICANT_ID = "507f1f77bcf86cd799439044";
const APPLICATION_ROW_ID = "507f1f77bcf86cd799439055";

const ROW_OWNER = "507f1f77bcf86cd7994390a1";
const ROW_MEMBER = "507f1f77bcf86cd7994390a2";
const ROW_ADMIN = "507f1f77bcf86cd7994390a3";

function makeUser(overrides: Partial<User>): User {
  return {
    id: OWNER_ID,
    email: "o@example.com",
    firstName: "Елена",
    lastName: "Власова",
    patronymic: null,
    avatarUrl: null,
    bio: null,
    dateOfBirth: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function memberRow(args: {
  rowId: string;
  role: ProjectMemberRow["role"];
  user: User;
}): ProjectMemberRow {
  return {
    id: args.rowId,
    userId: args.user.id,
    role: args.role,
    joinedAt: "2026-01-01T00:00:00.000Z",
    user: args.user,
  };
}

function makePendingApplication(applicant: User): ProjectApplication {
  return {
    id: APPLICATION_ROW_ID,
    applicantId: applicant.id,
    projectId: PROJECT_ID,
    message: "Хочу в команду",
    status: "PENDING",
    createdAt: "2026-03-01T12:00:00.000Z",
    invitedById: null,
    invitedBy: null,
    applicant,
  };
}

function makeOwnerProjectDetail(
  overrides?: Partial<ProjectDetail>
): ProjectDetail {
  const owner = makeUser({
    id: OWNER_ID,
    firstName: "Елена",
    lastName: "Власова",
  });

  const applicant = makeUser({
    id: APPLICANT_ID,
    firstName: "Иван",
    lastName: "Петухов",
    email: "pet@example.com",
  });

  return {
    id: PROJECT_ID,
    title: "Проект владельца",
    description: "Описание.",
    goals: "Цели.",
    status: "OPEN",
    acceptingApplications: true,
    statusUpdatedAt: "2026-02-01T12:00:00.000Z",
    createdAt: "2026-01-01T10:00:00.000Z",
    owner,
    requiredSkills: [],
    members: [
      memberRow({ rowId: ROW_OWNER, role: "OWNER", user: owner }),
      memberRow({
        rowId: ROW_MEMBER,
        role: "MEMBER",
        user: makeUser({
          id: PLAIN_MEMBER_ID,
          firstName: "Пётр",
          lastName: "Сидоров",
          email: "p@example.com",
        }),
      }),
      memberRow({
        rowId: ROW_ADMIN,
        role: "ADMIN",
        user: makeUser({
          id: ADMIN_ROLE_USER_ID,
          firstName: "Марина",
          lastName: "Ким",
          email: "k@example.com",
        }),
      }),
    ],
    isOwner: true,
    isMember: true,
    myApplication: null,
    applications: [makePendingApplication(applicant)],
    attachments: [],
    ...overrides,
  };
}

function makeAdminViewerProjectDetail(): ProjectDetail {
  const owner = makeUser({
    id: OWNER_ID,
    firstName: "Елена",
    lastName: "Власова",
  });
  const adminUser = makeUser({
    id: ADMIN_ROLE_USER_ID,
    firstName: "Марина",
    lastName: "Ким",
    email: "k@example.com",
  });
  const applicant = makeUser({
    id: APPLICANT_ID,
    firstName: "Иван",
    lastName: "Петухов",
  });

  return {
    id: PROJECT_ID,
    title: "Проект с админом",
    description: "Описание.",
    goals: "Цели.",
    status: "OPEN",
    acceptingApplications: true,
    statusUpdatedAt: "2026-02-01T12:00:00.000Z",
    createdAt: "2026-01-01T10:00:00.000Z",
    owner,
    requiredSkills: [],
    members: [
      memberRow({ rowId: ROW_OWNER, role: "OWNER", user: owner }),
      memberRow({ rowId: ROW_ADMIN, role: "ADMIN", user: adminUser }),
      memberRow({
        rowId: ROW_MEMBER,
        role: "MEMBER",
        user: makeUser({
          id: PLAIN_MEMBER_ID,
          firstName: "Пётр",
          lastName: "Сидоров",
        }),
      }),
    ],
    isOwner: false,
    isMember: true,
    myApplication: null,
    applications: [makePendingApplication(applicant)],
    attachments: [],
  };
}

function makeQuerySuccess(project: ProjectDetail) {
  return {
    data: project,
    isLoading: false,
    isError: false,
    error: undefined,
    refetch: vi.fn(),
  } as ReturnType<typeof useGetProjectByIdQuery>;
}

function stubNoNetworkFetch() {
  vi.stubGlobal(
    "fetch",
    vi.fn(() =>
      Promise.resolve(
        new Response(JSON.stringify({ error: "mock" }), {
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

function mockMembersQueryResult(items: ProjectMemberRow[]) {
  return {
    data: {
      items,
      total: items.length,
      take: 10,
      skip: 0,
    },
    isLoading: false,
    isFetching: false,
    error: undefined,
    refetch: vi.fn(),
  } as unknown as ReturnType<typeof useGetProjectMembersQuery>;
}

function setupMutationDefaults() {
  mockedUseUpdateProjectMutation.mockReturnValue([
    vi.fn(() => ({
      unwrap: () => Promise.resolve({ id: PROJECT_ID }),
    })),
    { isLoading: false, reset: vi.fn() },
  ] as unknown as ReturnType<typeof useUpdateProjectMutation>);

  mockedUseUpdateProjectMemberRoleMutation.mockReturnValue([
    vi.fn(() => ({ unwrap: () => Promise.resolve({}) })),
    { isLoading: false, reset: vi.fn() },
  ] as unknown as ReturnType<typeof useUpdateProjectMemberRoleMutation>);

  mockedUseRemoveProjectMemberMutation.mockReturnValue([
    vi.fn(() => ({ unwrap: () => Promise.resolve({ message: "OK" }) })),
    { isLoading: false, reset: vi.fn() },
  ] as unknown as ReturnType<typeof useRemoveProjectMemberMutation>);

  mockedUseDeleteProjectMutation.mockReturnValue([
    vi.fn(() => ({ unwrap: () => Promise.resolve({ message: "OK" }) })),
    { isLoading: false, reset: vi.fn() },
  ] as unknown as ReturnType<typeof useDeleteProjectMutation>);

  mockedUseDecideApplicationMutation.mockReturnValue([
    vi.fn(() => ({ unwrap: () => Promise.resolve({}) })),
    { isLoading: false, reset: vi.fn() },
  ] as unknown as ReturnType<typeof useDecideApplicationMutation>);

  mockedUseCancelApplicationMutation.mockReturnValue([
    vi.fn(() => ({ unwrap: () => Promise.resolve({}) })),
    { isLoading: false, reset: vi.fn() },
  ] as unknown as ReturnType<typeof useCancelApplicationMutation>);
}

function renderDetail(authenticatedUser: User) {
  return renderWithProviders(
    <Routes>
      <Route path={ROUTES.PROJECT_DETAILS} element={<ProjectDetailPage />} />
    </Routes>,
    {
      initialEntries: [href(ROUTES.PROJECT_DETAILS, { id: PROJECT_ID })],
      authenticatedUser,
    }
  );
}

describe("ProjectDetailPage — владелец", () => {
  beforeEach(() => {
    stubRadixDomApis();
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
    stubNoNetworkFetch();
    mockNavigate.mockClear();
    setupMutationDefaults();

    const project = makeOwnerProjectDetail();

    mockedUseGetProjectByIdQuery.mockImplementation((id: unknown) =>
      id === PROJECT_ID ? makeQuerySuccess(project) : makeQuerySuccess(project)
    );

    mockedUseGetProjectMembersQuery.mockImplementation(() =>
      mockMembersQueryResult(project.members as ProjectMemberRow[])
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  test("на вкладке «Настройки» показывает форму редактирования проекта", async () => {
    // Arrange
    const { user } = renderDetail(makeUser({ id: OWNER_ID }));

    // Act
    await user.click(screen.getByRole("button", { name: "Настройки" }));

    // Assert
    expect(
      screen.getByRole("heading", { name: "Редактирование проекта" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: "Название *" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Сохранить" })
    ).toBeInTheDocument();
  });

  test("назначает участника администратором", async () => {
    // Arrange
    const mockRole = vi.fn(() => ({
      unwrap: () => Promise.resolve({}),
    }));
    mockedUseUpdateProjectMemberRoleMutation.mockReturnValue([
      mockRole,
      { isLoading: false, reset: vi.fn() },
    ] as unknown as ReturnType<typeof useUpdateProjectMemberRoleMutation>);

    const { user } = renderDetail(makeUser({ id: OWNER_ID }));

    // Act
    await user.click(screen.getByRole("button", { name: "Участники" }));
    await user.click(screen.getByRole("button", { name: "Сделать админом" }));

    // Assert
    await vi.waitFor(() => {
      expect(mockRole).toHaveBeenCalledWith({
        projectId: PROJECT_ID,
        userId: PLAIN_MEMBER_ID,
        role: "ADMIN",
      });
    });
  });

  test("снимает роль администратора у участника", async () => {
    // Arrange
    const mockRole = vi.fn(() => ({
      unwrap: () => Promise.resolve({}),
    }));
    mockedUseUpdateProjectMemberRoleMutation.mockReturnValue([
      mockRole,
      { isLoading: false, reset: vi.fn() },
    ] as unknown as ReturnType<typeof useUpdateProjectMemberRoleMutation>);

    const { user } = renderDetail(makeUser({ id: OWNER_ID }));

    // Act
    await user.click(screen.getByRole("button", { name: "Участники" }));
    await user.click(screen.getByRole("button", { name: "Снять админа" }));

    // Assert
    await vi.waitFor(() => {
      expect(mockRole).toHaveBeenCalledWith({
        projectId: PROJECT_ID,
        userId: ADMIN_ROLE_USER_ID,
        role: "MEMBER",
      });
    });
  });

  test("исключает участника после подтверждения", async () => {
    // Arrange
    const mockRemove = vi.fn(() => ({
      unwrap: () => Promise.resolve({ message: "OK" }),
    }));
    mockedUseRemoveProjectMemberMutation.mockReturnValue([
      mockRemove,
      { isLoading: false, reset: vi.fn() },
    ] as unknown as ReturnType<typeof useRemoveProjectMemberMutation>);

    const { user } = renderDetail(makeUser({ id: OWNER_ID }));

    // Act
    await user.click(screen.getByRole("button", { name: "Участники" }));

    const excludeButtons = screen.getAllByRole("button", { name: "Исключить" });
    const forPlainMember = excludeButtons.find((b) =>
      b.closest("li")?.textContent?.includes("Пётр")
    );
    expect(forPlainMember).toBeTruthy();
    await user.click(forPlainMember!);

    const dialog = await screen.findByRole("dialog");
    expect(
      within(dialog).getByText(/Пётр Сидоров будет удалён/)
    ).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Исключить" }));

    // Assert
    await vi.waitFor(() => {
      expect(mockRemove).toHaveBeenCalledWith({
        projectId: PROJECT_ID,
        userId: PLAIN_MEMBER_ID,
      });
    });
  });

  test("удаляет проект и переходит к списку проектов", async () => {
    // Arrange
    const mockDelete = vi.fn(() => ({
      unwrap: () => Promise.resolve({ message: "OK" }),
    }));
    mockedUseDeleteProjectMutation.mockReturnValue([
      mockDelete,
      { isLoading: false, reset: vi.fn() },
    ] as unknown as ReturnType<typeof useDeleteProjectMutation>);

    const { user } = renderDetail(makeUser({ id: OWNER_ID }));

    // Act
    await user.click(screen.getByRole("button", { name: "Настройки" }));
    await user.click(screen.getByRole("button", { name: "Удалить проект" }));
    await user.click(screen.getByRole("button", { name: "Удалить навсегда" }));

    // Assert
    await vi.waitFor(() => {
      expect(mockDelete).toHaveBeenCalledWith(PROJECT_ID);
    });
    expect(mockNavigate).toHaveBeenCalledWith(ROUTES.PROJECTS);
  });

  test("принимает заявку на участие", async () => {
    // Arrange
    const mockDecide = vi.fn(() => ({
      unwrap: () => Promise.resolve({}),
    }));
    mockedUseDecideApplicationMutation.mockReturnValue([
      mockDecide,
      { isLoading: false, reset: vi.fn() },
    ] as unknown as ReturnType<typeof useDecideApplicationMutation>);

    const { user } = renderDetail(makeUser({ id: OWNER_ID }));

    // Act
    await user.click(screen.getByRole("button", { name: /^Заявки/ }));

    await user.click(screen.getAllByRole("button", { name: "Принять" })[0]!);

    // Assert
    await vi.waitFor(() => {
      expect(mockDecide).toHaveBeenCalledWith({
        applicationId: APPLICATION_ROW_ID,
        projectId: PROJECT_ID,
        status: "ACCEPTED",
      });
    });
  });

  test("отклоняет заявку после подтверждения в диалоге", async () => {
    // Arrange
    const mockDecide = vi.fn(() => ({
      unwrap: () => Promise.resolve({}),
    }));
    mockedUseDecideApplicationMutation.mockReturnValue([
      mockDecide,
      { isLoading: false, reset: vi.fn() },
    ] as unknown as ReturnType<typeof useDecideApplicationMutation>);

    const { user } = renderDetail(makeUser({ id: OWNER_ID }));

    // Act
    await user.click(screen.getByRole("button", { name: /^Заявки/ }));
    await user.click(screen.getByRole("button", { name: "Отклонить" }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Отклонить заявку?")).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Отклонить" }));

    // Assert
    await vi.waitFor(() => {
      expect(mockDecide).toHaveBeenCalledWith({
        applicationId: APPLICATION_ROW_ID,
        projectId: PROJECT_ID,
        status: "REJECTED",
      });
    });
  });
});

describe("ProjectDetailPage — администратор проекта", () => {
  beforeEach(() => {
    stubRadixDomApis();
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
    stubNoNetworkFetch();
    mockNavigate.mockClear();
    setupMutationDefaults();

    const project = makeAdminViewerProjectDetail();
    mockedUseGetProjectByIdQuery.mockImplementation((id: unknown) =>
      id === PROJECT_ID ? makeQuerySuccess(project) : makeQuerySuccess(project)
    );
    mockedUseGetProjectMembersQuery.mockImplementation(() =>
      mockMembersQueryResult(project.members as ProjectMemberRow[])
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  test("не видит опасную зону и управление участниками как владелец", async () => {
    // Arrange
    const viewer = makeUser({
      id: ADMIN_ROLE_USER_ID,
      firstName: "Марина",
      lastName: "Ким",
      email: "k@example.com",
    });

    const { user } = renderDetail(viewer);

    // Act
    await user.click(screen.getByRole("button", { name: "Настройки" }));

    // Assert
    expect(
      screen.queryByRole("heading", { name: "Опасная зона" })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Удалить проект" })
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Участники" }));
    expect(
      screen.queryByRole("button", { name: "Сделать админом" })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Исключить" })
    ).not.toBeInTheDocument();
  });

  test("может принять заявку", async () => {
    const mockDecide = vi.fn(() => ({
      unwrap: () => Promise.resolve({}),
    }));
    mockedUseDecideApplicationMutation.mockReturnValue([
      mockDecide,
      { isLoading: false, reset: vi.fn() },
    ] as unknown as ReturnType<typeof useDecideApplicationMutation>);

    const viewer = makeUser({
      id: ADMIN_ROLE_USER_ID,
      firstName: "Марина",
      lastName: "Ким",
      email: "k@example.com",
    });

    const { user } = renderDetail(viewer);

    await user.click(screen.getByRole("button", { name: /^Заявки/ }));
    await user.click(screen.getAllByRole("button", { name: "Принять" })[0]!);

    await vi.waitFor(() => {
      expect(mockDecide).toHaveBeenCalledWith({
        applicationId: APPLICATION_ROW_ID,
        projectId: PROJECT_ID,
        status: "ACCEPTED",
      });
    });
  });

  test("может отклонить заявку из диалога", async () => {
    const mockDecide = vi.fn(() => ({
      unwrap: () => Promise.resolve({}),
    }));
    mockedUseDecideApplicationMutation.mockReturnValue([
      mockDecide,
      { isLoading: false, reset: vi.fn() },
    ] as unknown as ReturnType<typeof useDecideApplicationMutation>);

    const viewer = makeUser({
      id: ADMIN_ROLE_USER_ID,
      firstName: "Марина",
      lastName: "Ким",
    });

    const { user } = renderDetail(viewer);

    await user.click(screen.getByRole("button", { name: /^Заявки/ }));
    await user.click(screen.getByRole("button", { name: "Отклонить" }));

    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Отклонить" }));

    await vi.waitFor(() => {
      expect(mockDecide).toHaveBeenCalledWith({
        applicationId: APPLICATION_ROW_ID,
        projectId: PROJECT_ID,
        status: "REJECTED",
      });
    });
  });
});
