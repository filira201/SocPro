import { io, type Socket } from "socket.io-client";
import { toast } from "sonner";

import { store } from "@/app/store";
import { api } from "@/shared/api/api";
import { BASE_URL } from "@/shared/config/env";

let socket: Socket | null = null;
let currentToken: string | null = null;

const INVALIDATE_TAGS = [
  { type: "Notification" as const, id: "LIST" },
  { type: "Notification" as const, id: "UNREAD_COUNT" },
];

function invalidateNotificationQueries() {
  store.dispatch(api.util.invalidateTags(INVALIDATE_TAGS));
}

function attachSocketListeners(s: Socket) {
  s.on("notifications:new", () => {
    toast.info("У вас новое уведомление", {
      /** Sonner: без автозакрытия, только крестик / свайп (см. исходники sonner). */
      duration: Number.POSITIVE_INFINITY,
    });
    invalidateNotificationQueries();
  });

  s.on("notifications:invalidate", () => {
    invalidateNotificationQueries();
  });
}

export function connectNotificationsSocket(token: string) {
  /**
   * Идемпотентно по токену: повторный вызов с тем же токеном (например, из-за
   * двойного запуска useEffect в React StrictMode dev) переиспользует
   * существующее соединение, чтобы не рвать активный handshake и не получать
   * browser warning «WebSocket is closed before the connection is established».
   */
  if (socket && currentToken === token) {
    return;
  }

  disconnectNotificationsSocket();

  currentToken = token;
  socket = io(BASE_URL, {
    path: "/socket.io/",
    auth: { token },
    transports: ["websocket", "polling"],
  });

  attachSocketListeners(socket);
}

export function disconnectNotificationsSocket() {
  if (!socket) {
    currentToken = null;

    return;
  }

  socket.removeAllListeners();
  socket.disconnect();
  socket = null;
  currentToken = null;
}
