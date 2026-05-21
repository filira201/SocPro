import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import {
  useGetNotificationsQuery,
  useGetUnreadNotificationCountQuery,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
} from "./api/notifications.api";
import { Component as NotificationsPage } from "./notifications.page";

import "@/features/notifications/api/notifications.api";
import { makeNotification } from "@/shared/lib/test/notification-fixtures";
import { renderWithProviders } from "@/shared/lib/test/render-with-providers";
import { ROUTES } from "@/shared/model/routes";

const NOTIFICATION_ID = "507f1f77bcf86cd799439011";

const mockMarkRead = vi.fn();
const mockMarkAllRead = vi.fn();
const mockRefetch = vi.fn();

vi.mock("./api/notifications.api", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("./api/notifications.api")>();

  return {
    ...actual,
    useGetNotificationsQuery: vi.fn(),
    useGetUnreadNotificationCountQuery: vi.fn(),
    useMarkNotificationReadMutation: vi.fn(),
    useMarkAllNotificationsReadMutation: vi.fn(),
  };
});

const mockedUseGetNotificationsQuery = vi.mocked(useGetNotificationsQuery);
const mockedUseGetUnreadNotificationCountQuery = vi.mocked(
  useGetUnreadNotificationCountQuery
);
const mockedUseMarkNotificationReadMutation = vi.mocked(
  useMarkNotificationReadMutation
);
const mockedUseMarkAllNotificationsReadMutation = vi.mocked(
  useMarkAllNotificationsReadMutation
);

function setupDefaultMocks() {
  mockedUseGetUnreadNotificationCountQuery.mockReturnValue({
    data: { count: 1 },
    isLoading: false,
    isFetching: false,
    refetch: vi.fn(),
  } as ReturnType<typeof useGetUnreadNotificationCountQuery>);

  mockedUseGetNotificationsQuery.mockReturnValue({
    data: {
      items: [makeNotification({ id: NOTIFICATION_ID })],
      nextCursor: null,
    },
    isLoading: false,
    isFetching: false,
    isError: false,
    error: undefined,
    refetch: mockRefetch,
  } as ReturnType<typeof useGetNotificationsQuery>);

  mockedUseMarkNotificationReadMutation.mockReturnValue([
    mockMarkRead,
    { isLoading: false, reset: vi.fn() },
  ] as ReturnType<typeof useMarkNotificationReadMutation>);

  mockedUseMarkAllNotificationsReadMutation.mockReturnValue([
    mockMarkAllRead,
    { isLoading: false, reset: vi.fn() },
  ] as ReturnType<typeof useMarkAllNotificationsReadMutation>);
}

describe("NotificationsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDefaultMocks();

    class MockIntersectionObserver {
      observe = vi.fn();
      disconnect = vi.fn();
      unobserve = vi.fn();
    }

    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
  });

  test("показывает заголовок, число непрочитанных и карточки", () => {
    // Arrange
    renderWithProviders(<NotificationsPage />, {
      initialRoute: ROUTES.NOTIFICATIONS,
    });

    // Assert
    expect(
      screen.getByRole("heading", { name: "Уведомления" })
    ).toBeInTheDocument();
    expect(screen.getByTestId("notifications-unread-total")).toHaveTextContent(
      "1"
    );
    expect(screen.getByText("Лайк публикации")).toBeInTheDocument();
  });

  test("показывает пустое состояние без уведомлений", () => {
    // Arrange
    mockedUseGetNotificationsQuery.mockReturnValue({
      data: { items: [], nextCursor: null },
      isLoading: false,
      isFetching: false,
      isError: false,
      error: undefined,
      refetch: mockRefetch,
    } as ReturnType<typeof useGetNotificationsQuery>);

    renderWithProviders(<NotificationsPage />, {
      initialRoute: ROUTES.NOTIFICATIONS,
    });

    // Assert
    expect(screen.getByText("Пока нет уведомлений")).toBeInTheDocument();
  });

  test("показывает ошибку API и повторяет запрос", async () => {
    // Arrange
    mockedUseGetNotificationsQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: false,
      isError: true,
      error: { status: 500, data: { error: "Внутренняя ошибка сервера" } },
      refetch: mockRefetch,
    } as ReturnType<typeof useGetNotificationsQuery>);

    const { user } = renderWithProviders(<NotificationsPage />, {
      initialRoute: ROUTES.NOTIFICATIONS,
    });

    // Assert
    expect(screen.getByText("Внутренняя ошибка сервера")).toBeInTheDocument();

    // Act
    await user.click(screen.getByRole("button", { name: "Повторить" }));

    // Assert
    expect(mockRefetch).toHaveBeenCalled();
  });

  test("отключает «Прочитать все» при нуле непрочитанных", () => {
    // Arrange
    mockedUseGetUnreadNotificationCountQuery.mockReturnValue({
      data: { count: 0 },
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    } as ReturnType<typeof useGetUnreadNotificationCountQuery>);

    renderWithProviders(<NotificationsPage />, {
      initialRoute: ROUTES.NOTIFICATIONS,
    });

    // Assert
    expect(screen.getByTestId("notifications-mark-all")).toBeDisabled();
  });

  test("вызывает markAllRead при клике «Прочитать все»", async () => {
    // Arrange
    const { user } = renderWithProviders(<NotificationsPage />, {
      initialRoute: ROUTES.NOTIFICATIONS,
    });

    // Act
    await user.click(screen.getByTestId("notifications-mark-all"));

    // Assert
    expect(mockMarkAllRead).toHaveBeenCalled();
  });

  test("показывает «Сохранение…» при отметке всех прочитанными", () => {
    // Arrange
    mockedUseMarkAllNotificationsReadMutation.mockReturnValue([
      mockMarkAllRead,
      { isLoading: true, reset: vi.fn() },
    ] as ReturnType<typeof useMarkAllNotificationsReadMutation>);

    renderWithProviders(<NotificationsPage />, {
      initialRoute: ROUTES.NOTIFICATIONS,
    });

    // Assert
    expect(screen.getByText("Сохранение…")).toBeInTheDocument();
  });

  test("вызывает markRead при клике «Отметить как прочитанное» на карточке", async () => {
    // Arrange
    const { user } = renderWithProviders(<NotificationsPage />, {
      initialRoute: ROUTES.NOTIFICATIONS,
    });

    // Act
    await user.click(
      screen.getByRole("button", { name: "Отметить как прочитанное" })
    );

    // Assert
    expect(mockMarkRead).toHaveBeenCalledWith(NOTIFICATION_ID);
  });
});
