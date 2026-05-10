/**
 * Заполняет канонические навыки и таблицу SkillAlias (точные синонимы).
 * После изменения схемы: ./node_modules/.bin/prisma generate && npm run seed:skills
 */
const { prisma } = require("./prismaClient");
const { cleanSkillKey } = require("../lib/skill-normalize");

/** Каноническое имя + варианты ввода (после clean() совпадают с ключами). */
const CANONICAL_SKILLS = [
  {
    name: "JavaScript",
    aliases: ["js", "javascript", "java script", "ecmascript"],
  },
  { name: "Java", aliases: ["java"] },
  {
    name: "Spring Boot",
    aliases: ["spring boot", "java spring", "springboot", "spring"],
  },
  {
    name: "Node.js",
    aliases: ["node", "nodejs", "node js"],
  },
  {
    name: "React",
    aliases: ["react", "reactjs", "react js"],
  },
  {
    name: "TypeScript",
    aliases: ["typescript", "ts"],
  },
];

async function upsertCanonical() {
  for (const row of CANONICAL_SKILLS) {
    let skill = await prisma.skill.findFirst({
      where: { name: { equals: row.name, mode: "insensitive" } },
    });

    if (!skill) {
      skill = await prisma.skill.create({ data: { name: row.name } });
    }

    const keys = new Set(
      [cleanSkillKey(row.name), ...row.aliases.map((a) => cleanSkillKey(a))],
    );

    for (const key of keys) {
      if (!key) continue;

      await prisma.skillAlias.upsert({
        where: { key },
        create: { key, skillId: skill.id },
        update: { skillId: skill.id },
      });
    }
  }
}

/** Для уже существующих в БД навыков без primary-ключа. */
async function backfillPrimaryAliases() {
  const skills = await prisma.skill.findMany({
    include: { aliases: true },
  });

  for (const s of skills) {
    const key = cleanSkillKey(s.name);
    const hasPrimary = s.aliases.some((a) => a.key === key);

    if (hasPrimary) continue;

    const clash = await prisma.skillAlias.findUnique({ where: { key } });

    if (!clash) {
      await prisma.skillAlias.create({
        data: { key, skillId: s.id },
      });
    }
  }
}

async function main() {
  await upsertCanonical();
  await backfillPrimaryAliases();
  console.log("Skill aliases seed OK");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
