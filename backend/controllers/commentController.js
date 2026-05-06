const { prisma } = require("../prisma/prismaClient");
const { decodeUploadOriginalName, sanitizeUser } = require("./_utils");

const OBJECT_ID_REGEX = /^[a-f\d]{24}$/i;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 30;

function normalizeLimit(value) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_LIMIT;
  }

  return Math.min(parsed, MAX_LIMIT);
}

function attachmentData(file) {
  return {
    url: `/uploads/${file.filename}`,
    filename: file.filename,
    originalName: decodeUploadOriginalName(file.originalname),
    mimeType: file.mimetype,
    size: file.size,
    kind: file.mimetype.startsWith("image/") ? "image" : "document",
  };
}

function mapComment(comment, userId) {
  const sanitized = sanitizeUser(comment);
  const isEdited =
    comment.updatedAt &&
    comment.createdAt &&
    new Date(comment.updatedAt).getTime() !==
      new Date(comment.createdAt).getTime();

  return {
    ...sanitized,
    isOwner: comment.userId === userId,
    isEdited,
  };
}

async function getCommentForResponse(id, userId) {
  const comment = await prisma.comment.findUnique({
    where: { id },
    include: {
      attachments: true,
      user: true,
    },
  });

  return comment ? mapComment(comment, userId) : null;
}

const CommentController = {
  createComment: async (req, res) => {
    const { postId, content } = req.body;
    const userId = req.user.userId;
    const files = req.files || [];

    if (
      !postId ||
      (!String(content || "").trim() && files.length === 0) ||
      !OBJECT_ID_REGEX.test(postId)
    ) {
      return res.status(400).json({ error: "Все поля обязательны" });
    }

    try {
      const comment = await prisma.comment.create({
        data: {
          postId,
          userId,
          content: String(content || "").trim(),
          attachments: {
            create: files.map(attachmentData),
          },
        },
      });

      const created = await getCommentForResponse(comment.id, userId);

      res.json(created);
    } catch (error) {
      console.error("Error in createComment", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  listComments: async (req, res) => {
    const { id: postId } = req.params;
    const userId = req.user.userId;
    const { cursor } = req.query;
    const limit = normalizeLimit(req.query.limit);

    if (!OBJECT_ID_REGEX.test(postId)) {
      return res.status(400).json({ error: "Некорректный id" });
    }

    if (cursor && !OBJECT_ID_REGEX.test(String(cursor))) {
      return res.status(400).json({ error: "Некорректный cursor" });
    }

    try {
      const comments = await prisma.comment.findMany({
        where: { postId },
        ...(cursor
          ? {
              cursor: { id: String(cursor) },
              skip: 1,
            }
          : {}),
        take: limit + 1,
        include: {
          attachments: true,
          user: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      });

      const hasNextPage = comments.length > limit;
      const items = (hasNextPage ? comments.slice(0, limit) : comments).map(
        (comment) => mapComment(comment, userId),
      );
      const nextCursor = hasNextPage ? items[items.length - 1]?.id : null;

      res.json({ items, nextCursor });
    } catch (error) {
      console.error("Error in listComments", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  updateComment: async (req, res) => {
    const { id } = req.params;
    const { content } = req.body;
    const userId = req.user.userId;
    const files = req.files || [];

    if (!OBJECT_ID_REGEX.test(id)) {
      return res.status(400).json({ error: "Некорректный id" });
    }

    if (!String(content || "").trim() && files.length === 0) {
      return res.status(400).json({ error: "Все поля обязательны" });
    }

    try {
      const comment = await prisma.comment.findUnique({ where: { id } });

      if (!comment) {
        return res.status(404).json({ error: "Комментарий не найден" });
      }

      if (comment.userId !== userId) {
        return res.status(403).json({ error: "Нет доступа" });
      }

      await prisma.comment.update({
        where: { id },
        data: {
          ...(String(content || "").trim()
            ? { content: String(content).trim() }
            : {}),
          attachments: {
            create: files.map(attachmentData),
          },
        },
      });

      const updated = await getCommentForResponse(id, userId);

      res.json(updated);
    } catch (error) {
      console.error("Error in updateComment", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  deleteComment: async (req, res) => {
    const { id } = req.params;
    const userId = req.user.userId;

    if (!OBJECT_ID_REGEX.test(id)) {
      return res.status(400).json({ error: "Некорректный id" });
    }

    try {
      const comment = await prisma.comment.findUnique({ where: { id } });

      if (!comment) {
        return res.status(404).json({ error: "Комментарий не найден" });
      }

      if (comment.userId !== userId) {
        return res.status(403).json({ error: "Нет доступа" });
      }

      await prisma.$transaction([
        prisma.commentAttachment.deleteMany({ where: { commentId: id } }),
        prisma.comment.delete({ where: { id } }),
      ]);

      res.json(comment);
    } catch (error) {
      console.error("Error in deleteComment", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
};

module.exports = CommentController;
