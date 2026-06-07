const {
  buildUploadAttachmentData,
  buildProjectDocumentAttachmentData,
} = require("./attachment-meta");

describe("buildUploadAttachmentData", () => {
  test("формирует метаданные изображения", () => {
    // Arrange
    const file = {
      filename: "photo.jpg",
      originalname: "photo.jpg",
      mimetype: "image/jpeg",
      size: 1024,
    };

    // Act
    const result = buildUploadAttachmentData(file);

    // Assert
    expect(result).toEqual({
      url: "/uploads/photo.jpg",
      filename: "photo.jpg",
      originalName: "photo.jpg",
      mimeType: "image/jpeg",
      size: 1024,
      kind: "image",
    });
  });

  test("помечает не-изображение как document", () => {
    // Arrange
    const file = {
      filename: "doc.pdf",
      originalname: "doc.pdf",
      mimetype: "application/pdf",
      size: 2048,
    };

    // Act
    const result = buildUploadAttachmentData(file);

    // Assert
    expect(result.kind).toBe("document");
  });
});

describe("buildProjectDocumentAttachmentData", () => {
  test("всегда возвращает kind document", () => {
    // Arrange
    const file = {
      filename: "spec.pdf",
      originalname: "spec.pdf",
      mimetype: "application/pdf",
      size: 512,
    };

    // Act
    const result = buildProjectDocumentAttachmentData(file);

    // Assert
    expect(result.kind).toBe("document");
    expect(result.url).toBe("/uploads/spec.pdf");
  });
});
