const { buildHaystack, resolveOrCreateSkill } = require("./skill-resolve");

describe("buildHaystack", () => {
  test("собирает имя и ключи алиасов без дубликатов", () => {
    // Arrange
    const skill = {
      name: "JavaScript",
      aliases: [{ key: "javascript" }, { key: "js" }],
    };

    // Act
    const result = buildHaystack(skill);

    // Assert
    expect(result).toContain("JavaScript");
    expect(result).toContain("javascript");
    expect(result).toContain("js");
  });
});

describe("resolveOrCreateSkill", () => {
  test("бросает EMPTY_NAME для пустого ввода", async () => {
    // Arrange
    const prisma = {};

    // Act & Assert
    await expect(resolveOrCreateSkill(prisma, "   ")).rejects.toMatchObject({
      code: "EMPTY_NAME",
    });
  });

  test("возвращает навык по точному алиасу", async () => {
    // Arrange
    const skill = { id: "s1", name: "JavaScript" };
    const prisma = {
      skillAlias: {
        findUnique: vi.fn().mockResolvedValue({ skill }),
      },
    };

    // Act
    const result = await resolveOrCreateSkill(prisma, "JavaScript");

    // Assert
    expect(result).toEqual({ skill, matchedBy: "alias" });
    expect(prisma.skillAlias.findUnique).toHaveBeenCalledWith({
      where: { key: "javascript" },
      include: { skill: true },
    });
  });

  test("создаёт новый навык если совпадений нет", async () => {
    // Arrange
    const created = { id: "new1", name: "Rust" };
    const prisma = {
      skillAlias: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({}),
      },
      skill: {
        findFirst: vi.fn().mockResolvedValue(null),
        findMany: vi.fn().mockResolvedValue([]),
        create: vi.fn().mockResolvedValue(created),
      },
    };

    // Act
    const result = await resolveOrCreateSkill(prisma, "Rust", {
      skipFuse: true,
    });

    // Assert
    expect(result).toEqual({ skill: created, matchedBy: "created" });
    expect(prisma.skill.create).toHaveBeenCalledWith({
      data: { name: "Rust" },
    });
  });
});
