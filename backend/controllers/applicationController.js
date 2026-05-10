const { prisma } = require("../prisma/prismaClient");
const {
  canManageProjectAsAdminOrOwner,
  projectAcceptsApplications,
} = require("../lib/project-access");
const { sanitizeUser } = require("./_utils");

const OBJECT_ID_REGEX = /^[a-f\d]{24}$/i;

const ApplicationController = {
  apply: async (req, res) => {
    const { id: projectId } = req.params;
    const { message } = req.body;
    const applicantId = req.user.userId;

    if (!OBJECT_ID_REGEX.test(projectId)) {
      return res.status(400).json({ error: "Некорректный id проекта" });
    }

    try {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
      });
      if (!project) {
        return res.status(404).json({ error: "Проект не найден" });
      }

      if (project.ownerId === applicantId) {
        return res
          .status(400)
          .json({ error: "Владелец не может подать заявку на свой проект" });
      }

      if (!projectAcceptsApplications(project)) {
        return res.status(400).json({
          error: "Проект сейчас не принимает новые заявки",
        });
      }

      const existingMember = await prisma.projectMember.findFirst({
        where: { projectId, userId: applicantId },
      });
      if (existingMember) {
        return res
          .status(400)
          .json({ error: "Вы уже являетесь участником проекта" });
      }

      const existingApp = await prisma.projectApplication.findFirst({
        where: {
          projectId,
          applicantId,
          status: { in: ["PENDING", "ACCEPTED"] },
        },
      });
      if (existingApp) {
        return res.status(400).json({ error: "Заявка уже существует" });
      }

      const application = await prisma.projectApplication.create({
        data: {
          projectId,
          applicantId,
          message: message ? String(message) : undefined,
        },
      });

      res.status(201).json(application);
    } catch (error) {
      console.error("Error in apply", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  listApplications: async (req, res) => {
    const { id: projectId } = req.params;
    const userId = req.user.userId;
    const { status } = req.query;

    if (!OBJECT_ID_REGEX.test(projectId)) {
      return res.status(400).json({ error: "Некорректный id проекта" });
    }

    try {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
      });
      if (!project) {
        return res.status(404).json({ error: "Проект не найден" });
      }

      const membership = await prisma.projectMember.findFirst({
        where: { projectId, userId },
      });

      if (!canManageProjectAsAdminOrOwner(project, userId, membership)) {
        return res.status(403).json({ error: "Нет доступа" });
      }

      const where = { projectId };
      if (
        status &&
        ["PENDING", "ACCEPTED", "REJECTED"].includes(String(status))
      ) {
        where.status = String(status);
      }

      const applications = await prisma.projectApplication.findMany({
        where,
        include: { applicant: { include: { skills: true } } },
        orderBy: { createdAt: "desc" },
      });

      res.json(sanitizeUser(applications));
    } catch (error) {
      console.error("Error in listApplications", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  decide: async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user.userId;

    if (!OBJECT_ID_REGEX.test(id)) {
      return res.status(400).json({ error: "Некорректный id" });
    }

    if (!["ACCEPTED", "REJECTED"].includes(String(status))) {
      return res.status(400).json({ error: "status: ACCEPTED | REJECTED" });
    }

    try {
      const application = await prisma.projectApplication.findUnique({
        where: { id },
        include: { project: true },
      });

      if (!application) {
        return res.status(404).json({ error: "Заявка не найдена" });
      }

      const membership = await prisma.projectMember.findFirst({
        where: { projectId: application.projectId, userId },
      });

      if (
        !canManageProjectAsAdminOrOwner(application.project, userId, membership)
      ) {
        return res.status(403).json({ error: "Нет доступа" });
      }

      if (application.status !== "PENDING") {
        return res.status(400).json({ error: "Заявка уже обработана" });
      }

      if (status === "ACCEPTED") {
        const results = await prisma.$transaction([
          prisma.projectApplication.update({
            where: { id },
            data: { status: "ACCEPTED", decidedAt: new Date() },
          }),
          prisma.projectMember.upsert({
            where: {
              projectId_userId: {
                projectId: application.projectId,
                userId: application.applicantId,
              },
            },
            update: {},
            create: {
              projectId: application.projectId,
              userId: application.applicantId,
              role: "MEMBER",
            },
          }),
        ]);
        return res.json(results[0]);
      }

      const updated = await prisma.projectApplication.update({
        where: { id },
        data: { status: "REJECTED", decidedAt: new Date() },
      });
      res.json(updated);
    } catch (error) {
      console.error("Error in decide", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  cancel: async (req, res) => {
    const { id } = req.params;
    const userId = req.user.userId;

    if (!OBJECT_ID_REGEX.test(id)) {
      return res.status(400).json({ error: "Некорректный id" });
    }

    try {
      const application = await prisma.projectApplication.findUnique({
        where: { id },
      });

      if (!application) {
        return res.status(404).json({ error: "Заявка не найдена" });
      }

      if (application.applicantId !== userId) {
        return res.status(403).json({ error: "Нет доступа" });
      }

      if (application.status !== "PENDING") {
        return res
          .status(400)
          .json({ error: "Можно отменить только PENDING заявку" });
      }

      await prisma.projectApplication.delete({ where: { id } });

      res.json({ message: "Заявка отменена" });
    } catch (error) {
      console.error("Error in cancel application", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
};

module.exports = ApplicationController;
