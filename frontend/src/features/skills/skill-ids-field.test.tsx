import { screen, within } from "@testing-library/react";
import type { UserEvent } from "@testing-library/user-event";
import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import {
  useCreateSkillMutation,
  useLazyListSkillsQuery,
} from "./api/skills.api";
import type { SkillWithMatch } from "./api/skills.api";

import type { Skill } from "@/features/auth";
import { ProjectRequiredSkillsField } from "@/features/projects/ui/project-required-skills-field";
import "@/features/skills/api/skills.api";
import { renderWithProviders } from "@/shared/lib/test/render-with-providers";

const EXISTING_SKILL_ID = "507f1f77bcf86cd799439011";
const NEW_SKILL_ID = "507f1f77bcf86cd799439012";
const FUSE_SUGGESTION_ID = "507f1f77bcf86cd799439013";
const REACT_SKILL_ID = "507f1f77bcf86cd799439014";

vi.mock("@/shared/lib/react/use-debounced-value", () => ({
  useDebouncedValue: <T,>(value: T) => value,
}));

vi.mock("./api/skills.api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./api/skills.api")>();

  return {
    ...actual,
    useCreateSkillMutation: vi.fn(),
    useLazyListSkillsQuery: vi.fn(),
  };
});

const mockedUseCreateSkillMutation = vi.mocked(useCreateSkillMutation);
const mockedUseLazyListSkillsQuery = vi.mocked(useLazyListSkillsQuery);

const mockCreateSkill = vi.fn();
const mockTriggerSearch = vi.fn();

function stubRadixDomApis() {
  HTMLElement.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.releasePointerCapture = vi.fn();
  Element.prototype.scrollIntoView = vi.fn();
}

function makeSkill(id: string, name: string): Skill {
  return { id, name };
}

function makeSkillWithMatch(
  id: string,
  name: string,
  matchedBy: SkillWithMatch["matchedBy"]
): SkillWithMatch {
  return { ...makeSkill(id, name), matchedBy };
}

function setupApiMocks() {
  mockedUseCreateSkillMutation.mockReturnValue([
    mockCreateSkill,
    { isLoading: false, reset: vi.fn() },
  ] as unknown as ReturnType<typeof useCreateSkillMutation>);

  mockedUseLazyListSkillsQuery.mockReturnValue([
    mockTriggerSearch,
    { isLoading: false, isFetching: false, reset: vi.fn() },
    {},
  ] as unknown as ReturnType<typeof useLazyListSkillsQuery>);
}

function mockCreateSkillResolved(payload: SkillWithMatch) {
  mockCreateSkill.mockReturnValue({
    unwrap: () => Promise.resolve(payload),
  });
}

function mockListSkills(
  resolver: (args: { q?: string; skip?: number; take?: number }) => Skill[]
) {
  mockTriggerSearch.mockImplementation(
    (args: { q?: string; skip?: number }) => ({
      unwrap: () =>
        Promise.resolve(
          resolver({
            q: args?.q ?? "",
            skip: args?.skip ?? 0,
            take: 20,
          })
        ),
    })
  );
}

type HarnessProps = {
  defaultSkillIds?: string[];
  seedSkills?: Skill[];
  onSkillIdsChange?: (ids: string[]) => void;
};

function SkillsFieldHarness({
  defaultSkillIds = [],
  seedSkills,
  onSkillIdsChange,
}: HarnessProps) {
  const form = useForm({
    defaultValues: { requiredSkillIds: defaultSkillIds },
  });
  const skillIds = useWatch({
    control: form.control,
    name: "requiredSkillIds",
  });

  useEffect(() => {
    onSkillIdsChange?.(skillIds ?? []);
  }, [skillIds, onSkillIdsChange]);

  return (
    <ProjectRequiredSkillsField
      control={form.control}
      seedSkills={seedSkills}
    />
  );
}

function renderSkillsField(props: HarnessProps = {}) {
  let latestIds = props.defaultSkillIds ?? [];

  const result = renderWithProviders(
    <SkillsFieldHarness
      {...props}
      onSkillIdsChange={(ids) => {
        latestIds = ids;
      }}
    />
  );

  return {
    ...result,
    getSkillIds: () => latestIds,
  };
}

function expectChip(skillName: string) {
  const list = screen.getByRole("list", { name: "Выбранные навыки" });
  expect(within(list).getByText(skillName)).toBeInTheDocument();
}

async function openCatalog(user: UserEvent) {
  await user.click(
    screen.getByRole("button", { name: "Добавить из каталога" })
  );
}

async function submitCustomSkill(user: UserEvent, text: string) {
  const input = screen.getByLabelText("Название нового навыка");
  await user.clear(input);
  await user.type(input, text);
  await user.click(screen.getByRole("button", { name: "Добавить навык" }));
}

async function fuseAcceptSuggestion(user: UserEvent, suggestionName: string) {
  await user.click(
    screen.getByRole("button", {
      name: `«${suggestionName}» (как предложено)`,
    })
  );
  await user.click(screen.getByRole("button", { name: "Да" }));
}

async function fuseConfirmOwn(user: UserEvent, userInput: string) {
  await user.click(
    screen.getByRole("button", { name: `«${userInput}» (как вводили)` })
  );
  await user.click(screen.getByRole("button", { name: "Да" }));
}

describe("ProjectRequiredSkillsField / SkillIdsField", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stubRadixDomApis();
    setupApiMocks();
    mockListSkills(() => []);
    mockCreateSkillResolved(
      makeSkillWithMatch(NEW_SKILL_ID, "Новый навык", "created")
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test("находит навык в каталоге и добавляет его без вызова createSkill", async () => {
    // Arrange
    const reactSkill = makeSkill(REACT_SKILL_ID, "React");
    mockListSkills(({ q }) => (q === "rea" ? [reactSkill] : []));
    const { user, getSkillIds } = renderSkillsField();

    // Act
    await openCatalog(user);
    const searchInput = screen.getByPlaceholderText(
      "Поиск или прокрутка списка…"
    );
    await user.type(searchInput, "rea");

    await vi.waitFor(() => {
      expect(mockTriggerSearch).toHaveBeenCalledWith(
        expect.objectContaining({ q: "rea", skip: 0, take: 20 })
      );
    });

    const reactOption = await screen.findByText("React");
    await user.click(reactOption);

    // Assert
    expectChip("React");
    expect(getSkillIds()).toEqual([REACT_SKILL_ID]);
    expect(mockCreateSkill).not.toHaveBeenCalled();
  });

  test("при совпадении по alias добавляет существующий навык и показывает подсказку", async () => {
    // Arrange
    mockCreateSkillResolved(
      makeSkillWithMatch(EXISTING_SKILL_ID, "React", "alias")
    );
    const { user, getSkillIds } = renderSkillsField();

    // Act
    await submitCustomSkill(user, "reactjs");

    // Assert
    await vi.waitFor(() => {
      expect(getSkillIds()).toEqual([EXISTING_SKILL_ID]);
    });
    expectChip("React");
    expect(mockCreateSkill).toHaveBeenCalledTimes(1);
    expect(mockCreateSkill).toHaveBeenCalledWith({ name: "reactjs" });
    expect(screen.getByRole("status")).toHaveTextContent(
      "Сохранено как «React»"
    );
  });

  test("при совпадении по имени добавляет существующий навык без создания новой записи", async () => {
    // Arrange
    mockCreateSkillResolved(
      makeSkillWithMatch(EXISTING_SKILL_ID, "TypeScript", "name")
    );
    const { user, getSkillIds } = renderSkillsField();

    // Act
    await submitCustomSkill(user, "TypeScript");

    // Assert
    await vi.waitFor(() => {
      expect(getSkillIds()).toEqual([EXISTING_SKILL_ID]);
    });
    expectChip("TypeScript");
    expect(mockCreateSkill).toHaveBeenCalledWith({ name: "TypeScript" });
    expect(screen.getByRole("status")).toHaveTextContent(
      "Сохранено как «TypeScript»"
    );
  });

  test("при абсолютно новом навыке добавляет id из ответа без подсказки «Сохранено как»", async () => {
    // Arrange
    const newName = "Rust";
    mockCreateSkillResolved(
      makeSkillWithMatch(NEW_SKILL_ID, newName, "created")
    );
    const { user, getSkillIds } = renderSkillsField();

    // Act
    await submitCustomSkill(user, newName);

    // Assert
    await vi.waitFor(() => {
      expect(getSkillIds()).toEqual([NEW_SKILL_ID]);
    });
    expectChip(newName);
    expect(mockCreateSkill).toHaveBeenCalledWith({ name: newName });
    expect(screen.queryByText(/Сохранено как/)).not.toBeInTheDocument();
  });

  test("при fuse принимает вариант сервера без второго createSkill", async () => {
    // Arrange
    mockCreateSkillResolved(
      makeSkillWithMatch(FUSE_SUGGESTION_ID, "TypeScript", "fuse")
    );
    const { user, getSkillIds } = renderSkillsField();

    // Act
    await submitCustomSkill(user, "тайпскрипт");
    expect(
      screen.getByRole("heading", { name: "Уточните навык" })
    ).toBeInTheDocument();
    await fuseAcceptSuggestion(user, "TypeScript");

    // Assert
    await vi.waitFor(() => {
      expect(getSkillIds()).toEqual([FUSE_SUGGESTION_ID]);
    });
    expectChip("TypeScript");
    expect(mockCreateSkill).toHaveBeenCalledTimes(1);
    expect(mockCreateSkill).toHaveBeenCalledWith({ name: "тайпскрипт" });
    expect(
      screen.queryByRole("heading", { name: "Уточните навык" })
    ).not.toBeInTheDocument();
  });

  test("при fuse сохраняет свой ввод через createSkill со skipFuse", async () => {
    // Arrange
    const userInput = "тайпскрипт";
    mockCreateSkill
      .mockReturnValueOnce({
        unwrap: () =>
          Promise.resolve(
            makeSkillWithMatch(FUSE_SUGGESTION_ID, "TypeScript", "fuse")
          ),
      })
      .mockReturnValueOnce({
        unwrap: () =>
          Promise.resolve(
            makeSkillWithMatch(NEW_SKILL_ID, userInput, "created")
          ),
      });
    const { user, getSkillIds } = renderSkillsField();

    // Act
    await submitCustomSkill(user, userInput);
    await fuseConfirmOwn(user, userInput);

    // Assert
    await vi.waitFor(() => {
      expect(getSkillIds()).toEqual([NEW_SKILL_ID]);
    });
    expectChip(userInput);
    expect(mockCreateSkill).toHaveBeenCalledTimes(2);
    expect(mockCreateSkill).toHaveBeenNthCalledWith(1, { name: userInput });
    expect(mockCreateSkill).toHaveBeenNthCalledWith(2, {
      name: userInput,
      skipFuse: true,
    });
  });

  test("не дублирует навык, если id уже в списке", async () => {
    // Arrange
    const existing = makeSkill(EXISTING_SKILL_ID, "React");
    mockCreateSkillResolved(
      makeSkillWithMatch(EXISTING_SKILL_ID, "React", "alias")
    );
    const { user, getSkillIds } = renderSkillsField({
      defaultSkillIds: [EXISTING_SKILL_ID],
      seedSkills: [existing],
    });

    // Act
    await submitCustomSkill(user, "reactjs");

    // Assert
    await vi.waitFor(() => {
      expect(mockCreateSkill).toHaveBeenCalled();
    });
    expect(getSkillIds()).toEqual([EXISTING_SKILL_ID]);
    expect(
      within(
        screen.getByRole("list", { name: "Выбранные навыки" })
      ).getAllByText("React")
    ).toHaveLength(1);
  });
});
