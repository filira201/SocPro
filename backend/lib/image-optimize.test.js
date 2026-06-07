const { isSvg, isGif } = require("./image-optimize");

describe("isSvg", () => {
  test("определяет SVG по mime-type", () => {
    // Act & Assert
    expect(isSvg("image/svg+xml", "icon.png")).toBe(true);
  });

  test("определяет SVG по расширению", () => {
    // Act & Assert
    expect(isSvg("image/png", "icon.svg")).toBe(true);
  });

  test("возвращает false для обычного изображения", () => {
    // Act & Assert
    expect(isSvg("image/jpeg", "photo.jpg")).toBe(false);
  });
});

describe("isGif", () => {
  test("определяет GIF по mime-type", () => {
    // Act & Assert
    expect(isGif("image/gif")).toBe(true);
    expect(isGif("image/jpeg")).toBe(false);
  });
});
