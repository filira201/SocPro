const {
  flattenUserResume,
  flattenUserContacts,
  flattenUserProfile,
} = require("./user-flatten");

describe("flattenUserResume", () => {
  test("разворачивает resume в плоские поля API", () => {
    // Arrange
    const user = {
      id: "1",
      resume: {
        url: "/uploads/cv.pdf",
        originalName: "cv.pdf",
        mimeType: "application/pdf",
        size: 100,
      },
    };

    // Act
    const result = flattenUserResume(user);

    // Assert
    expect(result.resumeUrl).toBe("/uploads/cv.pdf");
    expect(result.resumeOriginalName).toBe("cv.pdf");
    expect(result.resume).toBeUndefined();
  });
});

describe("flattenUserContacts", () => {
  test("сортирует контакты по position и отдаёт values", () => {
    // Arrange
    const user = {
      id: "1",
      contactList: [
        { position: 2, value: "second" },
        { position: 1, value: "first" },
      ],
    };

    // Act
    const result = flattenUserContacts(user);

    // Assert
    expect(result.contacts).toEqual(["first", "second"]);
    expect(result.contactList).toBeUndefined();
  });
});

describe("flattenUserProfile", () => {
  test("применяет оба преобразования", () => {
    // Arrange
    const user = {
      id: "1",
      resume: { url: "/uploads/cv.pdf" },
      contactList: [{ position: 1, value: "tg" }],
    };

    // Act
    const result = flattenUserProfile(user);

    // Assert
    expect(result.resumeUrl).toBe("/uploads/cv.pdf");
    expect(result.contacts).toEqual(["tg"]);
  });
});
