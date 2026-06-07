const {
  COMMENT_PREVIEW_MAX,
  truncateCommentPreview,
} = require("./notification-preview");

describe("truncateCommentPreview", () => {
  test("возвращает короткий текст без изменений", () => {
    // Act
    const result = truncateCommentPreview("короткий комментарий");

    // Assert
    expect(result).toBe("короткий комментарий");
  });

  test("обрезает длинный текст с многоточием", () => {
    // Arrange
    const longText = "а".repeat(COMMENT_PREVIEW_MAX + 10);

    // Act
    const result = truncateCommentPreview(longText);

    // Assert
    expect(result.length).toBe(COMMENT_PREVIEW_MAX);
    expect(result.endsWith("…")).toBe(true);
  });

  test("обрезает пробелы по краям", () => {
    // Act
    const result = truncateCommentPreview("  текст  ");

    // Assert
    expect(result).toBe("текст");
  });
});
