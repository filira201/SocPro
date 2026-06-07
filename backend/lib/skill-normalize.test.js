const { cleanSkillKey } = require("./skill-normalize");

describe("cleanSkillKey", () => {
  test("приводит строку к нижнему регистру и обрезает пробелы", () => {
    // Arrange
    const input = "  JavaScript  ";

    // Act
    const result = cleanSkillKey(input);

    // Assert
    expect(result).toBe("javascript");
  });

  test("убирает точки и схлопывает пробелы", () => {
    // Arrange
    const input = "Node.js   Core";

    // Act
    const result = cleanSkillKey(input);

    // Assert
    expect(result).toBe("nodejs core");
  });

  test("различает Java и JavaScript после нормализации", () => {
    // Act
    const java = cleanSkillKey("Java");
    const javascript = cleanSkillKey("JavaScript");

    // Assert
    expect(java).toBe("java");
    expect(javascript).toBe("javascript");
    expect(java).not.toBe(javascript);
  });
});
