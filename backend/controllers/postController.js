const { prisma } = require("../prisma/prismaClient");
const {
  optimizeUploadedImages,
  unlinkMulterFiles,
} = require("../lib/image-optimize");
const {
  MAX_POST_ATTACHMENTS,
  POST_ATTACHMENTS_LIMIT_ERROR,
} = require("../lib/post-attachments");
const { POST_CONTENT_MAX, assertMaxLength } = require("../lib/field-limits");
const { ID_REGEX } = require("../lib/id");
const {
  normalizeListLimit,
  parseTruthyQueryFlag,
  parseSortOldestFirst,
  parseRemoveAttachmentIds,
} = require("../lib/http-query");
const { buildPostSearchFilter } = require("../lib/search-filters");
const { buildUploadAttachmentData } = require("../lib/attachment-meta");
const { mapPost, collectCommentLevelsByPost } = require("../lib/feed-mappers");

const OBJECT_ID_REGEX = ID_REGEX;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 30;

const normalizeLimit = (value) =>
  normalizeListLimit(value, {
    defaultLimit: DEFAULT_LIMIT,
    maxLimit: MAX_LIMIT,
  });

const parseMineOnly = parseTruthyQueryFlag;
const attachmentData = buildUploadAttachmentData;

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

    const contentTrimmed = String(content || "").trim();

    if (!contentTrimmed && files.length === 0) {
      return res.status(400).json({ error: "Все поля обязательны" });
    }

    const contentLenErr = assertMaxLength(
      contentTrimmed,
      POST_CONTENT_MAX,
      `Текст поста слишком длинный (не более ${POST_CONTENT_MAX} символов)`,
    );
    if (contentLenErr) {
      return res.status(400).json(contentLenErr);
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
          content: contentTrimmed,
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
    const qRaw = req.query.q !== undefined ? String(req.query.q) : "";
    const mineOnly = parseMineOnly(req.query.mine);
    const oldestFirst = parseSortOldestFirst(req.query.sort);

    if (qRaw.length > MAX_POST_SEARCH_Q) {
      return res.status(400).json({ error: "Слишком длинная строка поиска" });
    }

    if (cursor && !OBJECT_ID_REGEX.test(String(cursor))) {
      return res.status(400).json({ error: "Некорректный cursor" });
    }

    const searchFilter = buildPostSearchFilter(qRaw);
    const whereParts = [];

    if (mineOnly) {
      whereParts.push({ authorId: userId });
    }

    if (searchFilter) {
      whereParts.push(searchFilter);
    }

    const where =
      whereParts.length === 0
        ? {}
        : whereParts.length === 1
          ? whereParts[0]
          : { AND: whereParts };

    try {
      const posts = await prisma.post.findMany({
        where,
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
          createdAt: oldestFirst ? "asc" : "desc",
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

      let contentTrimmed;
      if (content !== undefined) {
        contentTrimmed = String(content).trim();
        const contentLenErr = assertMaxLength(
          contentTrimmed,
          POST_CONTENT_MAX,
          `Текст поста слишком длинный (не более ${POST_CONTENT_MAX} символов)`,
        );
        if (contentLenErr) {
          await unlinkMulterFiles(files);
          return res.status(400).json(contentLenErr);
        }
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
          ...(content !== undefined ? { content: contentTrimmed } : {}),
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

      const notificationWhere = [{ postId: id }];
      if (commentIds.length) {
        notificationWhere.push({ commentId: { in: commentIds } });
      }

      const transaction = await prisma.$transaction([
        prisma.notification.deleteMany({
          where: { OR: notificationWhere },
        }),
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
