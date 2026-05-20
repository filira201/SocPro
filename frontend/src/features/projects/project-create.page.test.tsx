import { screen } from "@testing-library/react";
import { href } from "react-router";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { useCreateProjectMutation } from "./api/projects.api";
import { Component as ProjectCreatePage } from "./project-create.page";

import type { User } from "@/features/auth/lib/types";
import { renderWithProviders } from "@/shared/lib/test/render-with-providers";
import { ROUTES } from "@/shared/model/routes";

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

const mockNavigate = vi.fn();

vi.mock("react-router", async (importOriginal) => {
  const mod = await importOriginal<typeof import("react-router")>();

  return {
    ...mod,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("./api/projects.api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./api/projects.api")>();

  return {
    ...actual,
    useCreateProjectMutation: vi.fn(),
  };
});

const mockedUseCreateProjectMutation = vi.mocked(useCreateProjectMutation);

const NEW_PROJECT_ID = "6a04cae90445f0b3a1d386ff";

function makeAuthenticatedUser(): User {
  return {
    id: "507f1f77bcf86cd799439088",
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

function stubRadixDomApis() {
  HTMLElement.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.releasePointerCapture = vi.fn();
  Element.prototype.scrollIntoView = vi.fn();
}

describe("ProjectCreatePage", () => {
  const mockCreate = vi.fn();

  beforeEach(() => {
    stubRadixDomApis();
    mockNavigate.mockClear();
    mockCreate.mockReturnValue({
      unwrap: () =>
        Promise.resolve({
          id: NEW_PROJECT_ID,
          title: "Новый проект",
          description: "Описание",
          goals: "Цели",
        }),
    });
    mockedUseCreateProjectMutation.mockReturnValue([
      mockCreate,
      { isLoading: false, reset: vi.fn() },
    ] as unknown as ReturnType<typeof useCreateProjectMutation>);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test("показывает ошибки обязательных полей при пустой отправке", async () => {
    // Arrange
    const { user } = renderWithProviders(<ProjectCreatePage />, {
      initialRoute: ROUTES.PROJECT_CREATE,
      authenticatedUser: makeAuthenticatedUser(),
    });

    // Act
    await user.click(screen.getByRole("button", { name: "Создать проект" }));

    // Assert
    expect(screen.getByText("Укажите название проекта")).toBeInTheDocument();
    expect(screen.getByText("Укажите описание")).toBeInTheDocument();
    expect(screen.getByText("Укажите цели")).toBeInTheDocument();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  test("создаёт проект с обязательными полями и переходит к карточке", async () => {
    // Arrange
    const { user } = renderWithProviders(<ProjectCreatePage />, {
      initialRoute: ROUTES.PROJECT_CREATE,
      authenticatedUser: makeAuthenticatedUser(),
    });

    // Act
    await user.type(
      screen.getByRole("textbox", { name: "Название *" }),
      "Мой диплом"
    );
    await user.type(
      screen.getByRole("textbox", { name: "Описание *" }),
      "Описание для теста создания."
    );
    await user.type(
      screen.getByRole("textbox", { name: "Цели *" }),
      "Цели для теста."
    );
    await user.click(screen.getByRole("button", { name: "Создать проект" }));

    // Assert
    await vi.waitFor(() => {
      expect(mockCreate).toHaveBeenCalledTimes(1);
    });
    const formData = mockCreate.mock.calls[0]?.[0] as FormData;
    expect(formData.get("title")).toBe("Мой диплом");
    expect(formData.get("description")).toBe("Описание для теста создания.");
    expect(formData.get("goals")).toBe("Цели для теста.");
    expect(formData.get("requiredSkillIds")).toBe("[]");
    expect(mockNavigate).toHaveBeenCalledWith(
      href(ROUTES.PROJECT_DETAILS, { id: NEW_PROJECT_ID }),
      expect.objectContaining({ replace: true })
    );
  });

  test("прикрепляет необязательный документ и отправляет FormData с файлом", async () => {
    // Arrange
    const { user } = renderWithProviders(<ProjectCreatePage />, {
      initialRoute: ROUTES.PROJECT_CREATE,
      authenticatedUser: makeAuthenticatedUser(),
    });

    const file = new File(["%PDF-1.4"], "spec.pdf", {
      type: "application/pdf",
    });

    // Act
    await user.upload(screen.getByLabelText(/Файлы \(PDF или Word/), file);
    expect(screen.getByText(/Выбрано: 1/)).toBeInTheDocument();

    await user.type(
      screen.getByRole("textbox", { name: "Название *" }),
      "Проект с файлом"
    );
    await user.type(
      screen.getByRole("textbox", { name: "Описание *" }),
      "Есть приложение документа."
    );
    await user.type(screen.getByRole("textbox", { name: "Цели *" }), "Цели.");
    await user.click(screen.getByRole("button", { name: "Создать проект" }));

    // Assert
    await vi.waitFor(() => {
      expect(mockCreate).toHaveBeenCalledTimes(1);
    });
    const formData = mockCreate.mock.calls[0]?.[0] as FormData;
    const docs = formData.getAll("documents");
    expect(docs.length).toBe(1);
    expect((docs[0] as File).name).toBe("spec.pdf");
  });
});
