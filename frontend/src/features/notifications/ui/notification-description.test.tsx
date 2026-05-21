import { screen } from "@testing-library/react";
import { href, Route, Routes, useLocation } from "react-router";
import { describe, expect, test } from "vitest";

import { NotificationDescription } from "./notification-description";

import {
  makeNotification,
  notificationFixtureIds,
} from "@/shared/lib/test/notification-fixtures";
import { renderWithProviders } from "@/shared/lib/test/render-with-providers";
import { ROUTES } from "@/shared/model/routes";

function NavLocationProbe() {
  const { pathname } = useLocation();

  return <output data-testid="nav-current-path">{pathname}</output>;
}

function renderDescription(
  overrides: Parameters<typeof makeNotification>[0] = {}
) {
  return renderWithProviders(
    <>
      <NotificationDescription notification={makeNotification(overrides)} />
      <Routes>
        <Route path="*" element={<NavLocationProbe />} />
      </Routes>
    </>,
    { initialRoute: ROUTES.POSTS }
  );
}

describe("NotificationDescription", () => {
  test("ведёт на профиль актора при клике по имени", async () => {
    // Arrange
    const { user } = renderDescription({ type: "POST_LIKED" });

    // Act
    await user.click(screen.getByRole("link", { name: "Пётр Петров" }));

    // Assert
    expect(screen.getByTestId("nav-current-path")).toHaveTextContent(
      href(ROUTES.USER_DETAILS, { userId: notificationFixtureIds.actorId })
    );
  });

  test("ведёт на два профиля при STAFF_INVITE_SENT", async () => {
    // Arrange
    const subjectId = "507f1f77bcf86cd799439014";
    const { user } = renderDescription({
      type: "STAFF_INVITE_SENT",
      actor: {
        id: notificationFixtureIds.actorId,
        email: "actor@example.com",
        firstName: "Пётр",
        lastName: "Петров",
        patronymic: null,
        avatarUrl: null,
        bio: null,
        dateOfBirth: null,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
      subjectUser: {
        id: subjectId,
        email: "subject@example.com",
        firstName: "Анна",
        lastName: "Сидорова",
        patronymic: null,
        avatarUrl: null,
        bio: null,
        dateOfBirth: null,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    });

    // Act
    await user.click(screen.getByRole("link", { name: "Пётр Петров" }));
    expect(screen.getByTestId("nav-current-path")).toHaveTextContent(
      href(ROUTES.USER_DETAILS, { userId: notificationFixtureIds.actorId })
    );

    await user.click(screen.getByRole("link", { name: "Анна Сидорова" }));

    // Assert
    expect(screen.getByTestId("nav-current-path")).toHaveTextContent(
      href(ROUTES.USER_DETAILS, { userId: subjectId })
    );
  });

  test("показывает plain-текст без ссылок для self-заявки", () => {
    // Arrange
    renderDescription({
      type: "PROJECT_APPLICATION_SUBMITTED_SELF",
      actor: null,
    });

    // Assert
    expect(
      screen.getByText("Вы подали заявку на участие в проекте.")
    ).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
