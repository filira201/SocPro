import { fireEvent, screen } from "@testing-library/react";
import type { UserEvent } from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { useLoginMutation } from "./api/auth.api";
import { Component as LoginPage } from "./login.page";
import { USER_PASSWORD_MAX } from "./model/auth-field-limits";

import { renderWithProviders } from "@/shared/lib/test/render-with-providers";
import { ROUTES } from "@/shared/model/routes";

const mockLogin = vi.fn();
const mockNavigate = vi.fn();

vi.mock("./api/auth.api", () => ({
  useLoginMutation: vi.fn(),
}));

vi.mock("react-router", async (importOriginal) => {
  const mod = await importOriginal<typeof import("react-router")>();

  return {
    ...mod,
    useNavigate: () => mockNavigate,
  };
});

const mockedUseLoginMutation = vi.mocked(useLoginMutation);

const VALID_EMAIL = "user@example.com";
const VALID_PASSWORD = "secret1";

function mockLoginSuccess() {
  mockedUseLoginMutation.mockReturnValue([
    mockLogin.mockReturnValue({
      unwrap: () => Promise.resolve({ token: "fake-token" }),
    }),
    { isLoading: false, reset: vi.fn() },
  ] as ReturnType<typeof useLoginMutation>);
}

function mockLoginFailure() {
  mockedUseLoginMutation.mockReturnValue([
    mockLogin.mockReturnValue({
      unwrap: () =>
        Promise.reject({
          status: 400,
          data: { error: "Неверная почта или пароль" },
        }),
    }),
    { isLoading: false, reset: vi.fn() },
  ] as ReturnType<typeof useLoginMutation>);
}

function mockLoginIdle() {
  mockedUseLoginMutation.mockReturnValue([
    mockLogin,
    { isLoading: false, reset: vi.fn() },
  ] as ReturnType<typeof useLoginMutation>);
}

async function fillValidForm(user: UserEvent) {
  await user.type(screen.getByTestId("login-email"), VALID_EMAIL);
  await user.type(screen.getByTestId("login-password"), VALID_PASSWORD);
}

describe("LoginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLoginIdle();
  });

  test("показывает ошибки обязательных полей при пустой отправке", async () => {
    // Arrange
    const { user } = renderWithProviders(<LoginPage />, {
      initialRoute: ROUTES.LOGIN,
    });
    expect(screen.getByText("Вход")).toBeInTheDocument();

    // Act
    await user.click(screen.getByTestId("login-submit"));

    // Assert
    expect(screen.getByTestId("login-email-error")).toHaveTextContent(
      "Введите почту"
    );
    expect(screen.getByTestId("login-password-error")).toHaveTextContent(
      "Минимум 6 символов"
    );
    expect(mockLogin).not.toHaveBeenCalled();
  });

  test("показывает ошибку если пароль длиннее лимита", async () => {
    // Arrange
    const { user } = renderWithProviders(<LoginPage />, {
      initialRoute: ROUTES.LOGIN,
    });
    await fillValidForm(user);

    // Act
    fireEvent.change(screen.getByTestId("login-password"), {
      target: { value: "a".repeat(USER_PASSWORD_MAX + 1) },
    });
    await user.click(screen.getByTestId("login-submit"));

    // Assert
    expect(screen.getByTestId("login-password-error")).toHaveTextContent(
      `Не более ${USER_PASSWORD_MAX} символов`
    );
    expect(mockLogin).not.toHaveBeenCalled();
  });

  test("показывает ошибку при неверных учётных данных", async () => {
    // Arrange
    mockLoginFailure();
    const { user } = renderWithProviders(<LoginPage />, {
      initialRoute: ROUTES.LOGIN,
    });
    await fillValidForm(user);

    // Act
    await user.click(screen.getByTestId("login-submit"));

    // Assert
    expect(screen.getByTestId("login-global-error")).toHaveTextContent(
      "Неверная почта или пароль"
    );
    expect(mockLogin).toHaveBeenCalledWith({
      email: VALID_EMAIL,
      password: VALID_PASSWORD,
    });
  });

  test("после успешного входа перенаправляет на ленту постов", async () => {
    // Arrange
    mockLoginSuccess();
    const { user } = renderWithProviders(<LoginPage />, {
      initialRoute: ROUTES.LOGIN,
    });
    await fillValidForm(user);

    // Act
    await user.click(screen.getByTestId("login-submit"));

    // Assert
    await vi.waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(ROUTES.POSTS, {
        replace: true,
      });
    });
  });

  test("показывает баннер и подставляет почту после регистрации", () => {
    // Arrange
    renderWithProviders(<LoginPage />, {
      initialEntries: [
        {
          pathname: ROUTES.LOGIN,
          state: { justRegistered: true, email: "new@example.com" },
        },
      ],
    });

    // Act — только рендер

    // Assert
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText(/Регистрация прошла успешно/i)).toBeInTheDocument();
    expect(screen.getByTestId("login-email")).toHaveValue("new@example.com");
  });
});
