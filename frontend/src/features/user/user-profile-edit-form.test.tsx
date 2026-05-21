import { screen, within } from "@testing-library/react";
import type { UserEvent } from "@testing-library/user-event";
import { href, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { useGetUserProfileProjectsQuery } from "./api/user-profile-projects.api";
import * as buildProfileFormDataModule from "./lib/build-profile-form-data";
import { UserProfileEditForm } from "./ui/user-profile-edit-form";
import { Component as UserProfileEditPage } from "./user-profile-edit.page";
import { Component as UserPage } from "./user.page";

import { displayPublicName, formatFullName } from "@/features/auth";
import {
  useGetUserByIdQuery,
  useUpdateUserMutation,
} from "@/features/auth/api/auth.api";
import type { User } from "@/features/auth/lib/types";
import "@/features/auth/api/auth.api";
import {
  useCreateSkillMutation,
  useLazyListSkillsQuery,
} from "@/features/skills/api/skills.api";
import "@/features/skills/api/skills.api";
import "@/features/user/api/user-profile-projects.api";
import { renderWithProviders } from "@/shared/lib/test/render-with-providers";
import { ROUTES } from "@/shared/model/routes";

const CURRENT_USER_ID = "507f1f77bcf86cd799439099";
const SKILL_REACT_ID = "507f1f77bcf86cd799439011";

const CYRILLIC_ONLY = "Только кириллица, без пробелов и других символов";

vi.mock("@/shared/lib/react/use-debounced-value", () => ({
  useDebouncedValue: <T,>(value: T) => value,
}));

vi.mock("@/features/auth/api/auth.api", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/features/auth/api/auth.api")>();

  return {
    ...actual,
    useUpdateUserMutation: vi.fn(),
    useGetUserByIdQuery: vi.fn(),
  };
});

vi.mock("@/features/skills/api/skills.api", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/features/skills/api/skills.api")>();

  return {
    ...actual,
    useCreateSkillMutation: vi.fn(),
    useLazyListSkillsQuery: vi.fn(),
  };
});

vi.mock("./api/user-profile-projects.api", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("./api/user-profile-projects.api")>();

  return {
    ...actual,
    useGetUserProfileProjectsQuery: vi.fn(),
  };
});

const mockedUseUpdateUserMutation = vi.mocked(useUpdateUserMutation);
const mockedUseGetUserByIdQuery = vi.mocked(useGetUserByIdQuery);
const mockedUseCreateSkillMutation = vi.mocked(useCreateSkillMutation);
const mockedUseLazyListSkillsQuery = vi.mocked(useLazyListSkillsQuery);
const mockedUseGetUserProfileProjectsQuery = vi.mocked(
  useGetUserProfileProjectsQuery
);

const mockUpdateUser = vi.fn();
const mockTriggerSearch = vi.fn();

let profileUserForQuery: User | undefined;

function stubRadixDomApis() {
  HTMLElement.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.releasePointerCapture = vi.fn();
  Element.prototype.scrollIntoView = vi.fn();
}

function makeBaseUser(): User {
  return {
    id: CURRENT_USER_ID,
    email: "me@example.com",
    firstName: "Мария",
    lastName: "Иванова",
    patronymic: null,
    avatarUrl: null,
    bio: "Старое описание.",
    dateOfBirth: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    university: "Старый вуз",
    faculty: "Старый факультет",
    course: "2",
    contacts: ["@old_contact"],
    skills: [{ id: SKILL_REACT_ID, name: "React" }],
  };
}

function makeUpdatedUser(): User {
  return {
    ...makeBaseUser(),
    firstName: "Анна",
    lastName: "Петрова",
    patronymic: "Сергеевна",
    bio: "Новое описание профиля.",
    university: "МГТУ",
    faculty: "ИТ",
    course: "3",
    dateOfBirth: "1995-06-15T00:00:00.000Z",
    contacts: ["@anna_new", "anna@test.ru"],
  };
}

function setupSkillsAndProjectsMocks() {
  mockedUseCreateSkillMutation.mockReturnValue([
    vi.fn(),
    { isLoading: false, reset: vi.fn() },
  ] as unknown as ReturnType<typeof useCreateSkillMutation>);

  mockedUseLazyListSkillsQuery.mockReturnValue([
    mockTriggerSearch.mockImplementation(() => ({
      unwrap: () => Promise.resolve([]),
    })),
    { isLoading: false, isFetching: false, reset: vi.fn() },
    {},
  ] as unknown as ReturnType<typeof useLazyListSkillsQuery>);

  mockedUseGetUserProfileProjectsQuery.mockReturnValue({
    data: { items: [], nextCursor: null },
    isLoading: false,
    isFetching: false,
    error: undefined,
    refetch: vi.fn(),
  } as ReturnType<typeof useGetUserProfileProjectsQuery>);
}

function setupUpdateUserMock(onSuccessUser?: User) {
  mockedUseUpdateUserMutation.mockReturnValue([
    mockUpdateUser.mockImplementation(() => {
      if (onSuccessUser) {
        profileUserForQuery = onSuccessUser;
      }

      return {
        unwrap: () => Promise.resolve(onSuccessUser ?? makeBaseUser()),
      };
    }),
    { isLoading: false, reset: vi.fn() },
  ] as unknown as ReturnType<typeof useUpdateUserMutation>);
}

function setupGetUserByIdMock(initial: User) {
  profileUserForQuery = initial;

  mockedUseGetUserByIdQuery.mockImplementation((userId: string) => {
    const data = userId === CURRENT_USER_ID ? profileUserForQuery : undefined;

    return {
      data,
      isLoading: false,
      isFetching: false,
      error: undefined,
      refetch: vi.fn(),
    } as ReturnType<typeof useGetUserByIdQuery>;
  });
}

function renderEditForm(user: User = makeBaseUser()) {
  const onSaved = vi.fn();
  const onCancel = vi.fn();

  const result = renderWithProviders(
    <UserProfileEditForm user={user} onSaved={onSaved} onCancel={onCancel} />,
    { authenticatedUser: { ...user, email: user.email } }
  );

  return { ...result, onSaved, onCancel };
}

function renderEditToProfileFlow(initialUser: User = makeBaseUser()) {
  const editRoute = href(ROUTES.USER_PROFILE_EDIT, { userId: CURRENT_USER_ID });

  return renderWithProviders(
    <Routes>
      <Route
        path={ROUTES.USER_PROFILE_EDIT}
        element={<UserProfileEditPage />}
      />
      <Route path={ROUTES.USER_DETAILS} element={<UserPage />} />
    </Routes>,
    {
      initialEntries: [editRoute],
      authenticatedUser: {
        id: CURRENT_USER_ID,
        email: initialUser.email,
        firstName: initialUser.firstName,
        lastName: initialUser.lastName,
        patronymic: initialUser.patronymic,
        avatarUrl: null,
        bio: null,
        dateOfBirth: null,
        createdAt: initialUser.createdAt,
      },
    }
  );
}

async function submitForm(user: UserEvent) {
  await user.click(screen.getByRole("button", { name: "Сохранить" }));
}

async function fillValidProfileForm(user: UserEvent, values: User) {
  const firstName = document.getElementById(
    "profile-firstName"
  ) as HTMLInputElement;
  const lastName = document.getElementById(
    "profile-lastName"
  ) as HTMLInputElement;
  const patronymic = document.getElementById(
    "profile-patronymic"
  ) as HTMLInputElement;
  const bio = document.getElementById("profile-bio") as HTMLTextAreaElement;
  const university = document.getElementById(
    "profile-university"
  ) as HTMLInputElement;
  const faculty = document.getElementById(
    "profile-faculty"
  ) as HTMLInputElement;
  const course = document.getElementById("profile-course") as HTMLInputElement;
  const contact = screen.getByLabelText("Контакт 1") as HTMLInputElement;

  await user.clear(firstName);
  await user.type(firstName, values.firstName);
  await user.clear(lastName);
  await user.type(lastName, values.lastName ?? "");
  await user.clear(patronymic);
  await user.type(patronymic, values.patronymic ?? "");
  await user.clear(bio);
  await user.type(bio, values.bio ?? "");
  await user.clear(university);
  await user.type(university, values.university ?? "");
  await user.clear(faculty);
  await user.type(faculty, values.faculty ?? "");
  await user.clear(course);
  await user.type(course, values.course ?? "");
  await user.clear(contact);
  await user.type(contact, values.contacts?.[0] ?? "");
}

function getFormDataFromUpdateCall(): FormData {
  const call = mockUpdateUser.mock.calls[0]?.[0] as
    | { userData: FormData; id: string }
    | undefined;

  if (!call?.userData) {
    throw new Error("ожидался вызов updateUser с FormData");
  }

  return call.userData;
}

describe("UserProfileEditForm — валидация", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stubRadixDomApis();
    setupSkillsAndProjectsMocks();
    setupUpdateUserMock();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("показывает ошибку если имя пустое", async () => {
    // Arrange
    const { user } = renderEditForm();

    // Act
    const firstName = document.getElementById(
      "profile-firstName"
    ) as HTMLInputElement;
    await user.clear(firstName);
    await submitForm(user);

    // Assert
    expect(screen.getByText("Введите имя")).toBeInTheDocument();
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });

  test("показывает ошибку если имя не на кириллице", async () => {
    // Arrange
    const { user } = renderEditForm();

    // Act
    const firstName = document.getElementById(
      "profile-firstName"
    ) as HTMLInputElement;
    await user.clear(firstName);
    await user.type(firstName, "John");
    await submitForm(user);

    // Assert
    expect(screen.getByText(CYRILLIC_ONLY)).toBeInTheDocument();
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });

  test("показывает ошибку если фамилия не на кириллице", async () => {
    // Arrange
    const { user } = renderEditForm();

    // Act
    const lastName = document.getElementById(
      "profile-lastName"
    ) as HTMLInputElement;
    await user.clear(lastName);
    await user.type(lastName, "Smith");
    await submitForm(user);

    // Assert
    expect(screen.getByText(CYRILLIC_ONLY)).toBeInTheDocument();
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });

  test("показывает ошибку если отчество не на кириллице", async () => {
    // Arrange
    const { user } = renderEditForm();

    // Act
    const patronymic = document.getElementById(
      "profile-patronymic"
    ) as HTMLInputElement;
    await user.clear(patronymic);
    await user.type(patronymic, "Ivanovich");
    await submitForm(user);

    // Assert
    expect(screen.getByText(CYRILLIC_ONLY)).toBeInTheDocument();
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });

  test("показывает ошибку если «О себе» длиннее 2000 символов", async () => {
    // Arrange
    const { user } = renderEditForm();

    // Act
    const bio = document.getElementById("profile-bio") as HTMLTextAreaElement;
    await user.clear(bio);
    await user.type(bio, "а".repeat(2001));
    await submitForm(user);

    // Assert
    expect(screen.getByText("Не более 2000 символов")).toBeInTheDocument();
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });

  test("показывает ошибку если вуз длиннее 200 символов", async () => {
    // Arrange
    const { user } = renderEditForm();

    // Act
    const university = document.getElementById(
      "profile-university"
    ) as HTMLInputElement;
    await user.clear(university);
    await user.type(university, "а".repeat(201));
    await submitForm(user);

    // Assert
    expect(screen.getByText("Не более 200 символов")).toBeInTheDocument();
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });

  test("показывает ошибку если факультет длиннее 200 символов", async () => {
    // Arrange
    const { user } = renderEditForm();

    // Act
    const faculty = document.getElementById(
      "profile-faculty"
    ) as HTMLInputElement;
    await user.clear(faculty);
    await user.type(faculty, "а".repeat(201));
    await submitForm(user);

    // Assert
    expect(screen.getByText("Не более 200 символов")).toBeInTheDocument();
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });

  test("показывает ошибку если курс длиннее 200 символов", async () => {
    // Arrange
    const { user } = renderEditForm();

    // Act
    const course = document.getElementById(
      "profile-course"
    ) as HTMLInputElement;
    await user.clear(course);
    await user.type(course, "а".repeat(201));
    await submitForm(user);

    // Assert
    expect(screen.getByText("Не более 200 символов")).toBeInTheDocument();
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });

  test("показывает ошибку если строка контакта длиннее 500 символов", async () => {
    // Arrange
    const { user } = renderEditForm();

    // Act
    const contact = screen.getByLabelText("Контакт 1") as HTMLInputElement;
    await user.clear(contact);
    await user.type(contact, "а".repeat(501));
    await submitForm(user);

    // Assert
    expect(
      screen.getByText("Не более 500 символов в строке контакта")
    ).toBeInTheDocument();
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });

  test("поле почты недоступно для редактирования", () => {
    // Arrange
    renderEditForm();

    // Assert
    expect(document.getElementById("profile-email")).toBeDisabled();
  });

  test("при валидных данных вызывает updateUser с FormData без почты", async () => {
    // Arrange
    const buildSpy = vi.spyOn(
      buildProfileFormDataModule,
      "buildProfileFormData"
    );
    const values = makeUpdatedUser();
    const { user, onSaved } = renderEditForm();
    await fillValidProfileForm(user, values);

    // Act
    await submitForm(user);

    // Assert
    await vi.waitFor(() => expect(mockUpdateUser).toHaveBeenCalledTimes(1));
    expect(mockUpdateUser).toHaveBeenCalledWith({
      id: CURRENT_USER_ID,
      userData: expect.any(FormData),
    });
    expect(buildSpy).toHaveBeenCalled();

    const fd = getFormDataFromUpdateCall();
    expect(fd.get("firstName")).toBe("Анна");
    expect(fd.get("lastName")).toBe("Петрова");
    expect(fd.get("patronymic")).toBe("Сергеевна");
    expect(fd.get("bio")).toBe("Новое описание профиля.");
    expect(fd.get("university")).toBe("МГТУ");
    expect(fd.get("faculty")).toBe("ИТ");
    expect(fd.get("course")).toBe("3");
    expect(fd.get("contacts")).toBe(JSON.stringify(["@anna_new"]));
    expect(fd.get("skillIds")).toBe(SKILL_REACT_ID);
    expect(fd.has("email")).toBe(false);

    await vi.waitFor(() => expect(onSaved).toHaveBeenCalled());
  });

  test("показывает ошибку сервера для некорректных контактов", async () => {
    // Arrange
    mockUpdateUser.mockReturnValue({
      unwrap: () =>
        Promise.reject({
          status: 400,
          data: { error: "Некорректные контакты" },
        }),
    });
    const { user, onSaved } = renderEditForm();
    await fillValidProfileForm(user, makeUpdatedUser());

    // Act
    await submitForm(user);

    // Assert
    expect(
      await screen.findByText("Некорректные контакты")
    ).toBeInTheDocument();
    expect(onSaved).not.toHaveBeenCalled();
  });

  test("показывает ошибку сервера у поля имени", async () => {
    // Arrange
    const serverMessage = "Имя: только кириллица";
    mockUpdateUser.mockReturnValue({
      unwrap: () =>
        Promise.reject({
          status: 400,
          data: { error: serverMessage },
        }),
    });
    const { user } = renderEditForm();
    await fillValidProfileForm(user, makeUpdatedUser());

    // Act
    await submitForm(user);

    // Assert
    expect(await screen.findByText(serverMessage)).toBeInTheDocument();
  });
});

describe("UserProfileEditPage — после сохранения", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stubRadixDomApis();
    setupSkillsAndProjectsMocks();
    setupGetUserByIdMock(makeBaseUser());
    setupUpdateUserMock();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("на странице профиля отображаются сохранённые значения", async () => {
    // Arrange
    const updated = makeUpdatedUser();
    mockUpdateUser.mockImplementation(() => {
      profileUserForQuery = updated;

      return {
        unwrap: () => Promise.resolve(updated),
      };
    });

    const { user } = renderEditToProfileFlow(makeBaseUser());
    expect(
      screen.getByRole("heading", { name: "Редактирование профиля" })
    ).toBeInTheDocument();

    // Act
    await fillValidProfileForm(user, updated);
    await submitForm(user);

    // Assert
    await vi.waitFor(() => {
      expect(
        screen.getByRole("heading", { name: displayPublicName(updated) })
      ).toBeInTheDocument();
    });

    expect(screen.getByText(formatFullName(updated))).toBeInTheDocument();
    expect(screen.getByText(updated.bio!)).toBeInTheDocument();
    expect(screen.getByText("МГТУ")).toBeInTheDocument();
    expect(screen.getByText("ИТ")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("@anna_new")).toBeInTheDocument();
    expect(screen.getByText("anna@test.ru")).toBeInTheDocument();

    const expectedBirthLabel = new Intl.DateTimeFormat("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(updated.dateOfBirth!));
    expect(screen.getByText(expectedBirthLabel)).toBeInTheDocument();

    const skillsList = screen.getByText("Навыки").closest("section");
    expect(skillsList).toBeTruthy();
    expect(within(skillsList!).getByText("React")).toBeInTheDocument();

    expect(screen.queryByText("Старое описание.")).not.toBeInTheDocument();
  });
});
