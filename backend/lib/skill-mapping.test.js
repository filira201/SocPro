const {
  flattenUserSkills,
  flattenProjectRequiredSkills,
  flattenSkillsDeep,
} = require("./skill-mapping");

describe("flattenUserSkills", () => {
  test("заменяет join-строки на объекты skill", () => {
    // Arrange
    const user = {
      id: "1",
      skills: [
        { skillId: "s1", skill: { id: "s1", name: "JavaScript" } },
        { skillId: "s2", skill: { id: "s2", name: "React" } },
      ],
    };

    // Act
    const result = flattenUserSkills(user);

    // Assert
    expect(result.skills).toEqual([
      { id: "s1", name: "JavaScript" },
      { id: "s2", name: "React" },
    ]);
  });
});

describe("flattenProjectRequiredSkills", () => {
  test("заменяет join-строки на объекты skill", () => {
    // Arrange
    const project = {
      id: "p1",
      requiredSkills: [
        { skillId: "s1", skill: { id: "s1", name: "TypeScript" } },
      ],
    };

    // Act
    const result = flattenProjectRequiredSkills(project);

    // Assert
    expect(result.requiredSkills).toEqual([{ id: "s1", name: "TypeScript" }]);
  });
});

describe("flattenSkillsDeep", () => {
  test("рекурсивно разворачивает навыки во вложенных объектах", () => {
    // Arrange
    const payload = {
      items: [
        {
          user: {
            skills: [{ skill: { id: "s1", name: "Go" } }],
          },
        },
      ],
      project: {
        requiredSkills: [{ skill: { id: "s2", name: "Docker" } }],
      },
    };

    // Act
    flattenSkillsDeep(payload);

    // Assert
    expect(payload.items[0].user.skills).toEqual([{ id: "s1", name: "Go" }]);
    expect(payload.project.requiredSkills).toEqual([
      { id: "s2", name: "Docker" },
    ]);
  });
});
