const { prisma } = require("../prisma/prismaClient");
const {
  canManageProjectAsAdminOrOwner,
  projectAcceptsApplications,
} = require("../lib/project-access");
const { sanitizeUser } = require("./_utils");
const { normalizeApplicationMessage } = require("../lib/project-field-limits");
const {
  createNotification,
  notifyProjectStaffExcept,
} = require("../lib/notifications");

const { ID_REGEX } = require("../lib/id");
const { flattenSkillsDeep } = require("../lib/skill-mapping");
const OBJECT_ID_REGEX = ID_REGEX;

/**
 * @param {import("../generated/prisma").PrismaClient} prisma
 * @param {string} projectId
 * @param {string} userId
 */
async function findMembership(prisma, projectId, userId) {
  return prisma.projectMember.findFirst({
    where: { projectId, userId },
  });
}

/**
 * Активная заявка (PENDING или ACCEPTED) на пару (проект, соискатель).
 * @param {import("../generated/prisma").PrismaClient} prisma
 * @param {string} projectId
 * @param {string} applicantId
 * @param {{ select?: object }} [options]
 */
async function findActiveApplication(
  prisma,
  projectId,
  applicantId,
  options = {},
) {
  return prisma.projectApplication.findFirst({
    where: {
      projectId,
      applicantId,
      status: { in: ["PENDING", "ACCEPTED"] },
    },
    ...options,
  });
}

/**
 * Принять заявку: статус ACCEPTED + участник MEMBER в одной транзакции.
 * @param {import("../generated/prisma").PrismaClient} prisma
 * @param {{ applicationId: string; projectId: string; applicantId: string; decidedById: string }} params
 */
async function acceptApplicationToMembership(
  prisma,
  { applicationId, projectId, applicantId, decidedById },
) {
  const results = await prisma.$transaction([
    prisma.projectApplication.update({
      where: { id: applicationId },
      data: {
        status: "ACCEPTED",
        decidedAt: new Date(),
        decidedById,
      },
    }),
    prisma.projectMember.upsert({
      where: {
        projectId_userId: {
          projectId,
          userId: applicantId,
        },
      },
      update: {},
      create: {
        projectId,
        userId: applicantId,
        role: "MEMBER",
      },
    }),
  ]);

  return results[0];
}

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

      const existingMember = await findMembership(
        prisma,
        projectId,
        applicantId,
      );
      if (existingMember) {
        return res
          .status(400)
          .json({ error: "Вы уже являетесь участником проекта" });
      }

      const existingApp = await findActiveApplication(
        prisma,
        projectId,
        applicantId,
        { select: { id: true, invitedById: true } },
      );
      if (existingApp) {
        if (existingApp.invitedById) {
          return res.status(400).json({
            error:
              "Вам уже отправлено приглашение в этот проект. Ответьте на него или дождитесь, пока организатор отзовёт приглашение.",
          });
        }
        return res.status(400).json({ error: "Заявка уже существует" });
      }

      const msg = normalizeApplicationMessage(message);
      if (msg.error) {
        return res.status(400).json({ error: msg.error });
      }

      const application = await prisma.projectApplication.create({
        data: {
          projectId,
          applicantId,
          message: msg.value,
        },
      });

      await Promise.all([
        createNotification(prisma, {
          receiverId: applicantId,
          actorId: applicantId,
          type: "PROJECT_APPLICATION_SUBMITTED_SELF",
          projectId,
          applicationId: application.id,
        }),
        notifyProjectStaffExcept(prisma, {
          projectId,
          exceptUserId: applicantId,
          type: "STAFF_NEW_APPLICATION",
          actorId: applicantId,
          applicationId: application.id,
        }),
      ]);

      res.status(201).json(application);
    } catch (error) {
      console.error("Error in apply", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  /** Владелец или администратор создаёт заявку от имени приглашённого пользователя. */
  inviteToProject: async (req, res) => {
    const { id: projectId } = req.params;
    const { inviteeId, message } = req.body;
    const invitingUserId = req.user.userId;

    if (!OBJECT_ID_REGEX.test(projectId)) {
      return res.status(400).json({ error: "Некорректный id проекта" });
    }

    const inviteeIdStr =
      inviteeId !== undefined && inviteeId !== null
        ? String(inviteeId).trim()
        : "";

    if (!inviteeIdStr || !OBJECT_ID_REGEX.test(inviteeIdStr)) {
      return res.status(400).json({ error: "Некорректный id пользователя" });
    }

    if (inviteeIdStr === String(invitingUserId)) {
      return res.status(400).json({ error: "Нельзя пригласить самого себя" });
    }

    try {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
      });
      if (!project) {
        return res.status(404).json({ error: "Проект не найден" });
      }

      const membership = await findMembership(
        prisma,
        projectId,
        invitingUserId,
      );

      if (
        !canManageProjectAsAdminOrOwner(project, invitingUserId, membership)
      ) {
        return res.status(403).json({ error: "Нет доступа" });
      }

      if (project.ownerId === inviteeIdStr) {
        return res
          .status(400)
          .json({ error: "Нельзя отправить заявку владельцу проекта" });
      }

      if (!projectAcceptsApplications(project)) {
        return res.status(400).json({
          error: "Проект сейчас не принимает новые заявки",
        });
      }

      const inviteeExists = await prisma.user.findUnique({
        where: { id: inviteeIdStr },
        select: { id: true },
      });
      if (!inviteeExists) {
        return res.status(404).json({ error: "Пользователь не найден" });
      }

      const existingMember = await findMembership(
        prisma,
        projectId,
        inviteeIdStr,
      );
      if (existingMember) {
        return res
          .status(400)
          .json({ error: "Пользователь уже в составе проекта" });
      }

      const existingApp = await findActiveApplication(
        prisma,
        projectId,
        inviteeIdStr,
      );
      if (existingApp) {
        return res.status(400).json({ error: "Заявка уже существует" });
      }

      const msg = normalizeApplicationMessage(message);
      if (msg.error) {
        return res.status(400).json({ error: msg.error });
      }

      const application = await prisma.projectApplication.create({
        data: {
          projectId,
          applicantId: inviteeIdStr,
          message: msg.value,
          invitedById: invitingUserId,
        },
      });

      await Promise.all([
        createNotification(prisma, {
          receiverId: inviteeIdStr,
          actorId: invitingUserId,
          type: "PROJECT_INVITE_RECEIVED",
          projectId,
          applicationId: application.id,
        }),
        notifyProjectStaffExcept(prisma, {
          projectId,
          exceptUserId: invitingUserId,
          type: "STAFF_INVITE_SENT",
          actorId: invitingUserId,
          subjectUserId: inviteeIdStr,
          applicationId: application.id,
        }),
      ]);

      res.status(201).json(application);
    } catch (error) {
      console.error("Error in inviteToProject", error);
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

      const membership = await findMembership(prisma, projectId, userId);

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
        include: {
          applicant: { include: { skills: { include: { skill: true } } } },
          invitedBy: true,
          decidedBy: true,
        },
        orderBy: { createdAt: "desc" },
      });

      flattenSkillsDeep(applications);
      res.json(sanitizeUser(applications));
    } catch (error) {
      console.error("Error in listApplications", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  /** Приглашённый пользователь принимает приглашение (только при invitedById). */
  acceptAsInvitee: async (req, res) => {
    const { id } = req.params;
    const userId = req.user.userId;

    if (!OBJECT_ID_REGEX.test(id)) {
      return res.status(400).json({ error: "Некорректный id" });
    }

    try {
      const application = await prisma.projectApplication.findUnique({
        where: { id },
        include: { project: true },
      });

      if (!application) {
        return res.status(404).json({ error: "Заявка не найдена" });
      }

      if (application.applicantId !== userId) {
        return res.status(403).json({ error: "Нет доступа" });
      }

      if (!application.invitedById) {
        return res.status(400).json({
          error: "Принять таким образом можно только приглашение в проект",
        });
      }

      if (application.status !== "PENDING") {
        return res.status(400).json({ error: "Заявка уже обработана" });
      }

      const existingMember = await findMembership(
        prisma,
        application.projectId,
        userId,
      );
      if (existingMember) {
        return res
          .status(400)
          .json({ error: "Вы уже являетесь участником проекта" });
      }

      if (!projectAcceptsApplications(application.project)) {
        return res.status(400).json({
          error: "Проект сейчас не принимает новых участников",
        });
      }

      const accepted = await acceptApplicationToMembership(prisma, {
        applicationId: id,
        projectId: application.projectId,
        applicantId: application.applicantId,
        decidedById: userId,
      });

      await Promise.all([
        createNotification(prisma, {
          receiverId: userId,
          actorId: application.invitedById,
          type: "PROJECT_APPLICATION_ACCEPTED",
          projectId: application.projectId,
          applicationId: application.id,
        }),
        notifyProjectStaffExcept(prisma, {
          projectId: application.projectId,
          exceptUserId: userId,
          type: "STAFF_INVITE_ACCEPTED",
          actorId: userId,
          applicationId: application.id,
        }),
      ]);

      res.json(accepted);
    } catch (error) {
      console.error("Error in acceptAsInvitee", error);
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

      const membership = await findMembership(
        prisma,
        application.projectId,
        userId,
      );

      if (
        !canManageProjectAsAdminOrOwner(application.project, userId, membership)
      ) {
        return res.status(403).json({ error: "Нет доступа" });
      }

      if (application.status !== "PENDING") {
        return res.status(400).json({ error: "Заявка уже обработана" });
      }

      if (application.invitedById) {
        return res.status(400).json({
          error:
            "Это приглашение в проект: принять или отклонить его может только приглашённый пользователь. Вы можете отозвать приглашение.",
        });
      }

      if (status === "ACCEPTED") {
        const accepted = await acceptApplicationToMembership(prisma, {
          applicationId: id,
          projectId: application.projectId,
          applicantId: application.applicantId,
          decidedById: userId,
        });

        await createNotification(prisma, {
          receiverId: application.applicantId,
          actorId: userId,
          type: "PROJECT_APPLICATION_ACCEPTED",
          projectId: application.projectId,
          applicationId: application.id,
        });

        return res.json(accepted);
      }

      const updated = await prisma.projectApplication.update({
        where: { id },
        data: {
          status: "REJECTED",
          decidedAt: new Date(),
          decidedById: userId,
        },
      });

      await createNotification(prisma, {
        receiverId: application.applicantId,
        actorId: userId,
        type: "PROJECT_APPLICATION_REJECTED",
        projectId: application.projectId,
        applicationId: application.id,
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
        include: { project: true },
      });

      if (!application) {
        return res.status(404).json({ error: "Заявка не найдена" });
      }

      const isApplicant = application.applicantId === userId;

      if (isApplicant) {
        if (application.status !== "PENDING") {
          return res
            .status(400)
            .json({ error: "Можно отменить только PENDING заявку" });
        }
      } else {
        const membership = await findMembership(
          prisma,
          application.projectId,
          userId,
        );

        if (
          !canManageProjectAsAdminOrOwner(
            application.project,
            userId,
            membership,
          )
        ) {
          return res.status(403).json({ error: "Нет доступа" });
        }

        if (application.status !== "PENDING") {
          return res.status(400).json({
            error: "Можно отозвать только ожидающую заявку",
          });
        }
      }

      if (isApplicant) {
        if (application.invitedById) {
          await createNotification(prisma, {
            receiverId: userId,
            type: "PROJECT_INVITE_DECLINED_SELF",
            projectId: application.projectId,
            applicationId: application.id,
          });
          await notifyProjectStaffExcept(prisma, {
            projectId: application.projectId,
            exceptUserId: userId,
            type: "STAFF_INVITE_DECLINED_BY_INVITEE",
            actorId: userId,
            applicationId: application.id,
          });
        } else {
          await createNotification(prisma, {
            receiverId: userId,
            actorId: userId,
            type: "PROJECT_APPLICATION_WITHDRAWN_SELF",
            projectId: application.projectId,
            applicationId: application.id,
          });
          await notifyProjectStaffExcept(prisma, {
            projectId: application.projectId,
            exceptUserId: userId,
            type: "STAFF_APPLICATION_WITHDRAWN",
            actorId: userId,
            applicationId: application.id,
          });
        }
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
