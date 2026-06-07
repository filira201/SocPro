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
  mockMarkRead.mockReturnValue({
    unwrap: vi.fn().mockResolvedValue({ ok: true }),
  });
  mockMarkAllRead.mockReturnValue({
    unwrap: vi.fn().mockResolvedValue({ ok: true, updated: 1 }),
  });

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

  test("открывает диалог при клике «Отметить как прочитанное» без вызова мутации", async () => {
    // Arrange
    const { user } = renderWithProviders(<NotificationsPage />, {
      initialRoute: ROUTES.NOTIFICATIONS,
    });

    // Act
    await user.click(
      screen.getByRole("button", { name: "Отметить как прочитанное" })
    );

    // Assert
    expect(
      screen.getByRole("dialog", { name: "Вы уверены?" })
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Уведомление будет прочитано и удалено без возможности восстановления."
      )
    ).toBeInTheDocument();
    expect(mockMarkRead).not.toHaveBeenCalled();
  });

  test("вызывает markRead после подтверждения одного уведомления", async () => {
    // Arrange
    const { user } = renderWithProviders(<NotificationsPage />, {
      initialRoute: ROUTES.NOTIFICATIONS,
    });

    // Act
    await user.click(
      screen.getByRole("button", { name: "Отметить как прочитанное" })
    );
    await user.click(screen.getByRole("button", { name: "Да" }));

    // Assert
    expect(mockMarkRead).toHaveBeenCalledWith(NOTIFICATION_ID);
  });

  test("не вызывает markRead при отмене подтверждения одного уведомления", async () => {
    // Arrange
    const { user } = renderWithProviders(<NotificationsPage />, {
      initialRoute: ROUTES.NOTIFICATIONS,
    });

    // Act
    await user.click(
      screen.getByRole("button", { name: "Отметить как прочитанное" })
    );
    await user.click(screen.getByRole("button", { name: "Нет" }));

    // Assert
    expect(mockMarkRead).not.toHaveBeenCalled();
    expect(
      screen.queryByRole("dialog", { name: "Вы уверены?" })
    ).not.toBeInTheDocument();
  });

  test("открывает диалог при клике «Прочитать все» без вызова мутации", async () => {
    // Arrange
    const { user } = renderWithProviders(<NotificationsPage />, {
      initialRoute: ROUTES.NOTIFICATIONS,
    });

    // Act
    await user.click(screen.getByTestId("notifications-mark-all"));

    // Assert
    expect(
      screen.getByRole("dialog", { name: "Вы уверены?" })
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Все непрочитанные уведомления будут прочитаны и удалены без возможности восстановления."
      )
    ).toBeInTheDocument();
    expect(mockMarkAllRead).not.toHaveBeenCalled();
  });

  test("вызывает markAllRead после подтверждения «Прочитать все»", async () => {
    // Arrange
    const { user } = renderWithProviders(<NotificationsPage />, {
      initialRoute: ROUTES.NOTIFICATIONS,
    });

    // Act
    await user.click(screen.getByTestId("notifications-mark-all"));
    await user.click(screen.getByRole("button", { name: "Да" }));

    // Assert
    expect(mockMarkAllRead).toHaveBeenCalled();
  });

  test("не вызывает markAllRead при отмене «Прочитать все»", async () => {
    // Arrange
    const { user } = renderWithProviders(<NotificationsPage />, {
      initialRoute: ROUTES.NOTIFICATIONS,
    });

    // Act
    await user.click(screen.getByTestId("notifications-mark-all"));
    await user.click(screen.getByRole("button", { name: "Нет" }));

    // Assert
    expect(mockMarkAllRead).not.toHaveBeenCalled();
    expect(
      screen.queryByRole("dialog", { name: "Вы уверены?" })
    ).not.toBeInTheDocument();
  });

  test("показывает «Удаление…» на кнопке «Прочитать все» при загрузке", () => {
    // Arrange
    mockedUseMarkAllNotificationsReadMutation.mockReturnValue([
      mockMarkAllRead,
      { isLoading: true, reset: vi.fn() },
    ] as ReturnType<typeof useMarkAllNotificationsReadMutation>);

    renderWithProviders(<NotificationsPage />, {
      initialRoute: ROUTES.NOTIFICATIONS,
    });

    // Assert
    expect(screen.getByText("Удаление…")).toBeInTheDocument();
  });

  test("показывает «Удаление…» в диалоге при отметке одного уведомления", async () => {
    // Arrange
    const { user, rerender } = renderWithProviders(<NotificationsPage />, {
      initialRoute: ROUTES.NOTIFICATIONS,
    });

    await user.click(
      screen.getByRole("button", { name: "Отметить как прочитанное" })
    );

    mockedUseMarkNotificationReadMutation.mockReturnValue([
      mockMarkRead,
      { isLoading: true, reset: vi.fn() },
    ] as ReturnType<typeof useMarkNotificationReadMutation>);

    // Act
    rerender(<NotificationsPage />);

    // Assert
    expect(
      screen.getByRole("button", { name: /Удаление/ })
    ).toBeInTheDocument();
  });
});
