import { useEffect } from "react";

import {
  connectNotificationsSocket,
  disconnectNotificationsSocket,
} from "../lib/notifications-socket";

import { selectToken } from "@/features/auth";
import { useAppSelector } from "@/shared/lib/redux";

/**
 * Держит WebSocket к API и инвалидирует RTK Query при новых уведомлениях.
 *
 * Закрытием соединения управляет сам модуль `notifications-socket`:
 * `connectNotificationsSocket` сам отключит старый сокет при смене токена
 * и идемпотентен по токену. Поэтому в cleanup мы НЕ дёргаем disconnect —
 * иначе React StrictMode (dev double-mount) и React Compiler перезапуски
 * useEffect рвут живой handshake и приводят к browser-warning
 * «WebSocket is closed before the connection is established».
 */
export function NotificationsSocketBridge() {
  const token = useAppSelector(selectToken);

  useEffect(() => {
    if (!token) {
      disconnectNotificationsSocket();

      return undefined;
    }

    connectNotificationsSocket(token);

    return undefined;
  }, [token]);

  return null;
}
