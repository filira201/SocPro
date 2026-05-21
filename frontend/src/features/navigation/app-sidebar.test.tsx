import { screen } from "@testing-library/react";
import type { UserEvent } from "@testing-library/user-event";
import { href, useLocation } from "react-router";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { AppSidebar } from "./app-sidebar";

import { useCurrentQuery } from "@/features/auth/api/auth.api";
import type { User } from "@/features/auth/lib/types";
import "@/features/notifications/api/notifications.api";
import { useGetUnreadNotificationCountQuery } from "@/features/notifications/api/notifications.api";
import { mockMatchMedia } from "@/shared/lib/test/mock-match-media";
import { renderWithProviders } from "@/shared/lib/test/render-with-providers";
import { ROUTES } from "@/shared/model/routes";
import { SidebarProvider } from "@/shared/ui/kit/sidebar";
import { TooltipProvider } from "@/shared/ui/kit/tooltip";

const CURRENT_USER_ID = "507f1f77bcf86cd799439011";

const CURRENT_USER: User = {
  id: CURRENT_USER_ID,
  email: "ivan@example.com",
  firstName: "Иван",
  lastName: "Иванов",
  patronymic: null,
  avatarUrl: null,
  bio: null,
  dateOfBirth: null,
  createdAt: "2026-01-01T00:00:00.000Z",
};

vi.mock("@/features/auth/api/auth.api", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/features/auth/api/auth.api")>();

  return {
    ...actual,
    useCurrentQuery: vi.fn(),
  };
});

vi.mock(
  "@/features/notifications/api/notifications.api",
  async (importOriginal) => {
    const actual =
      await importOriginal<
        typeof import("@/features/notifications/api/notifications.api")
      >();

    return {
      ...actual,
      useGetUnreadNotificationCountQuery: vi.fn(),
    };
  }
);

const mockedUseCurrentQuery = vi.mocked(useCurrentQuery);
const mockedUseGetUnreadNotificationCountQuery = vi.mocked(
  useGetUnreadNotificationCountQuery
);

function NavLocationProbe() {
  const { pathname } = useLocation();

  return <output data-testid="nav-current-path">{pathname}</output>;
}

function renderAppSidebar(initialRoute: string) {
  return renderWithProviders(
    <TooltipProvider delayDuration={0}>
      <SidebarProvider>
        <AppSidebar />
        <NavLocationProbe />
      </SidebarProvider>
    </TooltipProvider>,
    { initialRoute, authenticatedUser: CURRENT_USER }
  );
}

async function openUserMenu(user: UserEvent) {
  await user.click(screen.getByRole("button", { name: /Иван Иванов/i }));
}

function setupSidebarMocks() {
  mockedUseCurrentQuery.mockReturnValue({
    data: CURRENT_USER,
    isLoading: false,
    isFetching: false,
    refetch: vi.fn(),
  } as ReturnType<typeof useCurrentQuery>);

  mockedUseGetUnreadNotificationCountQuery.mockReturnValue({
    data: { count: 0 },
    isLoading: false,
    isFetching: false,
    refetch: vi.fn(),
  } as ReturnType<typeof useGetUnreadNotificationCountQuery>);
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  mockMatchMedia({ matches: false });
  setupSidebarMocks();
});

describe("AppSidebar — переходы по роутам", () => {
  test.each([
    {
      linkName: "Посты",
      startRoute: ROUTES.PROJECTS,
      expectedPath: ROUTES.POSTS,
    },
    {
      linkName: "Проекты",
      startRoute: ROUTES.POSTS,
      expectedPath: ROUTES.PROJECTS,
    },
    {
      linkName: "Пользователи",
      startRoute: ROUTES.POSTS,
      expectedPath: ROUTES.USERS,
    },
    {
      linkName: "Подписчики",
      startRoute: ROUTES.POSTS,
      expectedPath: href(ROUTES.FOLLOWERS, { userId: CURRENT_USER_ID }),
    },
    {
      linkName: "Подписки",
      startRoute: ROUTES.POSTS,
      expectedPath: href(ROUTES.FOLLOWING, { userId: CURRENT_USER_ID }),
    },
  ] as const)(
    "переходит на $expectedPath при клике «$linkName»",
    async ({ linkName, startRoute, expectedPath }) => {
      // Arrange
      const { user } = renderAppSidebar(startRoute);

      // Act
      await user.click(screen.getByRole("link", { name: linkName }));

      // Assert
      expect(screen.getByTestId("nav-current-path")).toHaveTextContent(
        expectedPath
      );
    }
  );

  test("переходит на профиль при клике «Профиль» в меню пользователя", async () => {
    // Arrange
    const { user } = renderAppSidebar(ROUTES.POSTS);
    const profilePath = href(ROUTES.USER_DETAILS, { userId: CURRENT_USER_ID });

    // Act
    await openUserMenu(user);
    await user.click(screen.getByRole("menuitem", { name: "Профиль" }));

    // Assert
    expect(screen.getByTestId("nav-current-path")).toHaveTextContent(
      profilePath
    );
  });

  test("переходит на уведомления при клике «Уведомления» в меню пользователя", async () => {
    // Arrange
    const { user } = renderAppSidebar(ROUTES.POSTS);

    // Act
    await openUserMenu(user);
    await user.click(screen.getByRole("menuitem", { name: "Уведомления" }));

    // Assert
    expect(screen.getByTestId("nav-current-path")).toHaveTextContent(
      ROUTES.NOTIFICATIONS
    );
  });

  test("не показывает бейдж и счётчик при нуле непрочитанных", async () => {
    // Arrange
    mockedUseGetUnreadNotificationCountQuery.mockReturnValue({
      data: { count: 0 },
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    } as ReturnType<typeof useGetUnreadNotificationCountQuery>);
    const { user } = renderAppSidebar(ROUTES.POSTS);

    // Act
    await openUserMenu(user);

    // Assert
    expect(screen.queryAllByTitle(/Непрочитанных:/)).toHaveLength(0);
    expect(screen.queryByLabelText(/Непрочитанных:/)).not.toBeInTheDocument();
  });

  test("показывает бейдж на аватаре и счётчик непрочитанных в меню", async () => {
    // Arrange
    mockedUseGetUnreadNotificationCountQuery.mockReturnValue({
      data: { count: 3 },
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    } as ReturnType<typeof useGetUnreadNotificationCountQuery>);
    const { user } = renderAppSidebar(ROUTES.POSTS);

    // Act
    await openUserMenu(user);

    // Assert
    expect(screen.getAllByTitle("Непрочитанных: 3")).toHaveLength(2);
    expect(screen.getByLabelText("Непрочитанных: 3")).toHaveTextContent("3");
  });

  test("показывает 99+ при более чем 99 непрочитанных", async () => {
    // Arrange
    mockedUseGetUnreadNotificationCountQuery.mockReturnValue({
      data: { count: 150 },
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    } as ReturnType<typeof useGetUnreadNotificationCountQuery>);
    const { user } = renderAppSidebar(ROUTES.POSTS);

    // Act
    await openUserMenu(user);

    // Assert
    expect(screen.getByLabelText("Непрочитанных: 150")).toHaveTextContent(
      "99+"
    );
  });
});

describe("AppSidebar — выход из аккаунта", () => {
  test("выходит из аккаунта и переходит на страницу входа", async () => {
    // Arrange
    const { user, store } = renderAppSidebar(ROUTES.POSTS);
    expect(localStorage.getItem("token")).toBe("test-token");

    // Act
    await openUserMenu(user);
    await user.click(screen.getByRole("menuitem", { name: "Выйти" }));

    // Assert
    expect(screen.getByTestId("nav-current-path")).toHaveTextContent(
      ROUTES.LOGIN
    );
    expect(store.getState().user.token).toBeNull();
    expect(store.getState().user.user).toBeNull();
    expect(localStorage.getItem("token")).toBeNull();
  });
});
