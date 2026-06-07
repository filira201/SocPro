const { prisma } = require("../prisma/prismaClient");
const { sanitizeUser } = require("./_utils");
const { emitNotificationsInvalidate } = require("../lib/notificationSocket");

const { ID_REGEX } = require("../lib/id");
const OBJECT_ID_REGEX = ID_REGEX;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 30;
const COMMENT_PREVIEW_MAX = 120;
const COMMENT_PREVIEW_TYPES = new Set([
  "POST_COMMENTED",
  "COMMENT_REPLIED",
  "COMMENT_LIKED",
]);

function truncateCommentPreview(content) {
  const trimmed = String(content || "").trim();

  if (trimmed.length <= COMMENT_PREVIEW_MAX) {
    return trimmed;
  }

  return `${trimmed.slice(0, COMMENT_PREVIEW_MAX - 1)}…`;
}

async function attachCommentPreviews(items) {
  const commentIds = [
    ...new Set(
      items
        .filter(
          (item) =>
            item.commentId && COMMENT_PREVIEW_TYPES.has(String(item.type)),
        )
        .map((item) => String(item.commentId)),
    ),
  ];

  if (!commentIds.length) {
    return items;
  }

  const comments = await prisma.comment.findMany({
    where: { id: { in: commentIds } },
    select: { id: true, content: true, parentId: true },
  });
  const byId = new Map(comments.map((row) => [row.id, row]));

  return items.map((item) => {
    if (!item.commentId || !COMMENT_PREVIEW_TYPES.has(String(item.type))) {
      return item;
    }

    const comment = byId.get(String(item.commentId));

    if (!comment) {
      return item;
    }

    return {
      ...item,
      commentPreview: truncateCommentPreview(comment.content),
      commentIsReply: Boolean(comment.parentId),
    };
  });
}

function normalizeLimit(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_LIMIT;
  }
  return Math.min(parsed, MAX_LIMIT);
}

function mapNotification(row) {
  return sanitizeUser(row);
}

const NotificationController = {
  unreadCount: async (req, res) => {
    const receiverId = req.user.userId;

    try {
      const count = await prisma.notification.count({
        where: { receiverId },
      });
      res.json({ count });
    } catch (error) {
      console.error("Error in NotificationController.unreadCount", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  list: async (req, res) => {
    const receiverId = req.user.userId;
    const { cursor } = req.query;
    const limit = normalizeLimit(req.query.limit);

    if (cursor && !OBJECT_ID_REGEX.test(String(cursor))) {
      return res.status(400).json({ error: "Некорректный cursor" });
    }

    try {
      const rows = await prisma.notification.findMany({
        where: { receiverId },
        ...(cursor
          ? {
              cursor: { id: String(cursor) },
              skip: 1,
            }
          : {}),
        take: limit + 1,
        orderBy: { id: "desc" },
        include: {
          actor: true,
          subjectUser: true,
        },
      });

      const hasNextPage = rows.length > limit;
      const page = hasNextPage ? rows.slice(0, limit) : rows;
      const items = await attachCommentPreviews(page.map(mapNotification));
      const nextCursor = hasNextPage ? items[items.length - 1]?.id : null;

      res.json({ items, nextCursor });
    } catch (error) {
      console.error("Error in NotificationController.list", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  markRead: async (req, res) => {
    const { id } = req.params;
    const receiverId = req.user.userId;

    if (!OBJECT_ID_REGEX.test(id)) {
      return res.status(400).json({ error: "Некорректный id" });
    }

    try {
      const row = await prisma.notification.findFirst({
        where: { id, receiverId },
        select: { id: true },
      });

      if (!row) {
        return res.status(404).json({ error: "Уведомление не найдено" });
      }

      await prisma.notification.delete({
        where: { id },
      });

      emitNotificationsInvalidate(receiverId);

      res.json({ ok: true });
    } catch (error) {
      console.error("Error in NotificationController.markRead", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  markAllRead: async (req, res) => {
    const receiverId = req.user.userId;

    try {
      const result = await prisma.notification.deleteMany({
        where: { receiverId },
      });

      if (!result.count) {
        return res.json({ ok: true, updated: 0 });
      }

      emitNotificationsInvalidate(receiverId);

      res.json({ ok: true, updated: result.count });
    } catch (error) {
      console.error("Error in NotificationController.markAllRead", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
};

module.exports = NotificationController;
