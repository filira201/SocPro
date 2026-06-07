const {
  ID_REGEX,
  VALID_ID,
  isValidId,
  parseCsvIds,
  filterValidIds,
} = require("./id");

describe("isValidId", () => {
  test("принимает MongoDB ObjectId", () => {
    // Act & Assert
    expect(isValidId(VALID_ID)).toBe(true);
    expect(isValidId(VALID_ID.toUpperCase())).toBe(true);
  });

  test("принимает cuid-подобный id", () => {
    // Act & Assert
    expect(isValidId("clxyz123456789012345678901")).toBe(true);
  });

  test("отклоняет слишком короткий id", () => {
    // Act & Assert
    expect(isValidId("abc")).toBe(false);
    expect(isValidId("")).toBe(false);
  });
});

describe("parseCsvIds", () => {
  test("разбирает CSV валидных id", () => {
    // Arrange
    const second = "507f1f77bcf86cd799439012";

    // Act
    const result = parseCsvIds(`${VALID_ID}, ${second}`);

    // Assert
    expect(result).toEqual([VALID_ID, second]);
  });

  test("отфильтровывает невалидные значения", () => {
    // Act
    const result = parseCsvIds(`${VALID_ID},bad,short`);

    // Assert
    expect(result).toEqual([VALID_ID]);
  });

  test("возвращает пустой массив для пустого ввода", () => {
    // Act & Assert
    expect(parseCsvIds("")).toEqual([]);
    expect(parseCsvIds(null)).toEqual([]);
  });
});

describe("filterValidIds", () => {
  test("принимает массив id", () => {
    // Act
    const result = filterValidIds([VALID_ID, "bad"]);

    // Assert
    expect(result).toEqual([VALID_ID]);
  });

  test("принимает JSON-массив в строке", () => {
    // Act
    const result = filterValidIds(`["${VALID_ID}", "bad"]`);

    // Assert
    expect(result).toEqual([VALID_ID]);
  });

  test("принимает CSV-строку", () => {
    // Act
    const result = filterValidIds(VALID_ID);

    // Assert
    expect(result).toEqual([VALID_ID]);
  });
});

describe("ID_REGEX", () => {
  test("экспортируется для контроллеров", () => {
    // Assert
    expect(ID_REGEX).toBeInstanceOf(RegExp);
  });
});
