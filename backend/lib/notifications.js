/**
 * Создание записей Notification. Ошибки логируются и не ломают основной запрос.
 */

const READ_NOTIFICATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const { emitNotificationsInvalidate } = require("./notificationSocket");

/** Типы, где получатель совпадает с «инициатором» осмысленно (карточка для себя). */
const SELF_RECEIVER_TYPES = new Set([
  "PROJECT_APPLICATION_SUBMITTED_SELF",
  "PROJECT_APPLICATION_WITHDRAWN_SELF",
  "PROJECT_INVITE_DECLINED_SELF",
]);

function computeDeleteAtFromReadAt(readAt) {
  const t =
    readAt instanceof Date ? readAt.getTime() : new Date(readAt).getTime();
  return new Date(t + READ_NOTIFICATION_TTL_MS);
}

/**
 * @param {import("../generated/prisma").PrismaClient} prisma
 * @param {object} payload
 * @param {string} payload.receiverId
 * @param {string} [payload.actorId]
 * @param {string} [payload.subjectUserId]
 * @param {import("../generated/prisma").NotificationType} payload.type
 * @param {string} [payload.postId]
 * @param {string} [payload.commentId]
 * @param {string} [payload.projectId]
 * @param {string} [payload.applicationId]
 * @param {string} [payload.projectTitleSnapshot]
 */
async function createNotification(prisma, payload) {
  const {
    receiverId,
    actorId,
    subjectUserId,
    type,
    postId,
    commentId,
    projectId,
    applicationId,
    projectTitleSnapshot,
  } = payload;

  if (!receiverId || !type) {
    return;
  }

  if (
    actorId &&
    receiverId === actorId &&
    !SELF_RECEIVER_TYPES.has(String(type))
  ) {
    return;
  }

  try {
    await prisma.notification.create({
      data: {
        receiverId,
        actorId: actorId ?? null,
        subjectUserId: subjectUserId ?? null,
        type,
        postId: postId ?? null,
        commentId: commentId ?? null,
        projectId: projectId ?? null,
        applicationId: applicationId ?? null,
        projectTitleSnapshot: projectTitleSnapshot ?? null,
        /** Явный BSON null: иначе в Mongo поле может отсутствовать, и `readAt: null` в where не матчится. */
        readAt: null,
        deleteAt: null,
      },
    });
    emitNotificationsInvalidate(receiverId);
  } catch (e) {
    console.error("createNotification failed", e?.message || e);
  }
}

/**
 * @param {import("../generated/prisma").PrismaClient} prisma
 * @param {string} projectId
 * @returns {Promise<string[]>}
 */
async function getProjectStaffUserIds(prisma, projectId) {
  const members = await prisma.projectMember.findMany({
    where: {
      projectId,
      role: { in: ["OWNER", "ADMIN"] },
    },
    select: { userId: true },
  });
  return [...new Set(members.map((m) => m.userId))];
}

/**
 * Уведомляет владельца и ADMIN проекта, кроме `exceptUserId`.
 * @param {import("../generated/prisma").PrismaClient} prisma
 * @param {object} opts
 * @param {string} opts.projectId
 * @param {string} [opts.exceptUserId]
 * @param {import("../generated/prisma").NotificationType} opts.type
 * @param {string} [opts.actorId]
 * @param {string} [opts.subjectUserId]
 * @param {string} [opts.applicationId]
 * @param {string} [opts.postId]
 * @param {string} [opts.commentId]
 * @param {string} [opts.projectTitleSnapshot]
 */
async function notifyProjectStaffExcept(prisma, opts) {
  const { projectId, exceptUserId, ...rest } = opts;
  const ids = await getProjectStaffUserIds(prisma, projectId);
  await Promise.all(
    ids
      .filter((uid) => uid !== exceptUserId)
      .map((receiverId) =>
        createNotification(prisma, { ...rest, receiverId, projectId }),
      ),
  );
}

module.exports = {
  READ_NOTIFICATION_TTL_MS,
  computeDeleteAtFromReadAt,
  createNotification,
  getProjectStaffUserIds,
  notifyProjectStaffExcept,
};
