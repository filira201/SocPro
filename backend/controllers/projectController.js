const { prisma } = require("../prisma/prismaClient");
const { unlinkMulterFiles } = require("../lib/image-optimize");
const {
  canManageProjectAsAdminOrOwner,
  canManageMembersAsOwnerOnly,
  isTerminalProjectStatus,
  normalizeProjectForApi,
} = require("../lib/project-access");
const {
  MAX_PROJECT_ATTACHMENTS,
  PROJECT_ATTACHMENTS_LIMIT_ERROR,
} = require("../lib/project-attachments");
const {
  validateProjectTextsForCreate,
  validateProjectTextForUpdate,
  PROJECT_TITLE_MAX,
  PROJECT_DESCRIPTION_MAX,
  PROJECT_GOALS_MAX,
} = require("../lib/project-field-limits");
const { unlinkUploadByPublicUrl } = require("../lib/upload-unlink");
const { sanitizeUser } = require("./_utils");
const { createNotification } = require("../lib/notifications");
const { flattenSkillsDeep } = require("../lib/skill-mapping");
const { ID_REGEX, parseCsvIds } = require("../lib/id");
const {
  normalizeListLimit,
  parseTruthyQueryFlag,
  parseSortOldestFirst,
  parseRequiredSkillIdsFromBody,
  parseRemoveAttachmentIds,
  parseAcceptingApplicationsBody,
} = require("../lib/http-query");
const {
  buildProjectDocumentAttachmentData,
} = require("../lib/attachment-meta");

const OBJECT_ID_REGEX = ID_REGEX;
const DEFAULT_PROJECT_LIST_LIMIT = 10;
const MAX_PROJECT_LIST_LIMIT = 100;
const MAX_PROJECT_LIST_Q = 200;
const MAX_PROJECT_FILTER_SKILL_IDS = 20;
const PROJECT_STATUSES = new Set([
  "OPEN",
  "IN_PROGRESS",
  "PAUSED",
  "DONE",
  "CLOSED",
]);

const normalizeProjectListLimit = (value) =>
  normalizeListLimit(value, {
    defaultLimit: DEFAULT_PROJECT_LIST_LIMIT,
    maxLimit: MAX_PROJECT_LIST_LIMIT,
  });

const parseMemberProjectsFilter = parseTruthyQueryFlag;
const parseProjectsSortOldestFirst = parseSortOldestFirst;

const projectDocumentAttachmentData = buildProjectDocumentAttachmentData;

const ProjectController = {
  createProject: async (req, res) => {
    const ownerId = req.user.userId;
    const files = req.files || [];

    const texts = validateProjectTextsForCreate(req.body);
    if (texts.error) {
      await unlinkMulterFiles(files);
      return res.status(400).json({ error: texts.error });
    }
    const { title, description, goals } = texts;

    if (files.length > MAX_PROJECT_ATTACHMENTS) {
      await unlinkMulterFiles(files);
      return res.status(400).json({ error: PROJECT_ATTACHMENTS_LIMIT_ERROR });
    }

    const requiredSkillIds = parseRequiredSkillIdsFromBody(
      req.body.requiredSkillIds,
    );

    try {
      const uniqueSkillIds = [...new Set(requiredSkillIds)];

      const project = await prisma.project.create({
        data: {
          title,
          description,
          goals,
          ownerId,
          ...(uniqueSkillIds.length
            ? {
                requiredSkills: {
                  create: uniqueSkillIds.map((skillId) => ({ skillId })),
                },
              }
            : {}),
          members: {
            create: { userId: ownerId, role: "OWNER" },
          },
          ...(files.length
            ? {
                attachments: {
                  create: files.map(projectDocumentAttachmentData),
                },
              }
            : {}),
        },
        include: {
          owner: true,
          requiredSkills: { include: { skill: true } },
          members: { include: { user: true } },
          attachments: { orderBy: { createdAt: "asc" } },
        },
      });

      flattenSkillsDeep(project);
      res.status(201).json(sanitizeUser(normalizeProjectForApi(project)));
    } catch (error) {
      await unlinkMulterFiles(files);
      console.error("Error in createProject", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  getAllProjects: async (req, res) => {
    const userId = req.user.userId;
    const { q, skills, status, ownerId, cursor, sort, member, accepting } =
      req.query;
    const limit = normalizeProjectListLimit(req.query.limit);
    const qRaw = q !== undefined ? String(q) : "";

    if (qRaw.length > MAX_PROJECT_LIST_Q) {
      return res.status(400).json({ error: "Слишком длинная строка поиска" });
    }

    if (cursor && !OBJECT_ID_REGEX.test(String(cursor))) {
      return res.status(400).json({ error: "Некорректный cursor" });
    }

    const skillIdsRaw = parseCsvIds(skills);

    if (skillIdsRaw.length > MAX_PROJECT_FILTER_SKILL_IDS) {
      return res.status(400).json({ error: "Слишком много навыков в фильтре" });
    }

    const skillIds = skillIdsRaw;
    const oldestFirst = parseProjectsSortOldestFirst(sort);
    const memberOnly = parseMemberProjectsFilter(member);
    const acceptingApplicationsOnly = parseMemberProjectsFilter(accepting);

    try {
      const where = { AND: [] };
      const qTrimmed = qRaw.trim();

      if (qTrimmed) {
        where.AND.push({
          title: { contains: qTrimmed, mode: "insensitive" },
        });
      }

      if (skillIds.length) {
        /**
         * Все выбранные в фильтре id должны входить в требуемые навыки проекта (логическое И).
         * На реляционной модели — AND из нескольких `some` по join-таблице ProjectRequiredSkill.
         */
        for (const sid of skillIds) {
          where.AND.push({
            requiredSkills: { some: { skillId: sid } },
          });
        }
      }

      if (status && PROJECT_STATUSES.has(String(status))) {
        where.AND.push({ status: String(status) });
      }

      if (ownerId && OBJECT_ID_REGEX.test(String(ownerId))) {
        where.AND.push({ ownerId: String(ownerId) });
      }

      if (memberOnly) {
        where.AND.push({
          members: { some: { userId: String(userId) } },
        });
      }

      if (acceptingApplicationsOnly) {
        where.AND.push({ acceptingApplications: true });
      }

      const finalWhere = where.AND.length ? where : {};

      const projects = await prisma.project.findMany({
        where: finalWhere,
        ...(cursor
          ? {
              cursor: { id: String(cursor) },
              skip: 1,
            }
          : {}),
        take: limit + 1,
        include: {
          owner: true,
          requiredSkills: { include: { skill: true } },
          _count: {
            select: {
              members: true,
              applications: true,
              attachments: true,
            },
          },
        },
        orderBy: {
          createdAt: oldestFirst ? "asc" : "desc",
        },
      });

      const hasNextPage = projects.length > limit;
      const items = (hasNextPage ? projects.slice(0, limit) : projects).map(
        (p) => normalizeProjectForApi(p),
      );
      flattenSkillsDeep(items);
      const nextCursor = hasNextPage ? items[items.length - 1]?.id : null;

      res.json({
        items: sanitizeUser(items),
        nextCursor,
      });
    } catch (error) {
      console.error("Error in getAllProjects", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  /** Проекты, где текущий пользователь — владелец или администратор (курсор, поиск по названию). */
  listManagedProjects: async (req, res) => {
    const userId = req.user.userId;
    const { q, cursor, inviteeId } = req.query;
    const limit = normalizeProjectListLimit(req.query.limit);
    const qRaw = q !== undefined ? String(q) : "";

    if (qRaw.length > MAX_PROJECT_LIST_Q) {
      return res.status(400).json({ error: "Слишком длинная строка поиска" });
    }

    if (cursor && !OBJECT_ID_REGEX.test(String(cursor))) {
      return res.status(400).json({ error: "Некорректный cursor" });
    }

    const inviteeIdRaw =
      inviteeId !== undefined && inviteeId !== null && String(inviteeId).trim()
        ? String(inviteeId).trim()
        : "";
    const inviteeIdValid =
      inviteeIdRaw &&
      OBJECT_ID_REGEX.test(inviteeIdRaw) &&
      inviteeIdRaw !== String(userId);

    try {
      const where = {
        AND: [
          {
            members: {
              some: {
                userId: String(userId),
                role: { in: ["OWNER", "ADMIN"] },
              },
            },
          },
        ],
      };

      const qTrimmed = qRaw.trim();

      if (qTrimmed) {
        where.AND.push({
          title: { contains: qTrimmed, mode: "insensitive" },
        });
      }

      const projects = await prisma.project.findMany({
        where,
        ...(cursor
          ? {
              cursor: { id: String(cursor) },
              skip: 1,
            }
          : {}),
        take: limit + 1,
        include: {
          owner: true,
          requiredSkills: { include: { skill: true } },
          _count: {
            select: {
              members: true,
              applications: true,
              attachments: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      const hasNextPage = projects.length > limit;
      const page = hasNextPage ? projects.slice(0, limit) : projects;
      flattenSkillsDeep(page);

      /** Заявки приглашённого пользователя по проектам страницы (для «Пригласить» / «Отозвать»). */
      let inviteeApplicationByProjectId = new Map();
      const inviteeMemberProjectIds = new Set();
      if (inviteeIdValid && page.length) {
        const projectIds = page.map((p) => p.id);
        const [apps, inviteeMemberships] = await Promise.all([
          prisma.projectApplication.findMany({
            where: {
              projectId: { in: projectIds },
              applicantId: String(inviteeIdRaw),
            },
            orderBy: { createdAt: "desc" },
          }),
          prisma.projectMember.findMany({
            where: {
              projectId: { in: projectIds },
              userId: String(inviteeIdRaw),
            },
            select: { projectId: true },
          }),
        ]);
        for (const a of apps) {
          if (!inviteeApplicationByProjectId.has(a.projectId)) {
            inviteeApplicationByProjectId.set(a.projectId, {
              id: a.id,
              status: a.status,
              /** Если задано — это приглашение от вас/админа; иначе соискатель подал заявку сам. */
              invitedById: a.invitedById ?? null,
            });
          }
        }
        for (const m of inviteeMemberships) {
          inviteeMemberProjectIds.add(m.projectId);
        }
      }

      const items = page.map((p) => {
        const normalized = normalizeProjectForApi(p);
        return {
          ...normalized,
          inviteeApplication: inviteeIdValid
            ? (inviteeApplicationByProjectId.get(p.id) ?? null)
            : null,
          inviteeIsMember: inviteeIdValid
            ? inviteeMemberProjectIds.has(p.id)
            : false,
        };
      });
      const nextCursor = hasNextPage ? items[items.length - 1]?.id : null;

      res.json({
        items: sanitizeUser(items),
        nextCursor,
      });
    } catch (error) {
      console.error("Error in listManagedProjects", error);
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
          requiredSkills: { include: { skill: true } },
          members: { include: { user: true } },
          attachments: { orderBy: { createdAt: "asc" } },
        },
      });

      if (!project) {
        return res.status(404).json({ error: "Проект не найден" });
      }

      flattenSkillsDeep(project);

      const isOwner = project.ownerId === userId;
      const requesterMembership = project.members.find(
        (m) => String(m.userId) === String(userId),
      );
      const isMember = Boolean(requesterMembership);

      /** Всегда для текущего пользователя: нужно и участникам (например, ADMIN), и соискателям. */
      const myApplication = await prisma.projectApplication.findFirst({
        where: { projectId: id, applicantId: String(userId) },
        orderBy: { createdAt: "desc" },
        include: { invitedBy: true, decidedBy: true },
      });

      let applications = undefined;
      if (
        canManageProjectAsAdminOrOwner(project, userId, requesterMembership)
      ) {
        applications = await prisma.projectApplication.findMany({
          where: { projectId: id },
          include: {
            applicant: {
              include: { skills: { include: { skill: true } } },
            },
            invitedBy: true,
            decidedBy: true,
          },
          orderBy: { createdAt: "desc" },
        });
        flattenSkillsDeep(applications);
      }

      const normalized = normalizeProjectForApi(project);

      res.json({
        ...sanitizeUser(normalized),
        isOwner,
        isMember,
        myApplication: sanitizeUser(myApplication),
        ...(applications !== undefined
          ? { applications: sanitizeUser(applications) }
          : {}),
      });
    } catch (error) {
      console.error("Error in getProjectById", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  updateProject: async (req, res) => {
    const { id } = req.params;
    const userId = req.user.userId;
    const files = req.files || [];
    const removeAttachmentIds = parseRemoveAttachmentIds(
      req.body.removeAttachmentIds,
    );

    if (!OBJECT_ID_REGEX.test(id)) {
      await unlinkMulterFiles(files);
      return res.status(400).json({ error: "Некорректный id" });
    }

    try {
      const project = await prisma.project.findUnique({ where: { id } });
      if (!project) {
        await unlinkMulterFiles(files);
        return res.status(404).json({ error: "Проект не найден" });
      }

      const membership = await prisma.projectMember.findFirst({
        where: { projectId: id, userId },
      });

      if (!canManageProjectAsAdminOrOwner(project, userId, membership)) {
        await unlinkMulterFiles(files);
        return res.status(403).json({ error: "Нет доступа" });
      }

      const attachmentCount = await prisma.projectAttachment.count({
        where: { projectId: id },
      });

      const uniqueRemoveIds = [...new Set(removeAttachmentIds)];

      const existingToRemove =
        uniqueRemoveIds.length > 0
          ? await prisma.projectAttachment.findMany({
              where: { projectId: id, id: { in: uniqueRemoveIds } },
              select: { id: true, url: true },
            })
          : [];

      if (
        uniqueRemoveIds.length > 0 &&
        existingToRemove.length !== uniqueRemoveIds.length
      ) {
        await unlinkMulterFiles(files);
        return res
          .status(400)
          .json({ error: "Некорректные вложения для удаления" });
      }

      const remainingAfterRemove = attachmentCount - existingToRemove.length;

      if (remainingAfterRemove + files.length > MAX_PROJECT_ATTACHMENTS) {
        await unlinkMulterFiles(files);
        return res.status(400).json({ error: PROJECT_ATTACHMENTS_LIMIT_ERROR });
      }

      const { title, description, goals, status } = req.body;

      const data = {};

      const titleCheck = validateProjectTextForUpdate(
        title,
        PROJECT_TITLE_MAX,
        `Название слишком длинное (не более ${PROJECT_TITLE_MAX} символов)`,
        "Укажите название проекта",
      );
      if (titleCheck.error) {
        await unlinkMulterFiles(files);
        return res.status(400).json({ error: titleCheck.error });
      }
      if (titleCheck.value !== undefined) {
        data.title = titleCheck.value;
      }

      const descriptionCheck = validateProjectTextForUpdate(
        description,
        PROJECT_DESCRIPTION_MAX,
        `Описание слишком длинное (не более ${PROJECT_DESCRIPTION_MAX} символов)`,
        "Укажите описание",
      );
      if (descriptionCheck.error) {
        await unlinkMulterFiles(files);
        return res.status(400).json({ error: descriptionCheck.error });
      }
      if (descriptionCheck.value !== undefined) {
        data.description = descriptionCheck.value;
      }

      const goalsCheck = validateProjectTextForUpdate(
        goals,
        PROJECT_GOALS_MAX,
        `Цели слишком длинные (не более ${PROJECT_GOALS_MAX} символов)`,
        "Укажите цели",
      );
      if (goalsCheck.error) {
        await unlinkMulterFiles(files);
        return res.status(400).json({ error: goalsCheck.error });
      }
      if (goalsCheck.value !== undefined) {
        data.goals = goalsCheck.value;
      }

      if (status !== undefined) {
        if (!PROJECT_STATUSES.has(String(status))) {
          await unlinkMulterFiles(files);
          return res.status(400).json({ error: "Некорректный статус" });
        }
        const nextStatus = String(status);
        if (nextStatus !== project.status) {
          data.status = nextStatus;
          data.statusUpdatedAt = new Date();
        }
      }

      const nextStatus = status !== undefined ? String(status) : project.status;

      if (isTerminalProjectStatus(nextStatus)) {
        if (req.body.acceptingApplications !== undefined) {
          await unlinkMulterFiles(files);
          return res.status(400).json({
            error:
              "Нельзя менять acceptingApplications при статусе «Выполнен» или «Закрыт»",
          });
        }
        data.acceptingApplications = false;
      } else {
        const accParsed = parseAcceptingApplicationsBody(
          req.body.acceptingApplications,
        );
        if (
          accParsed === null &&
          req.body.acceptingApplications !== undefined
        ) {
          await unlinkMulterFiles(files);
          return res
            .status(400)
            .json({ error: "acceptingApplications: укажите true или false" });
        }
        if (accParsed !== undefined) {
          data.acceptingApplications = accParsed;
        }
      }

      let nextRequiredSkillIds;
      if (req.body.requiredSkillIds !== undefined) {
        nextRequiredSkillIds = [
          ...new Set(parseRequiredSkillIdsFromBody(req.body.requiredSkillIds)),
        ];
      }

      const attachmentUpdate = {
        ...(uniqueRemoveIds.length
          ? {
              deleteMany: {
                id: { in: uniqueRemoveIds },
              },
            }
          : {}),
        ...(files.length
          ? { create: files.map(projectDocumentAttachmentData) }
          : {}),
      };

      const hasAttachmentOps = uniqueRemoveIds.length > 0 || files.length > 0;

      const updated = await prisma.$transaction(async (tx) => {
        await tx.project.update({
          where: { id },
          data: {
            ...data,
            ...(hasAttachmentOps ? { attachments: attachmentUpdate } : {}),
          },
        });

        if (nextRequiredSkillIds !== undefined) {
          /** Полная пересинхронизация требуемых навыков (delete-then-insert). */
          await tx.projectRequiredSkill.deleteMany({
            where: { projectId: id },
          });

          if (nextRequiredSkillIds.length) {
            await tx.projectRequiredSkill.createMany({
              data: nextRequiredSkillIds.map((skillId) => ({
                projectId: id,
                skillId,
              })),
              skipDuplicates: true,
            });
          }
        }

        return tx.project.findUnique({
          where: { id },
          include: {
            owner: true,
            requiredSkills: { include: { skill: true } },
            members: { include: { user: true } },
            attachments: { orderBy: { createdAt: "asc" } },
          },
        });
      });

      flattenSkillsDeep(updated);

      for (const row of existingToRemove) {
        unlinkUploadByPublicUrl(row.url);
      }

      res.json(sanitizeUser(normalizeProjectForApi(updated)));
    } catch (error) {
      await unlinkMulterFiles(files);
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
      if (!canManageMembersAsOwnerOnly(project, userId)) {
        return res.status(403).json({ error: "Нет доступа" });
      }

      const attachments = await prisma.projectAttachment.findMany({
        where: { projectId: id },
        select: { url: true },
      });
      const members = await prisma.projectMember.findMany({
        where: { projectId: id },
        select: { userId: true },
      });
      const applications = await prisma.projectApplication.findMany({
        where: { projectId: id },
        select: { id: true },
      });
      const applicationIds = applications.map((a) => a.id);

      for (const row of attachments) {
        unlinkUploadByPublicUrl(row.url);
      }

      const notificationOr = [{ projectId: id }];
      if (applicationIds.length) {
        notificationOr.push({ applicationId: { in: applicationIds } });
      }

      /**
       * Уведомления — без FK на проект, нужно чистить руками. Применения, members
       * и attachments снесёт ON DELETE CASCADE из FK Project.
       */
      await prisma.$transaction([
        prisma.notification.deleteMany({
          where: { OR: notificationOr },
        }),
        prisma.project.delete({ where: { id } }),
      ]);

      await Promise.all(
        members
          .filter((m) => m.userId !== userId)
          .map((m) =>
            createNotification(prisma, {
              receiverId: m.userId,
              actorId: userId,
              type: "PROJECT_DELETED",
              projectTitleSnapshot: project.title,
            }),
          ),
      );

      res.json({ message: "Проект удалён" });
    } catch (error) {
      console.error("Error in deleteProject", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
};

module.exports = ProjectController;
