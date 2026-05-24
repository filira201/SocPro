/**
 * Прослойка между новой реляционной m2m (UserSkill / ProjectRequiredSkill)
 * и плоским контрактом API: фронт ожидает `user.skills = [{id, name, ...}]`,
 * а Prisma возвращает `[{ userId, skillId, skill: {id, name, ...} }]`.
 *
 * Используется сразу после Prisma `findMany/findUnique/update` с
 * `include: { skills: { include: { skill: true } } }`.
 */

function flattenUserSkills(user) {
  if (!user || typeof user !== "object") {
    return user;
  }

  if (Array.isArray(user.skills)) {
    user.skills = user.skills
      .map((row) =>
        row && typeof row === "object" && "skill" in row ? row.skill : row,
      )
      .filter(Boolean);
  }

  return user;
}

function flattenProjectRequiredSkills(project) {
  if (!project || typeof project !== "object") {
    return project;
  }

  if (Array.isArray(project.requiredSkills)) {
    project.requiredSkills = project.requiredSkills
      .map((row) =>
        row && typeof row === "object" && "skill" in row ? row.skill : row,
      )
      .filter(Boolean);
  }

  return project;
}

/** Глубокий обход для коллекций пользователей/проектов; по месту меняет поля. */
function flattenSkillsDeep(value) {
  if (Array.isArray(value)) {
    for (const item of value) {
      flattenSkillsDeep(item);
    }
    return value;
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  if (Array.isArray(value.skills)) {
    flattenUserSkills(value);
  }

  if (Array.isArray(value.requiredSkills)) {
    flattenProjectRequiredSkills(value);
  }

  for (const key of Object.keys(value)) {
    const v = value[key];

    if (v && typeof v === "object" && !(v instanceof Date)) {
      flattenSkillsDeep(v);
    }
  }

  return value;
}

module.exports = {
  flattenUserSkills,
  flattenProjectRequiredSkills,
  flattenSkillsDeep,
};
