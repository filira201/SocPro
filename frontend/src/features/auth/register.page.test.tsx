import { fireEvent, screen } from "@testing-library/react";
import type { UserEvent } from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { useRegisterMutation } from "./api/auth.api";
import {
  USER_EMAIL_MAX,
  USER_FIO_PART_MAX,
  USER_PASSWORD_MAX,
} from "./model/auth-field-limits";
import { Component as RegisterPage } from "./register.page";

import { renderWithProviders } from "@/shared/lib/test/render-with-providers";
import { ROUTES } from "@/shared/model/routes";

const mockRegister = vi.fn();
const mockNavigate = vi.fn();

vi.mock("./api/auth.api", () => ({
  useRegisterMutation: vi.fn(),
}));

vi.mock("react-router", async (importOriginal) => {
  const mod = await importOriginal<typeof import("react-router")>();

  return {
    ...mod,
    useNavigate: () => mockNavigate,
  };
});

const mockedUseRegisterMutation = vi.mocked(useRegisterMutation);

const VALID_EMAIL = "new@example.com";
const VALID_PASSWORD = "secret1";

function mockRegisterSuccess() {
  mockedUseRegisterMutation.mockReturnValue([
    mockRegister.mockReturnValue({
      unwrap: () =>
        Promise.resolve({
          id: "507f1f77bcf86cd799439011",
          email: VALID_EMAIL,
          firstName: "Иван",
        }),
    }),
    { isLoading: false, reset: vi.fn() },
  ] as ReturnType<typeof useRegisterMutation>);
}

function mockRegisterDuplicateEmail() {
  mockedUseRegisterMutation.mockReturnValue([
    mockRegister.mockReturnValue({
      unwrap: () =>
        Promise.reject({
          status: 400,
          data: { error: "Пользователь с такой почтой уже существует" },
        }),
    }),
    { isLoading: false, reset: vi.fn() },
  ] as ReturnType<typeof useRegisterMutation>);
}

function mockRegisterIdle() {
  mockedUseRegisterMutation.mockReturnValue([
    mockRegister,
    { isLoading: false, reset: vi.fn() },
  ] as ReturnType<typeof useRegisterMutation>);
}

async function fillValidForm(
  user: UserEvent,
  options?: { withConsent?: boolean }
) {
  const withConsent = options?.withConsent ?? true;

  await user.type(screen.getByTestId("register-email"), VALID_EMAIL);
  await user.type(screen.getByTestId("register-first-name"), "Иван");
  await user.type(screen.getByTestId("register-password"), VALID_PASSWORD);
  await user.type(
    screen.getByTestId("register-confirm-password"),
    VALID_PASSWORD
  );

  if (withConsent) {
    await user.click(screen.getByTestId("register-personal-data-consent"));
  }
}

describe("RegisterPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRegisterIdle();
  });

  test("показывает ошибки обязательных полей при пустой отправке", async () => {
    // Arrange
    const { user } = renderWithProviders(<RegisterPage />);
    expect(screen.getByText("Регистрация")).toBeInTheDocument();

    // Act
    await user.click(screen.getByTestId("register-submit"));

    // Assert
    expect(screen.getByTestId("register-email-error")).toHaveTextContent(
      "Введите почту"
    );
    expect(screen.getByTestId("register-first-name-error")).toHaveTextContent(
      "Введите имя"
    );
    expect(screen.getByTestId("register-password-error")).toHaveTextContent(
      "Минимум 6 символов"
    );
    expect(
      screen.getByTestId("register-confirm-password-error")
    ).toHaveTextContent("Минимум 6 символов");
    expect(
      screen.getByTestId("register-personal-data-consent-error")
    ).toHaveTextContent("Необходимо согласие на обработку персональных данных");
    expect(mockRegister).not.toHaveBeenCalled();
  });

  test("показывает ссылки на страницу правовой информации в тексте согласия", () => {
    // Arrange
    renderWithProviders(<RegisterPage />);

    // Assert
    expect(screen.getByTestId("register-legal-terms-link")).toHaveAttribute(
      "href",
      ROUTES.LEGAL
    );
    expect(screen.getByTestId("register-legal-consent-link")).toHaveAttribute(
      "href",
      ROUTES.LEGAL
    );
    expect(screen.getByTestId("register-legal-terms-link")).toHaveTextContent(
      "Пользовательским соглашением"
    );
    expect(screen.getByTestId("register-legal-consent-link")).toHaveTextContent(
      "согласие на обработку персональных данных"
    );
  });

  test("показывает ошибку если не отмечено согласие на обработку персональных данных", async () => {
    // Arrange
    const { user } = renderWithProviders(<RegisterPage />);
    await fillValidForm(user, { withConsent: false });

    // Act
    await user.click(screen.getByTestId("register-submit"));

    // Assert
    expect(
      screen.getByTestId("register-personal-data-consent-error")
    ).toHaveTextContent("Необходимо согласие на обработку персональных данных");
    expect(mockRegister).not.toHaveBeenCalled();
  });

  test("показывает ошибку если почта длиннее лимита", async () => {
    // Arrange
    const { user } = renderWithProviders(<RegisterPage />);
    await fillValidForm(user);
    const longEmail = `${"a".repeat(USER_EMAIL_MAX - 11)}@example.com`;

    // Act
    fireEvent.change(screen.getByTestId("register-email"), {
      target: { value: longEmail },
    });
    await user.click(screen.getByTestId("register-submit"));

    // Assert
    expect(screen.getByTestId("register-email-error")).toHaveTextContent(
      `Не более ${USER_EMAIL_MAX} символов`
    );
    expect(mockRegister).not.toHaveBeenCalled();
  });

  test("показывает ошибку если имя длиннее лимита", async () => {
    // Arrange
    const { user } = renderWithProviders(<RegisterPage />);
    await fillValidForm(user);

    // Act
    fireEvent.change(screen.getByTestId("register-first-name"), {
      target: { value: "а".repeat(USER_FIO_PART_MAX + 1) },
    });
    await user.click(screen.getByTestId("register-submit"));

    // Assert
    expect(screen.getByTestId("register-first-name-error")).toHaveTextContent(
      `Не более ${USER_FIO_PART_MAX} символов`
    );
    expect(mockRegister).not.toHaveBeenCalled();
  });

  test("показывает ошибку если пароль длиннее лимита", async () => {
    // Arrange
    const { user } = renderWithProviders(<RegisterPage />);
    await fillValidForm(user);
    const longPassword = "a".repeat(USER_PASSWORD_MAX + 1);

    // Act
    fireEvent.change(screen.getByTestId("register-password"), {
      target: { value: longPassword },
    });
    fireEvent.change(screen.getByTestId("register-confirm-password"), {
      target: { value: longPassword },
    });
    await user.click(screen.getByTestId("register-submit"));

    // Assert
    expect(screen.getByTestId("register-password-error")).toHaveTextContent(
      `Не более ${USER_PASSWORD_MAX} символов`
    );
    expect(mockRegister).not.toHaveBeenCalled();
  });

  test("показывает ошибку если пароли не совпадают", async () => {
    // Arrange
    const { user } = renderWithProviders(<RegisterPage />);
    await fillValidForm(user);
    await user.clear(screen.getByTestId("register-confirm-password"));
    await user.type(screen.getByTestId("register-confirm-password"), "other1");

    // Act
    await user.click(screen.getByTestId("register-submit"));

    // Assert
    expect(
      screen.getByTestId("register-confirm-password-error")
    ).toHaveTextContent("Пароли не совпадают");
    expect(mockRegister).not.toHaveBeenCalled();
  });

  test("показывает ошибку сервера если почта уже занята", async () => {
    // Arrange
    mockRegisterDuplicateEmail();
    const { user } = renderWithProviders(<RegisterPage />);
    await fillValidForm(user);

    // Act
    await user.click(screen.getByTestId("register-submit"));

    // Assert
    expect(screen.getByTestId("register-email-error")).toHaveTextContent(
      "Пользователь с такой почтой уже существует"
    );
    expect(mockRegister).toHaveBeenCalledWith({
      email: VALID_EMAIL,
      firstName: "Иван",
      lastName: undefined,
      patronymic: undefined,
      password: VALID_PASSWORD,
      personalDataConsent: true,
    });
  });

  test("после успешной регистрации перенаправляет на страницу входа", async () => {
    // Arrange
    mockRegisterSuccess();
    const { user } = renderWithProviders(<RegisterPage />);
    await fillValidForm(user);

    // Act
    await user.click(screen.getByTestId("register-submit"));

    // Assert
    await vi.waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(ROUTES.LOGIN, {
        replace: true,
        state: { justRegistered: true, email: VALID_EMAIL },
      });
    });
  });
});
