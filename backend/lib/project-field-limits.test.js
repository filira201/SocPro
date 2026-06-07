const {
  PROJECT_TITLE_MAX,
  PROJECT_DESCRIPTION_MAX,
  PROJECT_GOALS_MAX,
  PROJECT_APPLICATION_MESSAGE_MAX,
  validateProjectTextsForCreate,
  validateProjectTextForUpdate,
  normalizeApplicationMessage,
} = require("./project-field-limits");

const VALID_PROJECT = {
  title: "Проект",
  description: "Описание проекта",
  goals: "Цели проекта",
};

describe("validateProjectTextsForCreate", () => {
  test("возвращает нормализованные поля для валидного ввода", () => {
    // Act
    const result = validateProjectTextsForCreate(VALID_PROJECT);

    // Assert
    expect(result).toEqual({
      error: null,
      title: "Проект",
      description: "Описание проекта",
      goals: "Цели проекта",
    });
  });

  test("требует название, описание и цели", () => {
    // Act
    const result = validateProjectTextsForCreate({
      title: "  ",
      description: "описание",
      goals: "цели",
    });

    // Assert
    expect(result).toEqual({ error: "Название, описание и цели обязательны" });
  });

  test("возвращает ошибку если название длиннее лимита", () => {
    // Act
    const result = validateProjectTextsForCreate({
      ...VALID_PROJECT,
      title: "а".repeat(PROJECT_TITLE_MAX + 1),
    });

    // Assert
    expect(result.error).toBe(
      `Название слишком длинное (не более ${PROJECT_TITLE_MAX} символов)`,
    );
  });
});

describe("validateProjectTextForUpdate", () => {
  test("пропускает undefined", () => {
    // Act
    const result = validateProjectTextForUpdate(
      undefined,
      PROJECT_TITLE_MAX,
      "Слишком длинно",
    );

    // Assert
    expect(result).toEqual({ error: null, value: undefined });
  });

  test("возвращает ошибку пустого поля если задан emptyMessage", () => {
    // Act
    const result = validateProjectTextForUpdate(
      "   ",
      PROJECT_TITLE_MAX,
      "Слишком длинно",
      "Название обязательно",
    );

    // Assert
    expect(result).toEqual({ error: "Название обязательно", value: null });
  });
});

describe("normalizeApplicationMessage", () => {
  test("пропускает отсутствие сообщения", () => {
    // Act & Assert
    expect(normalizeApplicationMessage(undefined)).toEqual({
      error: null,
      value: undefined,
    });
    expect(normalizeApplicationMessage(null)).toEqual({
      error: null,
      value: undefined,
    });
  });

  test("нормализует пустое сообщение в undefined", () => {
    // Act
    const result = normalizeApplicationMessage("   ");

    // Assert
    expect(result).toEqual({ error: null, value: undefined });
  });

  test("возвращает ошибку если сообщение длиннее лимита", () => {
    // Act
    const result = normalizeApplicationMessage(
      "а".repeat(PROJECT_APPLICATION_MESSAGE_MAX + 1),
    );

    // Assert
    expect(result.error).toBe(
      `Сообщение слишком длинное (не более ${PROJECT_APPLICATION_MESSAGE_MAX} символов)`,
    );
  });
});

describe("лимиты проекта", () => {
  test("синхронны с field-limits", () => {
    // Assert
    expect(PROJECT_DESCRIPTION_MAX).toBe(PROJECT_GOALS_MAX);
  });
});
