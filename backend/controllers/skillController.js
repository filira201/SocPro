const { prisma } = require("../prisma/prismaClient");

const SkillController = {
  list: async (req, res) => {
    const { q } = req.query;
    const take = Math.min(parseInt(req.query.take, 10) || 50, 200);

    try {
      const where = q
        ? { name: { contains: String(q), mode: "insensitive" } }
        : {};

      const skills = await prisma.skill.findMany({
        where,
        orderBy: { name: "asc" },
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

    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: "Название навыка обязательно" });
    }

    const normalized = String(name).trim();

    try {
      const existing = await prisma.skill.findFirst({
        where: { name: { equals: normalized, mode: "insensitive" } },
      });

      if (existing) {
        return res.status(200).json(existing);
      }

      const skill = await prisma.skill.create({
        data: { name: normalized },
      });

      res.status(201).json(skill);
    } catch (error) {
      console.error("Error in skill create", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
};

module.exports = SkillController;
