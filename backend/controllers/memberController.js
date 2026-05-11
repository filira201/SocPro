const { prisma } = require("../prisma/prismaClient");
const { canManageMembersAsOwnerOnly } = require("../lib/project-access");
const { sanitizeUser } = require("./_utils");

const OBJECT_ID_REGEX = /^[a-f\d]{24}$/i;
const ASSIGNABLE_ROLES = new Set(["MEMBER", "ADMIN"]);

const MemberController = {
  listMembers: async (req, res) => {
    const { id: projectId } = req.params;
    const take = Math.min(parseInt(req.query.take, 10) || 10, 50);
    const skip = Math.max(parseInt(req.query.skip, 10) || 0, 0);
    const qRaw = req.query.q !== undefined ? String(req.query.q) : "";
    const q = qRaw.trim();

    if (!OBJECT_ID_REGEX.test(projectId)) {
      return res.status(400).json({ error: "Некорректный id проекта" });
    }

    try {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { id: true },
      });
      if (!project) {
        return res.status(404).json({ error: "Проект не найден" });
      }

      let userFilter = {};

      if (q.length > 0) {
        const tokens = q.split(/\s+/).filter(Boolean);

        if (tokens.length === 1) {
          const t = tokens[0];
          userFilter = {
            user: {
              OR: [
                { firstName: { contains: t, mode: "insensitive" } },
                { lastName: { contains: t, mode: "insensitive" } },
                { patronymic: { contains: t, mode: "insensitive" } },
              ],
            },
          };
        } else {
          userFilter = {
            user: {
              AND: tokens.map((t) => ({
                OR: [
                  { firstName: { contains: t, mode: "insensitive" } },
                  { lastName: { contains: t, mode: "insensitive" } },
                  { patronymic: { contains: t, mode: "insensitive" } },
                ],
              })),
            },
          };
        }
      }

      const where = { projectId, ...userFilter };

      const [members, total] = await Promise.all([
        prisma.projectMember.findMany({
          where,
          include: { user: { include: { skills: true } } },
          orderBy: { joinedAt: "asc" },
          take,
          skip,
        }),
        prisma.projectMember.count({ where }),
      ]);

      res.json(
        sanitizeUser({
          items: members,
          total,
          take,
          skip,
        }),
      );
    } catch (error) {
      console.error("Error in listMembers", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  updateMemberRole: async (req, res) => {
    const { id: projectId, userId: targetUserId } = req.params;
    const requesterId = req.user.userId;
    const { role } = req.body;

    if (
      !OBJECT_ID_REGEX.test(projectId) ||
      !OBJECT_ID_REGEX.test(targetUserId)
    ) {
      return res.status(400).json({ error: "Некорректный id" });
    }

    if (!ASSIGNABLE_ROLES.has(String(role))) {
      return res.status(400).json({
        error: "Укажите role: MEMBER или ADMIN",
      });
    }

    try {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
      });
      if (!project) {
        return res.status(404).json({ error: "Проект не найден" });
      }

      if (!canManageMembersAsOwnerOnly(project, requesterId)) {
        return res.status(403).json({ error: "Нет доступа" });
      }

      if (targetUserId === project.ownerId) {
        return res.status(400).json({
          error: "Нельзя изменить роль владельца проекта",
        });
      }

      const membership = await prisma.projectMember.findFirst({
        where: { projectId, userId: targetUserId },
      });

      if (!membership) {
        return res.status(404).json({
          error: "Пользователь не является участником проекта",
        });
      }

      if (membership.role === "OWNER") {
        return res.status(400).json({
          error: "Нельзя изменить роль владельца",
        });
      }

      const updated = await prisma.projectMember.update({
        where: { id: membership.id },
        data: { role: String(role) },
        include: { user: { include: { skills: true } } },
      });

      res.json(sanitizeUser(updated));
    } catch (error) {
      console.error("Error in updateMemberRole", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  removeMember: async (req, res) => {
    const { id: projectId, userId: targetUserId } = req.params;
    const requesterId = req.user.userId;

    if (
      !OBJECT_ID_REGEX.test(projectId) ||
      !OBJECT_ID_REGEX.test(targetUserId)
    ) {
      return res.status(400).json({ error: "Некорректный id" });
    }

    try {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
      });
      if (!project) {
        return res.status(404).json({ error: "Проект не найден" });
      }

      const isSelf = requesterId === targetUserId;
      if (!isSelf && !canManageMembersAsOwnerOnly(project, requesterId)) {
        return res.status(403).json({ error: "Нет доступа" });
      }

      const membership = await prisma.projectMember.findFirst({
        where: { projectId, userId: targetUserId },
      });

      if (!membership) {
        return res
          .status(404)
          .json({ error: "Пользователь не является участником" });
      }

      if (membership.role === "OWNER") {
        return res
          .status(400)
          .json({ error: "Нельзя удалить владельца проекта" });
      }

      await prisma.$transaction([
        prisma.projectMember.delete({ where: { id: membership.id } }),
        prisma.projectApplication.updateMany({
          where: {
            projectId,
            applicantId: targetUserId,
            status: "ACCEPTED",
          },
          data: { status: "REJECTED", decidedAt: new Date() },
        }),
      ]);

      res.json({ message: "Участник удалён" });
    } catch (error) {
      console.error("Error in removeMember", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
};

module.exports = MemberController;
