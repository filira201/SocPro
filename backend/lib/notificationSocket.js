const jwt = require("jsonwebtoken");
const { Server } = require("socket.io");

/** @type {import('socket.io').Server | null} */
let io = null;

function parseAllowedOrigins() {
  const raw = process.env.SOCKET_ALLOWED_ORIGINS;
  if (!raw || !String(raw).trim()) {
    return true;
  }
  return String(raw)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Подключает Socket.IO к HTTP-серверу (тот же порт, что и REST).
 * Клиент: JWT в `handshake.auth.token`, комната `user:<userId>`.
 * @param {import('http').Server} httpServer
 */
function attachNotificationSocket(httpServer) {
  io = new Server(httpServer, {
    path: "/socket.io/",
    cors: {
      origin: parseAllowedOrigins(),
      methods: ["GET", "POST"],
    },
  });

  io.use((socket, next) => {
    const secret = process.env.SECRET_KEY;
    const token = socket.handshake.auth?.token;

    if (!secret || !token || typeof token !== "string") {
      return next(new Error("UNAUTHORIZED"));
    }

    try {
      const decoded = jwt.verify(token, secret);
      const userId = decoded?.userId;
      if (!userId || typeof userId !== "string") {
        return next(new Error("UNAUTHORIZED"));
      }
      socket.data.userId = userId;
      return next();
    } catch {
      return next(new Error("FORBIDDEN"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.data.userId;
    if (userId) {
      socket.join(`user:${userId}`);
    }
  });
}

/**
 * Сообщить клиенту перезапросить список уведомлений и счётчик непрочитанных.
 * @param {string} userId
 */
function emitNotificationsInvalidate(userId) {
  if (!io || !userId) {
    return;
  }
  io.to(`user:${userId}`).emit("notifications:invalidate");
}

module.exports = {
  attachNotificationSocket,
  emitNotificationsInvalidate,
};
