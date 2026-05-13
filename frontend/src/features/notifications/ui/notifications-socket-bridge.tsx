import { useEffect } from "react";

import {
  connectNotificationsSocket,
  disconnectNotificationsSocket,
} from "../lib/notifications-socket";

import { selectToken } from "@/features/auth";
import { useAppSelector } from "@/shared/lib/redux";

/** Держит WebSocket к API и инвалидирует RTK Query при новых уведомлениях. */
export function NotificationsSocketBridge() {
  const token = useAppSelector(selectToken);

  useEffect(() => {
    if (!token) {
      disconnectNotificationsSocket();

      return undefined;
    }

    connectNotificationsSocket(token);

    return () => {
      disconnectNotificationsSocket();
    };
  }, [token]);

  return null;
}
