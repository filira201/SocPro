const {
  USER_EMAIL_MAX,
  assertMaxLength,
  assertOptionalMaxLength,
} = require("./field-limits");

describe("assertMaxLength", () => {
  test("возвращает null если длина не превышает лимит", () => {
    // Arrange
    const value = "a".repeat(USER_EMAIL_MAX);

    // Act
    const result = assertMaxLength(value, USER_EMAIL_MAX, "Слишком длинно");

    // Assert
    expect(result).toBeNull();
  });

  test("возвращает ошибку если длина превышает лимит", () => {
    // Arrange
    const value = "a".repeat(USER_EMAIL_MAX + 1);

    // Act
    const result = assertMaxLength(value, USER_EMAIL_MAX, "Слишком длинно");

    // Assert
    expect(result).toEqual({ error: "Слишком длинно" });
  });
});

describe("assertOptionalMaxLength", () => {
  test("пропускает null и undefined", () => {
    // Act & Assert
    expect(assertOptionalMaxLength(null, 10, "Ошибка")).toBeNull();
    expect(assertOptionalMaxLength(undefined, 10, "Ошибка")).toBeNull();
  });

  test("проверяет длину для заданной строки", () => {
    // Act
    const result = assertOptionalMaxLength("abcdef", 5, "Слишком длинно");

    // Assert
    expect(result).toEqual({ error: "Слишком длинно" });
  });
});
