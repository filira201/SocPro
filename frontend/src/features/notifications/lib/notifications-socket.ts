import { io, type Socket } from "socket.io-client";

import { store } from "@/app/store";
import { api } from "@/shared/api/api";
import { BASE_URL } from "@/shared/config/env";

let socket: Socket | null = null;

const INVALIDATE_TAGS = [
  { type: "Notification" as const, id: "LIST" },
  { type: "Notification" as const, id: "UNREAD_COUNT" },
];

export function connectNotificationsSocket(token: string) {
  disconnectNotificationsSocket();

  socket = io(BASE_URL, {
    path: "/socket.io/",
    auth: { token },
    transports: ["websocket", "polling"],
  });

  socket.on("notifications:invalidate", () => {
    store.dispatch(api.util.invalidateTags(INVALIDATE_TAGS));
  });
}

export function disconnectNotificationsSocket() {
  if (!socket) {
    return;
  }

  socket.removeAllListeners();
  socket.disconnect();
  socket = null;
}
