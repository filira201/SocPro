const { prisma } = require("../prisma/prismaClient");
const { cleanSkillKey } = require("../lib/skill-normalize");
const { resolveOrCreateSkill } = require("../lib/skill-resolve");

const { ID_REGEX } = require("../lib/id");
const OBJECT_ID_REGEX = ID_REGEX;
const MAX_SKILL_RESOLVE_IDS = 30;

function parseSkillIdsParam(value) {
  if (!value) {
    return [];
  }

  return String(value)
    .split(",")
    .map((s) => s.trim())
    .filter((s) => OBJECT_ID_REGEX.test(s));
}

const SkillController = {
  list: async (req, res) => {
    const { q } = req.query;
    const take = Math.min(parseInt(req.query.take, 10) || 50, 200);
    const skip = Math.max(parseInt(req.query.skip, 10) || 0, 0);

    try {
      let where = {};

      if (q) {
        const needle = String(q);
        const keyNeedle = cleanSkillKey(needle);

        where = {
          OR: [
            { name: { contains: needle, mode: "insensitive" } },
            {
              aliases: {
                some: { key: { contains: keyNeedle, mode: "insensitive" } },
              },
            },
          ],
        };
      }

      const skills = await prisma.skill.findMany({
        where,
        include: { aliases: { select: { id: true, key: true } } },
        orderBy: { name: "asc" },
        skip,
        take,
      });

      res.json(skills);
    } catch (error) {
      console.error("Error in skill list", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  resolveByIds: async (req, res) => {
    const ids = parseSkillIdsParam(req.query.ids);

    if (!ids.length) {
      return res.json([]);
    }

    if (ids.length > MAX_SKILL_RESOLVE_IDS) {
      return res.status(400).json({ error: "Слишком много идентификаторов" });
    }

    const unique = [...new Set(ids)];

    try {
      const skills = await prisma.skill.findMany({
        where: { id: { in: unique } },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      });

      res.json(skills);
    } catch (error) {
      console.error("Error in skill resolveByIds", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  create: async (req, res) => {
    const { name } = req.body;
    /** Только точный алиас и совпадение имени; без Fuse (после отказа пользователя от fuzzy в UI). */
    const skipFuse = req.body.skipFuse === true || req.body.skipFuse === "true";

    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: "Название навыка обязательно" });
    }

    try {
      const { skill, matchedBy } = await resolveOrCreateSkill(prisma, name, {
        skipFuse,
      });

      if (matchedBy === "created") {
        return res.status(201).json({ ...skill, matchedBy });
      }

      return res.status(200).json({ ...skill, matchedBy });
    } catch (err) {
      if (err.code === "EMPTY_NAME") {
        return res.status(400).json({ error: "Название навыка обязательно" });
      }

      console.error("Error in skill create", err);
      res.status(500).json({ error: "Internal server error" });
    }
  },
};

module.exports = SkillController;
