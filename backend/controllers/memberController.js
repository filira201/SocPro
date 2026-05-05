const { prisma } = require("../prisma/prismaClient");
const { sanitizeUser } = require("./_utils");

const OBJECT_ID_REGEX = /^[a-f\d]{24}$/i;

const MemberController = {
  listMembers: async (req, res) => {
    const { id: projectId } = req.params;

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

      const members = await prisma.projectMember.findMany({
        where: { projectId },
        include: { user: { include: { skills: true } } },
        orderBy: { joinedAt: "asc" },
      });

      res.json(sanitizeUser(members));
    } catch (error) {
      console.error("Error in listMembers", error);
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

      const isOwner = project.ownerId === requesterId;
      const isSelf = requesterId === targetUserId;

      if (!isOwner && !isSelf) {
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
