const { prisma } = require("../prisma/prismaClient");

const OBJECT_ID_REGEX = /^[a-f\d]{24}$/i;
const PROJECT_STATUSES = new Set(["OPEN", "IN_PROGRESS", "CLOSED"]);

const parseCsvIds = (value) => {
  if (!value) return [];
  return String(value)
    .split(",")
    .map((s) => s.trim())
    .filter((s) => OBJECT_ID_REGEX.test(s));
};

const ProjectController = {
  createProject: async (req, res) => {
    const { title, description, goals } = req.body;
    const ownerId = req.user.userId;

    if (!title || !description || !goals) {
      return res
        .status(400)
        .json({ error: "Title, description и goals обязательны" });
    }

    const requiredSkillIds = Array.isArray(req.body.requiredSkillIds)
      ? req.body.requiredSkillIds.filter((id) => OBJECT_ID_REGEX.test(id))
      : parseCsvIds(req.body.requiredSkillIds);

    try {
      const project = await prisma.project.create({
        data: {
          title,
          description,
          goals,
          ownerId,
          ...(requiredSkillIds.length
            ? { requiredSkillIds: { set: requiredSkillIds } }
            : {}),
          members: {
            create: { userId: ownerId, role: "OWNER" },
          },
        },
        include: {
          owner: true,
          requiredSkills: true,
          members: { include: { user: true } },
        },
      });

      res.status(201).json(project);
    } catch (error) {
      console.error("Error in createProject", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  getAllProjects: async (req, res) => {
    const { q, skills, status, ownerId } = req.query;
    const take = Math.min(parseInt(req.query.take, 10) || 20, 100);
    const skip = Math.max(parseInt(req.query.skip, 10) || 0, 0);

    try {
      const where = { AND: [] };

      if (q) {
        where.AND.push({
          OR: [
            { title: { contains: String(q), mode: "insensitive" } },
            { description: { contains: String(q), mode: "insensitive" } },
          ],
        });
      }

      const skillIds = parseCsvIds(skills);
      if (skillIds.length) {
        where.AND.push({
          requiredSkills: { some: { id: { in: skillIds } } },
        });
      }

      if (status && PROJECT_STATUSES.has(String(status))) {
        where.AND.push({ status: String(status) });
      }

      if (ownerId && OBJECT_ID_REGEX.test(String(ownerId))) {
        where.AND.push({ ownerId: String(ownerId) });
      }

      const finalWhere = where.AND.length ? where : {};

      const [items, total] = await Promise.all([
        prisma.project.findMany({
          where: finalWhere,
          include: {
            owner: true,
            requiredSkills: true,
            _count: { select: { members: true, applications: true } },
          },
          orderBy: { createdAt: "desc" },
          take,
          skip,
        }),
        prisma.project.count({ where: finalWhere }),
      ]);

      res.json({ items, total, take, skip });
    } catch (error) {
      console.error("Error in getAllProjects", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  getProjectById: async (req, res) => {
    const { id } = req.params;
    const userId = req.user.userId;

    if (!OBJECT_ID_REGEX.test(id)) {
      return res.status(400).json({ error: "Некорректный id" });
    }

    try {
      const project = await prisma.project.findUnique({
        where: { id },
        include: {
          owner: true,
          requiredSkills: true,
          members: { include: { user: true } },
        },
      });

      if (!project) {
        return res.status(404).json({ error: "Проект не найден" });
      }

      const isOwner = project.ownerId === userId;
      const isMember = project.members.some((m) => m.userId === userId);

      let myApplication = null;
      if (!isMember) {
        myApplication = await prisma.projectApplication.findFirst({
          where: { projectId: id, applicantId: userId },
        });
      }

      let applications = undefined;
      if (isOwner) {
        applications = await prisma.projectApplication.findMany({
          where: { projectId: id },
          include: { applicant: { include: { skills: true } } },
          orderBy: { createdAt: "desc" },
        });
      }

      res.json({
        ...project,
        isOwner,
        isMember,
        myApplication,
        ...(applications !== undefined ? { applications } : {}),
      });
    } catch (error) {
      console.error("Error in getProjectById", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  updateProject: async (req, res) => {
    const { id } = req.params;
    const userId = req.user.userId;

    if (!OBJECT_ID_REGEX.test(id)) {
      return res.status(400).json({ error: "Некорректный id" });
    }

    try {
      const project = await prisma.project.findUnique({ where: { id } });
      if (!project) {
        return res.status(404).json({ error: "Проект не найден" });
      }
      if (project.ownerId !== userId) {
        return res.status(403).json({ error: "Нет доступа" });
      }

      const { title, description, goals, status } = req.body;

      const data = {
        title: title || undefined,
        description: description || undefined,
        goals: goals || undefined,
      };

      if (status !== undefined) {
        if (!PROJECT_STATUSES.has(String(status))) {
          return res.status(400).json({ error: "Некорректный статус" });
        }
        data.status = String(status);
      }

      if (req.body.requiredSkillIds !== undefined) {
        const arr = Array.isArray(req.body.requiredSkillIds)
          ? req.body.requiredSkillIds.filter((sid) => OBJECT_ID_REGEX.test(sid))
          : parseCsvIds(req.body.requiredSkillIds);
        data.requiredSkillIds = { set: arr };
      }

      const updated = await prisma.project.update({
        where: { id },
        data,
        include: {
          owner: true,
          requiredSkills: true,
          members: { include: { user: true } },
        },
      });

      res.json(updated);
    } catch (error) {
      console.error("Error in updateProject", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  deleteProject: async (req, res) => {
    const { id } = req.params;
    const userId = req.user.userId;

    if (!OBJECT_ID_REGEX.test(id)) {
      return res.status(400).json({ error: "Некорректный id" });
    }

    try {
      const project = await prisma.project.findUnique({ where: { id } });
      if (!project) {
        return res.status(404).json({ error: "Проект не найден" });
      }
      if (project.ownerId !== userId) {
        return res.status(403).json({ error: "Нет доступа" });
      }

      await prisma.$transaction([
        prisma.projectApplication.deleteMany({ where: { projectId: id } }),
        prisma.projectMember.deleteMany({ where: { projectId: id } }),
        prisma.project.delete({ where: { id } }),
      ]);

      res.json({ message: "Проект удалён" });
    } catch (error) {
      console.error("Error in deleteProject", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
};

module.exports = ProjectController;
