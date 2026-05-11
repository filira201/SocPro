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
            _count: {
              select: {
                members: true,
                applications: true,
                attachments: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take,
          skip,
        }),
        prisma.project.count({ where: finalWhere }),
      ]);

      res.json({
        items: sanitizeUser(items.map((p) => normalizeProjectForApi(p))),
        total,
        take,
        skip,
      });
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
      });

      let applications = undefined;
      if (
        canManageProjectAsAdminOrOwner(project, userId, requesterMembership)
      ) {
        applications = await prisma.projectApplication.findMany({
          where: { projectId: id },
          include: { applicant: { include: { skills: true } } },
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
