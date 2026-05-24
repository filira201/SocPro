/**
 * Замена Mongo TTL-индекса для PostgreSQL.
 *
 * В Mongo было: TTL-индекс по `Notification.deleteAt` чистит документы автоматически.
 * В PG TTL отсутствует — поэтому раз в минуту прикладной сервис удаляет
 * уведомления, у которых `deleteAt <= now()`. Непрочитанные (deleteAt IS NULL)
 * не удаляются.
 *
 * Использование (в `bin/www`):
 *   const { startNotificationsTtl } = require("../lib/notifications-ttl");
 *   const stopTtl = startNotificationsTtl();
 *   process.on("SIGINT", () => { stopTtl(); ... });
 */
const { prisma } = require("../prisma/prismaClient");

const DEFAULT_INTERVAL_MS = 60 * 1000;

async function purgeExpiredNotifications() {
  const now = new Date();
  try {
    const result = await prisma.notification.deleteMany({
      where: { deleteAt: { lte: now } },
    });
    return result.count;
  } catch (err) {
    console.error("[notifications-ttl] purge failed", err);
    return 0;
  }
}

function startNotificationsTtl({ intervalMs = DEFAULT_INTERVAL_MS } = {}) {
  /** Первичный прогон при старте сервера. */
  purgeExpiredNotifications();

  const handle = setInterval(purgeExpiredNotifications, intervalMs);
  /** Чтобы сервис не держал event loop открытым в тестах/скриптах. */
  if (handle && typeof handle.unref === "function") {
    handle.unref();
  }

  return () => clearInterval(handle);
}

module.exports = {
  startNotificationsTtl,
  purgeExpiredNotifications,
};
