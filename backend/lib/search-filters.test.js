const { buildPostSearchFilter } = require("./search-filters");

describe("buildPostSearchFilter", () => {
  test("возвращает null для пустого запроса", () => {
    // Act & Assert
    expect(buildPostSearchFilter("")).toBeNull();
    expect(buildPostSearchFilter("   ")).toBeNull();
  });

  test("строит фильтр по одному слову", () => {
    // Act
    const result = buildPostSearchFilter("иван");

    // Assert
    expect(result).toEqual({
      OR: [
        { content: { contains: "иван", mode: "insensitive" } },
        { author: { firstName: { contains: "иван", mode: "insensitive" } } },
        { author: { lastName: { contains: "иван", mode: "insensitive" } } },
        { author: { patronymic: { contains: "иван", mode: "insensitive" } } },
      ],
    });
  });

  test("требует все слова при нескольких токенах", () => {
    // Act
    const result = buildPostSearchFilter("иван петров");

    // Assert
    expect(result.AND).toHaveLength(2);
    expect(result.AND[0].OR[0].content.contains).toBe("иван");
    expect(result.AND[1].OR[0].content.contains).toBe("петров");
  });
});
