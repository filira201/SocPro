const { VALID_ID } = require("./id");
const {
  COMMENT_SORT,
  normalizeCommentSort,
  getCommentOrderBy,
  compareTopComments,
  mapPost,
  mapComment,
  collectCommentLevelsByPost,
} = require("./feed-mappers");

const USER_ID = VALID_ID;
const OTHER_ID = "507f1f77bcf86cd799439012";

describe("normalizeCommentSort", () => {
  test("возвращает new по умолчанию", () => {
    // Act & Assert
    expect(normalizeCommentSort("unknown")).toBe(COMMENT_SORT.NEW);
    expect(normalizeCommentSort(COMMENT_SORT.TOP)).toBe(COMMENT_SORT.TOP);
  });
});

describe("getCommentOrderBy", () => {
  test("возвращает сортировку для top", () => {
    // Act
    const result = getCommentOrderBy(COMMENT_SORT.TOP);

    // Assert
    expect(result[0]).toEqual({ likes: { _count: "desc" } });
  });
});

describe("compareTopComments", () => {
  test("сортирует по сумме лайков и ответов", () => {
    // Arrange
    const a = {
      _count: { likes: 1, replies: 0 },
      createdAt: "2024-01-02T00:00:00.000Z",
    };
    const b = {
      _count: { likes: 2, replies: 0 },
      createdAt: "2024-01-01T00:00:00.000Z",
    };

    // Act
    const result = compareTopComments(a, b);

    // Assert
    expect(result).toBeGreaterThan(0);
  });
});

describe("mapPost", () => {
  test("добавляет счётчики и флаги без password/email", () => {
    // Arrange
    const createdAt = new Date("2024-01-01T00:00:00.000Z");
    const post = {
      id: "p1",
      authorId: USER_ID,
      content: "текст",
      createdAt,
      updatedAt: createdAt,
      author: {
        id: USER_ID,
        email: "a@example.com",
        password: "hash",
        firstName: "Иван",
      },
      likes: [{ userId: USER_ID }],
      comments: [{ id: "c1" }, { id: "c2" }],
    };

    // Act
    const result = mapPost(post, USER_ID);

    // Assert
    expect(result.likeCount).toBe(1);
    expect(result.commentCount).toBe(2);
    expect(result.likedByUser).toBe(true);
    expect(result.isOwner).toBe(true);
    expect(result.isEdited).toBe(false);
    expect(result.author.email).toBeUndefined();
  });
});

describe("mapComment", () => {
  test("добавляет данные ответа и владельца", () => {
    // Arrange
    const comment = {
      id: "c1",
      userId: USER_ID,
      postId: "p1",
      content: "коммент",
      createdAt: new Date("2024-01-01T00:00:00.000Z"),
      updatedAt: new Date("2024-01-01T00:00:00.000Z"),
      parentId: "c0",
      user: { id: USER_ID, firstName: "Иван", email: "a@example.com" },
      parent: {
        userId: OTHER_ID,
        user: { firstName: "Пётр", lastName: "Сидоров" },
      },
      likes: [{ id: "l1" }],
      _count: { likes: 3, replies: 1 },
    };

    // Act
    const result = mapComment(comment, USER_ID);

    // Assert
    expect(result.isOwner).toBe(true);
    expect(result.isReply).toBe(true);
    expect(result.replyToDisplayName).toBe("Пётр Сидоров");
    expect(result.likeCount).toBe(3);
    expect(result.likedByUser).toBe(true);
  });
});

describe("collectCommentLevelsByPost", () => {
  test("группирует комментарии по уровням вложенности", () => {
    // Arrange
    const comments = [
      { id: "c1", parentId: null },
      { id: "c2", parentId: "c1" },
      { id: "c3", parentId: "c2" },
    ];

    // Act
    const levels = collectCommentLevelsByPost(comments);

    // Assert
    expect(levels).toEqual([["c1"], ["c2"], ["c3"]]);
  });

  test("возвращает пустой массив для пустого списка", () => {
    // Act & Assert
    expect(collectCommentLevelsByPost([])).toEqual([]);
  });
});
