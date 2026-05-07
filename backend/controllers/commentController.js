const { prisma } = require("../prisma/prismaClient");
const { decodeUploadOriginalName, sanitizeUser } = require("./_utils");

const OBJECT_ID_REGEX = /^[a-f\d]{24}$/i;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 30;
const COMMENT_SORT = {
  NEW: "new",
  OLD: "old",
  TOP: "top",
};

function normalizeLimit(value) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_LIMIT;
  }

  return Math.min(parsed, MAX_LIMIT);
}

function normalizeSort(value) {
  if (value === COMMENT_SORT.OLD || value === COMMENT_SORT.TOP) {
    return value;
  }

  return COMMENT_SORT.NEW;
}

function parseRemoveAttachmentIds(value) {
  if (!value) {
    return [];
  }

  const list = Array.isArray(value) ? value : [value];

  return list
    .map((item) => String(item))
    .filter((item) => OBJECT_ID_REGEX.test(item));
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
    likeCount: comment._count?.likes ?? 0,
    replyCount: comment._count?.replies ?? 0,
    likedByUser: (comment.likes?.length ?? 0) > 0,
    replyToUserId: comment.parent?.userId ?? null,
    replyToUsername: comment.parent?.user?.username ?? null,
    isReply: Boolean(comment.parentId),
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
      likes: {
        where: { userId },
        select: { id: true },
      },
      parent: {
        select: {
          userId: true,
          user: {
            select: {
              username: true,
            },
          },
        },
      },
      _count: {
        select: {
          likes: true,
          replies: true,
        },
      },
    },
  });

  return comment ? mapComment(comment, userId) : null;
}

async function collectDescendantCommentIdsByLevel(rootId) {
  const levels = [[rootId]];
  let levelIds = [rootId];

  while (levelIds.length) {
    const children = await prisma.comment.findMany({
      where: {
        parentId: { in: levelIds },
      },
      select: { id: true },
    });

    const childIds = children.map((item) => item.id);

    if (!childIds.length) {
      break;
    }

    levels.push(childIds);
    levelIds = childIds;
  }

  return levels;
}

function getOrderBy(sort) {
  if (sort === COMMENT_SORT.OLD) {
    return [{ createdAt: "asc" }];
  }

  if (sort === COMMENT_SORT.TOP) {
    return [
      { likes: { _count: "desc" } },
      { replies: { _count: "desc" } },
      { createdAt: "desc" },
    ];
  }

  return [{ createdAt: "desc" }];
}

function compareTopComments(a, b) {
  const aLikes = a._count?.likes ?? 0;
  const bLikes = b._count?.likes ?? 0;
  const aReplies = a._count?.replies ?? 0;
  const bReplies = b._count?.replies ?? 0;
  const aScore = aLikes + aReplies;
  const bScore = bLikes + bReplies;

  if (aScore !== bScore) {
    return bScore - aScore;
  }

  if (aLikes !== bLikes) {
    return bLikes - aLikes;
  }

  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

const CommentController = {
  createComment: async (req, res) => {
    const { postId, content, parentId } = req.body;
    const userId = req.user.userId;
    const files = req.files || [];

    if (
      !postId ||
      (!String(content || "").trim() && files.length === 0) ||
      !OBJECT_ID_REGEX.test(postId) ||
      (parentId && !OBJECT_ID_REGEX.test(parentId))
    ) {
      return res.status(400).json({ error: "Все поля обязательны" });
    }

    try {
      const post = await prisma.post.findUnique({
        where: { id: postId },
        select: { id: true },
      });

      if (!post) {
        return res.status(404).json({ error: "Пост не найден" });
      }

      if (parentId) {
        const parentComment = await prisma.comment.findUnique({
          where: { id: String(parentId) },
          select: { id: true, postId: true },
        });

        if (!parentComment || parentComment.postId !== postId) {
          return res
            .status(400)
            .json({ error: "Комментарий для ответа не найден" });
        }
      }

      const comment = await prisma.comment.create({
        data: {
          postId,
          userId,
          content: String(content || "").trim(),
          parentId: parentId ? String(parentId) : null,
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
    const { cursor, parentId } = req.query;
    const limit = normalizeLimit(req.query.limit);
    const sort = normalizeSort(String(req.query.sort || ""));
    const normalizedParentId =
      parentId === undefined || String(parentId) === ""
        ? null
        : String(parentId);

    if (!OBJECT_ID_REGEX.test(postId)) {
      return res.status(400).json({ error: "Некорректный id" });
    }

    if (cursor && !OBJECT_ID_REGEX.test(String(cursor))) {
      return res.status(400).json({ error: "Некорректный cursor" });
    }

    if (normalizedParentId && !OBJECT_ID_REGEX.test(normalizedParentId)) {
      return res.status(400).json({ error: "Некорректный parentId" });
    }

    try {
      const comments = await prisma.comment.findMany({
        where: {
          postId,
          parentId: normalizedParentId,
        },
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
          likes: {
            where: { userId },
            select: { id: true },
          },
          parent: {
            select: {
              userId: true,
              user: {
                select: {
                  username: true,
                },
              },
            },
          },
          _count: {
            select: {
              likes: true,
              replies: true,
            },
          },
        },
        orderBy: getOrderBy(sort),
      });
      const orderedComments =
        sort === COMMENT_SORT.TOP
          ? [...comments].sort(compareTopComments)
          : comments;

      const hasNextPage = orderedComments.length > limit;
      const items = (
        hasNextPage ? orderedComments.slice(0, limit) : orderedComments
      ).map((comment) => mapComment(comment, userId));
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
    const removeAttachmentIds = parseRemoveAttachmentIds(
      req.body.removeAttachmentIds,
    );

    if (!OBJECT_ID_REGEX.test(id)) {
      return res.status(400).json({ error: "Некорректный id" });
    }

    try {
      const comment = await prisma.comment.findUnique({
        where: { id },
        select: {
          id: true,
          userId: true,
          _count: {
            select: {
              attachments: true,
            },
          },
        },
      });

      if (!comment) {
        return res.status(404).json({ error: "Комментарий не найден" });
      }

      if (comment.userId !== userId) {
        return res.status(403).json({ error: "Нет доступа" });
      }

      if (removeAttachmentIds.length) {
        const existingAttachments = await prisma.commentAttachment.findMany({
          where: {
            commentId: id,
            id: { in: removeAttachmentIds },
          },
          select: { id: true },
        });

        if (existingAttachments.length !== removeAttachmentIds.length) {
          return res
            .status(400)
            .json({ error: "Некорректные вложения для удаления" });
        }
      }

      const remainingExistingAttachments = Math.max(
        0,
        (comment._count?.attachments ?? 0) - removeAttachmentIds.length,
      );

      if (
        !String(content || "").trim() &&
        files.length === 0 &&
        remainingExistingAttachments === 0
      ) {
        return res.status(400).json({ error: "Все поля обязательны" });
      }

      await prisma.comment.update({
        where: { id },
        data: {
          ...(content !== undefined ? { content: String(content).trim() } : {}),
          attachments: {
            ...(removeAttachmentIds.length
              ? {
                  deleteMany: {
                    id: { in: removeAttachmentIds },
                  },
                }
              : {}),
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

      const commentLevels = await collectDescendantCommentIdsByLevel(id);
      const commentIds = commentLevels.flat();
      const deleteCommentOperations = [...commentLevels]
        .reverse()
        .map((levelIds) =>
          prisma.comment.deleteMany({
            where: { id: { in: levelIds } },
          }),
        );

      await prisma.$transaction([
        prisma.commentAttachment.deleteMany({
          where: { commentId: { in: commentIds } },
        }),
        prisma.commentLike.deleteMany({
          where: { commentId: { in: commentIds } },
        }),
        ...deleteCommentOperations,
      ]);

      res.json(comment);
    } catch (error) {
      console.error("Error in deleteComment", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
  likeComment: async (req, res) => {
    const { id } = req.params;
    const userId = req.user.userId;

    if (!OBJECT_ID_REGEX.test(id)) {
      return res.status(400).json({ error: "Некорректный id" });
    }

    try {
      const comment = await prisma.comment.findUnique({
        where: { id },
        select: { id: true },
      });

      if (!comment) {
        return res.status(404).json({ error: "Комментарий не найден" });
      }

      await prisma.commentLike.upsert({
        where: { userId_commentId: { userId, commentId: id } },
        update: {},
        create: { userId, commentId: id },
      });

      const updated = await getCommentForResponse(id, userId);

      return res.json(updated);
    } catch (error) {
      console.error("Error in likeComment", error);

      return res.status(500).json({ error: "Internal server error" });
    }
  },
  unlikeComment: async (req, res) => {
    const { id } = req.params;
    const userId = req.user.userId;

    if (!OBJECT_ID_REGEX.test(id)) {
      return res.status(400).json({ error: "Некорректный id" });
    }

    try {
      const comment = await prisma.comment.findUnique({
        where: { id },
        select: { id: true },
      });

      if (!comment) {
        return res.status(404).json({ error: "Комментарий не найден" });
      }

      await prisma.commentLike.deleteMany({
        where: { userId, commentId: id },
      });

      const updated = await getCommentForResponse(id, userId);

      return res.json(updated);
    } catch (error) {
      console.error("Error in unlikeComment", error);

      return res.status(500).json({ error: "Internal server error" });
    }
  },
};

module.exports = CommentController;
