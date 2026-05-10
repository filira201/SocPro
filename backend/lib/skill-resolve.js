const Fuse = require("fuse.js");
const {
  cleanSkillKey,
  FUSE_THRESHOLD,
  FUSE_MAX_SCORE,
  FUSE_MIN_SCORE_GAP,
  FUSE_MIN_QUERY_LEN,
} = require("./skill-normalize");

/**
 * Собирает строку для fuzzy-поиска: каноническое имя + все ключи алиасов (без дубликатов).
 */
function buildHaystack(skill) {
  const parts = new Set();
  parts.add(skill.name);
  parts.add(cleanSkillKey(skill.name));
  for (const a of skill.aliases || []) {
    parts.add(a.key);
  }
  return [...parts].join(" ");
}

/**
 * Гарантирует запись SkillAlias с ключом clean(name) для legacy-навыков без алиасов.
 */
async function ensurePrimaryAlias(prisma, skill) {
  const key = cleanSkillKey(skill.name);
  const existing = await prisma.skillAlias.findUnique({ where: { key } });

  if (!existing) {
    await prisma.skillAlias.create({
      data: { key, skillId: skill.id },
    });
    return;
  }

  if (existing.skillId !== skill.id) {
    // Редкий конфликт словаря: не перетираем чужой ключ.
    console.warn(
      `[skill-resolve] alias key collision: "${key}" belongs to another skill`,
    );
  }
}

/**
 * Разрешение ввода пользователя в канонический Skill.
 * Порядок: точный ключ алиаса → совпадение имени (без регистра) → Fuse → создание нового.
 *
 * @returns {{ skill: import('@prisma/client').Skill, matchedBy: 'alias'|'name'|'fuse'|'created' }}
 */
async function resolveOrCreateSkill(prisma, rawName) {
  const trimmed = String(rawName ?? "").trim();

  if (!trimmed) {
    const err = new Error("EMPTY_NAME");
    err.code = "EMPTY_NAME";
    throw err;
  }

  const cleaned = cleanSkillKey(trimmed);

  const byAlias = await prisma.skillAlias.findUnique({
    where: { key: cleaned },
    include: { skill: true },
  });

  if (byAlias?.skill) {
    return { skill: byAlias.skill, matchedBy: "alias" };
  }

  const byName = await prisma.skill.findFirst({
    where: { name: { equals: trimmed, mode: "insensitive" } },
    include: { aliases: true },
  });

  if (byName) {
    await ensurePrimaryAlias(prisma, byName);
    return { skill: byName, matchedBy: "name" };
  }

  if (cleaned.length >= FUSE_MIN_QUERY_LEN) {
    const allSkills = await prisma.skill.findMany({
      include: { aliases: true },
      orderBy: { name: "asc" },
    });

    if (allSkills.length) {
      const fuseDocs = allSkills.map((s) => ({
        skillId: s.id,
        haystack: buildHaystack(s),
      }));

      // См. https://www.fusejs.io/fuzzy-search.html — score 0..1 (лучше = меньше),
      // threshold отсекает кандидатов; ignoreLocation — паттерн в любом месте haystack;
      // ignoreFieldNorm — без штрафа за длинное поле (иначе навык с большим числом
      // алиасов проигрывает коротким именам при том же fuzzy-сходстве).
      const fuse = new Fuse(fuseDocs, {
        keys: ["haystack"],
        threshold: FUSE_THRESHOLD,
        ignoreLocation: true,
        ignoreFieldNorm: true,
        ignoreDiacritics: true,
        includeScore: true,
        minMatchCharLength: 2,
      });

      const hits = fuse.search(cleaned, { limit: 5 });

      if (hits.length) {
        const best = hits[0];
        const score = best.score ?? 1;
        const second = hits[1];
        const secondScore = second?.score ?? 1;
        const ambiguous =
          second &&
          score <= FUSE_MAX_SCORE &&
          secondScore <= FUSE_MAX_SCORE &&
          secondScore - score < FUSE_MIN_SCORE_GAP;

        if (score <= FUSE_MAX_SCORE && !ambiguous) {
          const skill = await prisma.skill.findUnique({
            where: { id: best.item.skillId },
          });

          if (skill) {
            return { skill, matchedBy: "fuse" };
          }
        }
      }
    }
  }

  const skill = await prisma.skill.create({
    data: { name: trimmed },
  });

  await prisma.skillAlias.create({
    data: {
      key: cleaned,
      skillId: skill.id,
    },
  });

  return { skill, matchedBy: "created" };
}

module.exports = {
  resolveOrCreateSkill,
  ensurePrimaryAlias,
  buildHaystack,
};
