const { prisma } = require("../prisma/prismaClient");
const {
  optimizeUploadedImages,
  unlinkMulterFiles,
} = require("../lib/image-optimize");
const {
  MAX_POST_ATTACHMENTS,
  POST_ATTACHMENTS_LIMIT_ERROR,
} = require("../lib/post-attachments");
const { decodeUploadOriginalName, sanitizeUser } = require("./_utils");

const OBJECT_ID_REGEX = /^[a-f\d]{24}$/i;

function parseRemoveAttachmentIds(value) {
  if (!value) {
    return [];
  }

  const list = Array.isArray(value) ? value : [value];

  return list
    .map((item) => String(item))
    .filter((item) => OBJECT_ID_REGEX.test(item));
}
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

function collectCommentLevelsByPost(comments) {
  if (!comments.length) {
    return [];
  }

  const ids = new Set(comments.map((comment) => comment.id));
  const childrenByParent = new Map();

  comments.forEach((comment) => {
    const parentId =
      comment.parentId && ids.has(comment.parentId) ? comment.parentId : null;
    const bucket = childrenByParent.get(parentId) || [];
    bucket.push(comment.id);
    childrenByParent.set(parentId, bucket);
  });

  const levels = [];
  const visited = new Set();
  let currentLevel = childrenByParent.get(null) || [];

  while (currentLevel.length) {
    const nextLevel = [];
    const normalizedLevel = [];

    currentLevel.forEach((id) => {
      if (visited.has(id)) {
        return;
      }

      visited.add(id);
      normalizedLevel.push(id);
      nextLevel.push(...(childrenByParent.get(id) || []));
    });

    if (normalizedLevel.length) {
      levels.push(normalizedLevel);
    }

    currentLevel = nextLevel;
  }

  const remaining = comments
    .map((comment) => comment.id)
    .filter((id) => !visited.has(id));

  if (remaining.length) {
    levels.push(remaining);
  }

  return levels;
}

function mapPost(post, userId) {
  const sanitized = sanitizeUser(post);
  const likeCount = post.likes?.length ?? 0;
  const commentCount = post.comments?.length ?? 0;
  const isEdited =
    post.updatedAt &&
    post.createdAt &&
    new Date(post.updatedAt).getTime() !== new Date(post.createdAt).getTime();

  return {
    ...sanitized,
    likeCount,
    commentCount,
    likedByUser: post.likes?.some((like) => like.userId === userId) ?? false,
    isOwner: post.authorId === userId,
    isEdited,
  };
}

async function getPostForResponse(id, userId) {
  const post = await prisma.post.findUnique({
    where: { id },
    include: {
      attachments: true,
      author: true,
      comments: true,
      likes: true,
    },
  });

  return post ? mapPost(post, userId) : null;
}

const PostController = {
  createPost: async (req, res) => {
    const { content } = req.body;
    const authorId = req.user.userId;
    const files = req.files || [];

    if (!String(content || "").trim() && files.length === 0) {
      return res.status(400).json({ error: "Все поля обязательны" });
    }

    if (files.length > MAX_POST_ATTACHMENTS) {
      await unlinkMulterFiles(files);
      return res.status(400).json({ error: POST_ATTACHMENTS_LIMIT_ERROR });
    }

    try {
      await optimizeUploadedImages(files);
    } catch (e) {
      await unlinkMulterFiles(files);
      return res.status(400).json({
        error: e.message || "Не удалось обработать вложения",
      });
    }

    try {
      const post = await prisma.post.create({
        data: {
          content: String(content || "").trim(),
          authorId,
          attachments: {
            create: files.map(attachmentData),
          },
        },
      });

      const created = await getPostForResponse(post.id, authorId);

      res.json(created);
    } catch (error) {
      await unlinkMulterFiles(files);
      console.error("Error in createPost", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
  getAllPosts: async (req, res) => {
    const userId = req.user.userId;
    const { cursor } = req.query;
    const limit = normalizeLimit(req.query.limit);

    if (cursor && !OBJECT_ID_REGEX.test(String(cursor))) {
      return res.status(400).json({ error: "Некорректный cursor" });
    }

    try {
      const posts = await prisma.post.findMany({
        ...(cursor
          ? {
              cursor: { id: String(cursor) },
              skip: 1,
            }
          : {}),
        take: limit + 1,
        include: {
          attachments: true,
          likes: true,
          author: true,
          comments: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      const hasNextPage = posts.length > limit;
      const items = (hasNextPage ? posts.slice(0, limit) : posts).map((post) =>
        mapPost(post, userId),
      );
      const nextCursor = hasNextPage ? items[items.length - 1]?.id : null;

      res.json({ items, nextCursor });
    } catch (error) {
      console.error("Error in getAllPosts", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
  getPostById: async (req, res) => {
    const { id } = req.params;
    const userId = req.user.userId;

    if (!OBJECT_ID_REGEX.test(id)) {
      return res.status(400).json({ error: "Некорректный id" });
    }

    try {
      const post = await prisma.post.findUnique({
        where: { id },
        include: {
          attachments: true,
          comments: true,
          likes: true,
          author: true,
        },
      });

      if (!post) {
        return res.status(404).json({ error: "Пост не найден" });
      }

      res.json(mapPost(post, userId));
    } catch (error) {
      console.error("Error in getPostById", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
  updatePost: async (req, res) => {
    const { id } = req.params;
    const { content } = req.body;
    const files = req.files || [];
    const removeAttachmentIds = parseRemoveAttachmentIds(
      req.body.removeAttachmentIds,
    );
    const uniqueRemoveIds = [...new Set(removeAttachmentIds)];
    const userId = req.user.userId;

    if (!OBJECT_ID_REGEX.test(id)) {
      await unlinkMulterFiles(files);
      return res.status(400).json({ error: "Некорректный id" });
    }

    try {
      const post = await prisma.post.findUnique({
        where: { id },
        select: {
          id: true,
          authorId: true,
          _count: {
            select: {
              attachments: true,
            },
          },
        },
      });

      if (!post) {
        await unlinkMulterFiles(files);
        return res.status(404).json({ error: "Пост не найден" });
      }

      if (post.authorId !== userId) {
        await unlinkMulterFiles(files);
        return res.status(403).json({ error: "Нет доступа" });
      }

      if (uniqueRemoveIds.length) {
        const existingAttachments = await prisma.postAttachment.findMany({
          where: {
            postId: id,
            id: { in: uniqueRemoveIds },
          },
          select: { id: true },
        });

        if (existingAttachments.length !== uniqueRemoveIds.length) {
          await unlinkMulterFiles(files);
          return res
            .status(400)
            .json({ error: "Некорректные вложения для удаления" });
        }
      }

      const remainingExistingAttachments = Math.max(
        0,
        (post._count?.attachments ?? 0) - uniqueRemoveIds.length,
      );

      if (remainingExistingAttachments + files.length > MAX_POST_ATTACHMENTS) {
        await unlinkMulterFiles(files);
        return res.status(400).json({ error: POST_ATTACHMENTS_LIMIT_ERROR });
      }

      if (
        !String(content || "").trim() &&
        files.length === 0 &&
        remainingExistingAttachments === 0
      ) {
        await unlinkMulterFiles(files);
        return res.status(400).json({ error: "Все поля обязательны" });
      }

      try {
        await optimizeUploadedImages(files);
      } catch (e) {
        await unlinkMulterFiles(files);
        return res.status(400).json({
          error: e.message || "Не удалось обработать вложения",
        });
      }

      await prisma.post.update({
        where: { id },
        data: {
          ...(content !== undefined ? { content: String(content).trim() } : {}),
          attachments: {
            ...(uniqueRemoveIds.length
              ? {
                  deleteMany: {
                    id: { in: uniqueRemoveIds },
                  },
                }
              : {}),
            create: files.map(attachmentData),
          },
        },
      });

      const updated = await getPostForResponse(id, userId);

      res.json(updated);
    } catch (error) {
      await unlinkMulterFiles(files);
      console.error("Error in updatePost", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
  deletePost: async (req, res) => {
    const { id } = req.params;

    if (!OBJECT_ID_REGEX.test(id)) {
      return res.status(400).json({ error: "Некорректный id" });
    }

    try {
      const post = await prisma.post.findUnique({ where: { id } });

      if (!post) {
        return res.status(404).json({ error: "Пост не найден" });
      }

      if (post.authorId !== req.user.userId) {
        return res.status(403).json({ error: "Нет доступа" });
      }

      const comments = await prisma.comment.findMany({
        where: { postId: id },
        select: { id: true, parentId: true },
      });
      const commentIds = comments.map((comment) => comment.id);
      const commentLevels = collectCommentLevelsByPost(comments);
      const deleteCommentOperations = [...commentLevels]
        .reverse()
        .map((levelIds) =>
          prisma.comment.deleteMany({
            where: { id: { in: levelIds } },
          }),
        );

      const transaction = await prisma.$transaction([
        ...(commentIds.length
          ? [
              prisma.commentAttachment.deleteMany({
                where: { commentId: { in: commentIds } },
              }),
              prisma.commentLike.deleteMany({
                where: { commentId: { in: commentIds } },
              }),
              ...deleteCommentOperations,
            ]
          : []),
        prisma.postAttachment.deleteMany({ where: { postId: id } }),
        prisma.like.deleteMany({ where: { postId: id } }),
        prisma.post.delete({ where: { id } }),
      ]);

      res.json(transaction);
    } catch (error) {
      console.error("Error in deletePost", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
};

module.exports = PostController;
