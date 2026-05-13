const { prisma } = require("../prisma/prismaClient");
const { sanitizeUser } = require("./_utils");
const { computeDeleteAtFromReadAt } = require("../lib/notifications");
const { emitNotificationsInvalidate } = require("../lib/notificationSocket");

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

function mapNotification(row) {
  const sanitized = sanitizeUser(row);
  const isRead = row.readAt != null;
  return {
    ...sanitized,
    isRead,
  };
}

const NotificationController = {
  unreadCount: async (req, res) => {
    const receiverId = req.user.userId;

    try {
      /**
       * Mongo: у непрочитанных `readAt` может быть BSON `null` или поле отсутствует.
       * `count({ readAt: null })` не всегда учитывает отсутствие поля — считаем надёжно.
       */
      const rows = await prisma.notification.findMany({
        where: { receiverId },
        select: { readAt: true },
      });
      const count = rows.filter((r) => r.readAt == null).length;
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
      const items = page.map(mapNotification);
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
        select: { id: true, readAt: true },
      });

      if (!row) {
        return res.status(404).json({ error: "Уведомление не найдено" });
      }

      if (row.readAt != null) {
        return res.json({ ok: true, alreadyRead: true });
      }

      const now = new Date();
      const deleteAt = computeDeleteAtFromReadAt(now);

      await prisma.notification.update({
        where: { id },
        data: { readAt: now, deleteAt },
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
      const now = new Date();
      const deleteAt = computeDeleteAtFromReadAt(now);

      const unread = await prisma.notification.findMany({
        where: { receiverId },
        select: { id: true, readAt: true },
      });
      const unreadIds = unread.filter((r) => r.readAt == null).map((r) => r.id);

      if (!unreadIds.length) {
        return res.json({ ok: true, updated: 0 });
      }

      const result = await prisma.notification.updateMany({
        where: { id: { in: unreadIds } },
        data: { readAt: now, deleteAt },
      });

      emitNotificationsInvalidate(receiverId);

      res.json({ ok: true, updated: result.count });
    } catch (error) {
      console.error("Error in NotificationController.markAllRead", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
};

module.exports = NotificationController;
