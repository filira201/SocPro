const {
  canManageMembersAsOwnerOnly,
  canManageProjectAsAdminOrOwner,
  isProjectAdminRole,
  isProjectOwner,
  isTerminalProjectStatus,
  normalizeProjectForApi,
  projectAcceptsApplications,
} = require("./project-access");

const OWNER_ID = "507f1f77bcf86cd799439011";
const OTHER_ID = "507f1f77bcf86cd799439012";

describe("isProjectOwner", () => {
  test("возвращает true для владельца проекта", () => {
    // Arrange
    const project = { ownerId: OWNER_ID };

    // Act
    const result = isProjectOwner(project, OWNER_ID);

    // Assert
    expect(result).toBe(true);
  });

  test("возвращает false для чужого пользователя", () => {
    // Arrange
    const project = { ownerId: OWNER_ID };

    // Act
    const result = isProjectOwner(project, OTHER_ID);

    // Assert
    expect(result).toBe(false);
  });
});

describe("canManageProjectAsAdminOrOwner", () => {
  test("разрешает владельцу без membership", () => {
    // Arrange
    const project = { ownerId: OWNER_ID };

    // Act
    const result = canManageProjectAsAdminOrOwner(project, OWNER_ID, null);

    // Assert
    expect(result).toBe(true);
  });

  test("разрешает участнику с ролью ADMIN", () => {
    // Arrange
    const project = { ownerId: OWNER_ID };

    // Act
    const result = canManageProjectAsAdminOrOwner(project, OTHER_ID, {
      role: "ADMIN",
    });

    // Assert
    expect(result).toBe(true);
  });

  test("запрещает обычному участнику", () => {
    // Arrange
    const project = { ownerId: OWNER_ID };

    // Act
    const result = canManageProjectAsAdminOrOwner(project, OTHER_ID, {
      role: "MEMBER",
    });

    // Assert
    expect(result).toBe(false);
  });
});

describe("canManageMembersAsOwnerOnly", () => {
  test("разрешает только владельцу", () => {
    // Act & Assert
    expect(canManageMembersAsOwnerOnly({ ownerId: OWNER_ID }, OWNER_ID)).toBe(
      true,
    );
    expect(canManageMembersAsOwnerOnly({ ownerId: OWNER_ID }, OTHER_ID)).toBe(
      false,
    );
  });
});

describe("isTerminalProjectStatus", () => {
  test("считает DONE и CLOSED терминальными", () => {
    // Act & Assert
    expect(isTerminalProjectStatus("DONE")).toBe(true);
    expect(isTerminalProjectStatus("CLOSED")).toBe(true);
    expect(isTerminalProjectStatus("OPEN")).toBe(false);
  });
});

describe("projectAcceptsApplications", () => {
  test("не принимает заявки при терминальном статусе", () => {
    // Arrange
    const project = { status: "DONE", acceptingApplications: true };

    // Act
    const result = projectAcceptsApplications(project);

    // Assert
    expect(result).toBe(false);
  });

  test("считает проект открытым если поле acceptingApplications отсутствует", () => {
    // Arrange
    const project = { status: "OPEN" };

    // Act
    const result = projectAcceptsApplications(project);

    // Assert
    expect(result).toBe(true);
  });

  test("учитывает явное значение acceptingApplications", () => {
    // Act & Assert
    expect(
      projectAcceptsApplications({
        status: "OPEN",
        acceptingApplications: false,
      }),
    ).toBe(false);
    expect(
      projectAcceptsApplications({
        status: "IN_PROGRESS",
        acceptingApplications: true,
      }),
    ).toBe(true);
  });
});

describe("normalizeProjectForApi", () => {
  test("добавляет вычисленные поля для ответа API", () => {
    // Arrange
    const createdAt = new Date("2024-01-01T00:00:00.000Z");
    const project = {
      id: "p1",
      status: "OPEN",
      createdAt,
    };

    // Act
    const result = normalizeProjectForApi(project);

    // Assert
    expect(result.acceptingApplications).toBe(true);
    expect(result.statusUpdatedAt).toEqual(createdAt);
  });
});

describe("isProjectAdminRole", () => {
  test("возвращает true только для ADMIN", () => {
    // Act & Assert
    expect(isProjectAdminRole({ role: "ADMIN" })).toBe(true);
    expect(isProjectAdminRole({ role: "MEMBER" })).toBe(false);
    expect(isProjectAdminRole(null)).toBe(false);
  });
});
