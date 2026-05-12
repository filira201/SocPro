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
const { unlinkUploadByPublicUrl } = require("../lib/upload-unlink");
const { decodeUploadOriginalName, sanitizeUser } = require("./_utils");

const OBJECT_ID_REGEX = /^[a-f\d]{24}$/i;
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

const parseCsvIds = (value) => {
  if (!value) return [];
  return String(value)
    .split(",")
    .map((s) => s.trim())
    .filter((s) => OBJECT_ID_REGEX.test(s));
};

function normalizeProjectListLimit(value) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_PROJECT_LIST_LIMIT;
  }

  return Math.min(parsed, MAX_PROJECT_LIST_LIMIT);
}

function parseMemberProjectsFilter(value) {
  const v = String(value ?? "")
    .trim()
    .toLowerCase();

  return v === "1" || v === "true" || v === "yes";
}

function parseProjectsSortOldestFirst(value) {
  return (
    String(value ?? "")
      .trim()
      .toLowerCase() === "old"
  );
}

function parseRequiredSkillIdsFromBody(raw) {
  if (raw === undefined || raw === null || raw === "") {
    return [];
  }
  if (Array.isArray(raw)) {
    return raw.map(String).filter((id) => OBJECT_ID_REGEX.test(id));
  }
  const str = String(raw).trim();
  if (!str) {
    return [];
  }
  if (str.startsWith("[")) {
    try {
      const parsed = JSON.parse(str);
      if (Array.isArray(parsed)) {
        return parsed.map(String).filter((id) => OBJECT_ID_REGEX.test(id));
      }
    } catch {
      return [];
    }
    return [];
  }
  return parseCsvIds(str);
}

function parseRemoveAttachmentIds(value) {
  if (value === undefined || value === null || value === "") {
    return [];
  }
  if (Array.isArray(value)) {
    return value.map(String).filter((id) => OBJECT_ID_REGEX.test(id));
  }
  const s = String(value).trim();
  if (s.startsWith("[")) {
    try {
      const parsed = JSON.parse(s);
      if (!Array.isArray(parsed)) {
        return [];
      }
      return parsed.map(String).filter((id) => OBJECT_ID_REGEX.test(id));
    } catch {
      return [];
    }
  }
  return parseCsvIds(s);
}

function parseAcceptingApplicationsBody(value) {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value === "boolean") {
    return value;
  }
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  return null;
}

function projectDocumentAttachmentData(file) {
  return {
    url: `/uploads/${file.filename}`,
    filename: file.filename,
    originalName: decodeUploadOriginalName(file.originalname),
    mimeType: file.mimetype,
    size: file.size,
    kind: "document",
  };
}

const ProjectController = {
  createProject: async (req, res) => {
    const ownerId = req.user.userId;
    const files = req.files || [];

    const title = String(req.body.title ?? "").trim();
    const description = String(req.body.description ?? "").trim();
    const goals = String(req.body.goals ?? "").trim();

    if (!title || !description || !goals) {
      await unlinkMulterFiles(files);
      return res.status(400).json({
        error: "Название, описание и цели обязательны",
      });
    }

    if (files.length > MAX_PROJECT_ATTACHMENTS) {
      await unlinkMulterFiles(files);
      return res.status(400).json({ error: PROJECT_ATTACHMENTS_LIMIT_ERROR });
    }

    const requiredSkillIds = parseRequiredSkillIdsFromBody(
      req.body.requiredSkillIds,
    );

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
          requiredSkills: true,
          members: { include: { user: true } },
          attachments: { orderBy: { createdAt: "asc" } },
        },
      });

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
        /** Все выбранные в фильтре id должны входить в `requiredSkillIds` проекта (логическое И). */
        where.AND.push({
          requiredSkillIds: { hasEvery: skillIds },
        });
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
          requiredSkills: true,
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
          requiredSkills: true,
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
          requiredSkills: true,
          members: { include: { user: true } },
          attachments: { orderBy: { createdAt: "asc" } },
        },
      });

      if (!project) {
        return res.status(404).json({ error: "Проект не найден" });
      }

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
            applicant: { include: { skills: true } },
            invitedBy: true,
            decidedBy: true,
          },
          orderBy: { createdAt: "desc" },
        });
      }

      const normalized = normalizeProjectForApi(project);

      res.json({
        ...sanitizeUser(normalized),
        isOwner,
        isMember,
        myApplication,
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

      const data = {
        title:
          title !== undefined ? String(title).trim() || undefined : undefined,
        description:
          description !== undefined
            ? String(description).trim() || undefined
            : undefined,
        goals:
          goals !== undefined ? String(goals).trim() || undefined : undefined,
      };

      if (data.title !== undefined && !data.title) {
        await unlinkMulterFiles(files);
        return res.status(400).json({ error: "Укажите название проекта" });
      }
      if (data.description !== undefined && !data.description) {
        await unlinkMulterFiles(files);
        return res.status(400).json({ error: "Укажите описание" });
      }
      if (data.goals !== undefined && !data.goals) {
        await unlinkMulterFiles(files);
        return res.status(400).json({ error: "Укажите цели" });
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

      if (req.body.requiredSkillIds !== undefined) {
        const arr = parseRequiredSkillIdsFromBody(req.body.requiredSkillIds);
        data.requiredSkillIds = { set: arr };
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

      const updated = await prisma.project.update({
        where: { id },
        data: {
          ...data,
          ...(hasAttachmentOps ? { attachments: attachmentUpdate } : {}),
        },
        include: {
          owner: true,
          requiredSkills: true,
          members: { include: { user: true } },
          attachments: { orderBy: { createdAt: "asc" } },
        },
      });

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
      for (const row of attachments) {
        unlinkUploadByPublicUrl(row.url);
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
