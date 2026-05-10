const { prisma } = require("../prisma/prismaClient");
const { cleanSkillKey } = require("../lib/skill-normalize");
const { resolveOrCreateSkill } = require("../lib/skill-resolve");

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
