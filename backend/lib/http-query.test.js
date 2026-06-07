const { VALID_ID } = require("./id");
const {
  normalizeListLimit,
  parseTruthyQueryFlag,
  parseSortOldestFirst,
  parseRequiredSkillIdsFromBody,
  parseRemoveAttachmentIds,
  parseAcceptingApplicationsBody,
  optionalTrimmedString,
  normalizeOptionalName,
} = require("./http-query");

describe("normalizeListLimit", () => {
  test("возвращает значение по умолчанию для невалидного limit", () => {
    // Act & Assert
    expect(normalizeListLimit("abc", { defaultLimit: 10, maxLimit: 50 })).toBe(
      10,
    );
    expect(normalizeListLimit(-1, { defaultLimit: 10, maxLimit: 50 })).toBe(10);
  });

  test("ограничивает limit сверху", () => {
    // Act
    const result = normalizeListLimit(100, {
      defaultLimit: 10,
      maxLimit: 50,
    });

    // Assert
    expect(result).toBe(50);
  });
});

describe("parseTruthyQueryFlag", () => {
  test("распознаёт истинные значения", () => {
    // Act & Assert
    expect(parseTruthyQueryFlag("1")).toBe(true);
    expect(parseTruthyQueryFlag("true")).toBe(true);
    expect(parseTruthyQueryFlag("YES")).toBe(true);
    expect(parseTruthyQueryFlag("0")).toBe(false);
  });
});

describe("parseSortOldestFirst", () => {
  test("возвращает true только для old", () => {
    // Act & Assert
    expect(parseSortOldestFirst("old")).toBe(true);
    expect(parseSortOldestFirst("new")).toBe(false);
  });
});

describe("parseRequiredSkillIdsFromBody", () => {
  test("разбирает массив и JSON-строку", () => {
    // Act & Assert
    expect(parseRequiredSkillIdsFromBody([VALID_ID])).toEqual([VALID_ID]);
    expect(parseRequiredSkillIdsFromBody(`["${VALID_ID}"]`)).toEqual([
      VALID_ID,
    ]);
    expect(parseRequiredSkillIdsFromBody("")).toEqual([]);
  });
});

describe("parseRemoveAttachmentIds", () => {
  test("фильтрует только валидные id вложений", () => {
    // Act
    const result = parseRemoveAttachmentIds([VALID_ID, "x"]);

    // Assert
    expect(result).toEqual([VALID_ID]);
  });
});

describe("parseAcceptingApplicationsBody", () => {
  test("возвращает undefined если поле не передано", () => {
    // Assert
    expect(parseAcceptingApplicationsBody(undefined)).toBeUndefined();
  });

  test("парсит boolean и строки true/false", () => {
    // Act & Assert
    expect(parseAcceptingApplicationsBody(true)).toBe(true);
    expect(parseAcceptingApplicationsBody("false")).toBe(false);
    expect(parseAcceptingApplicationsBody("maybe")).toBeNull();
  });
});

describe("optionalTrimmedString", () => {
  test("возвращает undefined если ключ отсутствует", () => {
    // Act
    const result = optionalTrimmedString({}, "bio");

    // Assert
    expect(result).toBeUndefined();
  });

  test("возвращает null для пустой строки после trim", () => {
    // Act
    const result = optionalTrimmedString({ bio: "   " }, "bio");

    // Assert
    expect(result).toBeNull();
  });

  test("возвращает обрезанную строку", () => {
    // Act
    const result = optionalTrimmedString({ bio: "  текст  " }, "bio");

    // Assert
    expect(result).toBe("текст");
  });
});

describe("normalizeOptionalName", () => {
  test("возвращает null для пустых значений", () => {
    // Act & Assert
    expect(normalizeOptionalName(undefined)).toBeNull();
    expect(normalizeOptionalName("  ")).toBeNull();
  });

  test("возвращает trim-строку", () => {
    // Act
    const result = normalizeOptionalName("  Петров  ");

    // Assert
    expect(result).toBe("Петров");
  });
});
