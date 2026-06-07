const {
  MAX_USER_FIO_SEARCH_Q,
  buildUserFioSearchFilter,
} = require("./user-directory-list");

describe("buildUserFioSearchFilter", () => {
  test("возвращает null для пустого запроса", () => {
    // Act & Assert
    expect(buildUserFioSearchFilter("")).toBeNull();
  });

  test("строит фильтр по одному слову в ФИО", () => {
    // Act
    const result = buildUserFioSearchFilter("иван");

    // Assert
    expect(result).toEqual({
      OR: [
        { firstName: { contains: "иван", mode: "insensitive" } },
        { lastName: { contains: "иван", mode: "insensitive" } },
        { patronymic: { contains: "иван", mode: "insensitive" } },
      ],
    });
  });

  test("требует все слова при нескольких токенах", () => {
    // Act
    const result = buildUserFioSearchFilter("иван петров");

    // Assert
    expect(result.AND).toHaveLength(2);
  });

  test("обрезает запрос по лимиту", () => {
    // Arrange
    const longQ = "а".repeat(MAX_USER_FIO_SEARCH_Q + 50);

    // Act
    const result = buildUserFioSearchFilter(longQ);

    // Assert
    expect(result.OR[0].firstName.contains).toHaveLength(MAX_USER_FIO_SEARCH_Q);
  });
});
