import { screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { useUpdateProjectMutation } from "./api/projects.api";
import * as buildProjectFormData from "./lib/build-project-form-data";
import type { ProjectDetail } from "./model/types";
import { ProjectEditForm } from "./ui/project-edit-form";

import type { User } from "@/features/auth/lib/types";
import { renderWithProviders } from "@/shared/lib/test/render-with-providers";

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
    useUpdateProjectMutation: vi.fn(),
  };
});

const mockedUseUpdateProjectMutation = vi.mocked(useUpdateProjectMutation);

function makeUser(o: Partial<User>): User {
  return {
    id: "507f1f77bcf86cd799439099",
    email: "a@example.com",
    firstName: "Юлия",
    lastName: "Орлова",
    patronymic: null,
    avatarUrl: null,
    bio: null,
    dateOfBirth: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    ...o,
  };
}

function makeDetail(): ProjectDetail {
  const owner = makeUser({});
  const projectId = "6a04cae90445f0b3a1d38699";

  return {
    id: projectId,
    title: "Стартовое имя",
    description: "Описание редактируемое.",
    goals: "Цели.",
    status: "OPEN",
    acceptingApplications: true,
    statusUpdatedAt: null,
    createdAt: "2026-01-01T10:00:00.000Z",
    updatedAt: "2026-01-02T14:30:00.000Z",
    owner,
    requiredSkills: [],
    members: [],
    isOwner: true,
    isMember: true,
    myApplication: null,
    attachments: [],
  };
}

function stubRadixDomApis() {
  HTMLElement.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.releasePointerCapture = vi.fn();
  Element.prototype.scrollIntoView = vi.fn();
}

describe("ProjectEditForm", () => {
  beforeEach(() => {
    stubRadixDomApis();
    vi.spyOn(buildProjectFormData, "buildUpdateProjectFormData");
    mockedUseUpdateProjectMutation.mockReturnValue([
      vi.fn(() => ({ unwrap: () => Promise.resolve({ id: makeDetail().id }) })),
      { isLoading: false, reset: vi.fn() },
    ] as unknown as ReturnType<typeof useUpdateProjectMutation>);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  test("передаёт в API обновлённое название при «Сохранить»", async () => {
    // Arrange
    const project = makeDetail();
    const mockUpdate = vi.fn(() => ({
      unwrap: () => Promise.resolve({ id: project.id }),
    }));

    mockedUseUpdateProjectMutation.mockReturnValue([
      mockUpdate,
      { isLoading: false, reset: vi.fn() },
    ] as unknown as ReturnType<typeof useUpdateProjectMutation>);

    const { user } = renderWithProviders(
      <ProjectEditForm project={project} />,
      {
        authenticatedUser: makeUser({}),
      }
    );

    const titleField = document.getElementById(
      "edit-project-title"
    ) as HTMLInputElement;
    expect(titleField).toBeTruthy();

    await user.click(titleField);
    await user.clear(titleField);
    await user.type(titleField, "После сохранения");

    await vi.waitFor(() => {
      expect(titleField.value).toBe("После сохранения");
    });

    await user.click(screen.getByRole("button", { name: "Сохранить" }));

    // Assert
    await vi.waitFor(() => expect(mockUpdate).toHaveBeenCalled());

    expect(buildProjectFormData.buildUpdateProjectFormData).toHaveBeenCalled();
    const formValuesArg = vi.mocked(
      buildProjectFormData.buildUpdateProjectFormData
    ).mock.calls[0]?.[0] as { title: string };

    expect(formValuesArg?.title?.trim()).toBe("После сохранения");

    type UpdateProjectPayload = { id: string; body: FormData };
    const calls = mockUpdate.mock.calls as unknown as UpdateProjectPayload[][];
    const updatePayload = calls[0]?.[0];

    if (!updatePayload) {
      throw new Error("ожидался вызов mockUpdate с телом запроса");
    }

    const fd = updatePayload.body;
    expect(fd.get("title")).toBe("После сохранения");
    expect(updatePayload.id).toBe(project.id);
  });
});
