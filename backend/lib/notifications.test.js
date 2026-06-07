const { createNotification } = require("./notifications");

describe("createNotification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("не создаёт запись без receiverId или type", async () => {
    // Arrange
    const prisma = { notification: { create: vi.fn() } };

    // Act
    await createNotification(prisma, { receiverId: "", type: "POST_LIKED" });
    await createNotification(prisma, {
      receiverId: "u1",
      type: undefined,
    });

    // Assert
    expect(prisma.notification.create).not.toHaveBeenCalled();
  });

  test("не уведомляет актора о его же действии для обычных типов", async () => {
    // Arrange
    const prisma = { notification: { create: vi.fn() } };

    // Act
    await createNotification(prisma, {
      receiverId: "u1",
      actorId: "u1",
      type: "POST_LIKED",
    });

    // Assert
    expect(prisma.notification.create).not.toHaveBeenCalled();
  });

  test("создаёт уведомление в БД", async () => {
    // Arrange
    const prisma = {
      notification: { create: vi.fn().mockResolvedValue({ id: "n1" }) },
    };

    // Act
    await createNotification(prisma, {
      receiverId: "u1",
      actorId: "u2",
      type: "POST_LIKED",
      postId: "p1",
    });

    // Assert
    expect(prisma.notification.create).toHaveBeenCalledWith({
      data: {
        receiverId: "u1",
        actorId: "u2",
        subjectUserId: null,
        type: "POST_LIKED",
        postId: "p1",
        commentId: null,
        projectId: null,
        applicationId: null,
        projectTitleSnapshot: null,
      },
    });
  });

  test("разрешает self-типы для получателя-актора", async () => {
    // Arrange
    const prisma = {
      notification: { create: vi.fn().mockResolvedValue({ id: "n1" }) },
    };

    // Act
    await createNotification(prisma, {
      receiverId: "u1",
      actorId: "u1",
      type: "PROJECT_APPLICATION_SUBMITTED_SELF",
      projectId: "p1",
    });

    // Assert
    expect(prisma.notification.create).toHaveBeenCalled();
  });
});
