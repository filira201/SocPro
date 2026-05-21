import { beforeEach, describe, expect, test, vi } from "vitest";

const {
  mockSocketOn,
  mockRemoveAllListeners,
  mockDisconnect,
  mockIo,
  mockToastInfo,
  mockInvalidateTags,
} = vi.hoisted(() => {
  const mockSocketOn = vi.fn();
  const mockRemoveAllListeners = vi.fn();
  const mockDisconnect = vi.fn();
  const mockIo = vi.fn(() => ({
    on: mockSocketOn,
    removeAllListeners: mockRemoveAllListeners,
    disconnect: mockDisconnect,
  }));
  const mockToastInfo = vi.fn();
  const mockInvalidateTags = vi.fn();

  return {
    mockSocketOn,
    mockRemoveAllListeners,
    mockDisconnect,
    mockIo,
    mockToastInfo,
    mockInvalidateTags,
  };
});

vi.mock("socket.io-client", () => ({
  io: mockIo,
}));

vi.mock("sonner", () => ({
  toast: {
    info: mockToastInfo,
  },
}));

vi.mock("@/app/store", () => ({
  store: {
    dispatch: vi.fn((action: unknown) => action),
  },
}));

vi.mock("@/shared/api/api", () => ({
  api: {
    util: {
      invalidateTags: mockInvalidateTags,
    },
  },
}));

import {
  connectNotificationsSocket,
  disconnectNotificationsSocket,
} from "./notifications-socket";

function getHandler(event: string) {
  const call = mockSocketOn.mock.calls.find(([name]) => name === event);

  if (!call) {
    throw new Error(`Handler for "${event}" not registered`);
  }

  return call[1] as () => void;
}

describe("notifications-socket", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    disconnectNotificationsSocket();
  });

  test("при notifications:new показывает Toast и инвалидирует кэш", () => {
    // Arrange
    connectNotificationsSocket("test-token");

    // Act
    getHandler("notifications:new")();

    // Assert
    expect(mockToastInfo).toHaveBeenCalledWith("У вас новое уведомление", {
      duration: Number.POSITIVE_INFINITY,
    });
    expect(mockInvalidateTags).toHaveBeenCalledWith([
      { type: "Notification", id: "LIST" },
      { type: "Notification", id: "UNREAD_COUNT" },
    ]);
  });

  test("при notifications:invalidate только инвалидирует кэш без Toast", () => {
    // Arrange
    connectNotificationsSocket("test-token");

    // Act
    getHandler("notifications:invalidate")();

    // Assert
    expect(mockToastInfo).not.toHaveBeenCalled();
    expect(mockInvalidateTags).toHaveBeenCalledWith([
      { type: "Notification", id: "LIST" },
      { type: "Notification", id: "UNREAD_COUNT" },
    ]);
  });

  test("disconnectNotificationsSocket отключает сокет", () => {
    // Arrange
    connectNotificationsSocket("test-token");

    // Act
    disconnectNotificationsSocket();

    // Assert
    expect(mockRemoveAllListeners).toHaveBeenCalled();
    expect(mockDisconnect).toHaveBeenCalled();
  });

  test("повторный connect переподключает сокет с токеном", () => {
    // Arrange
    connectNotificationsSocket("first-token");
    disconnectNotificationsSocket();

    // Act
    connectNotificationsSocket("second-token");

    // Assert
    expect(mockIo).toHaveBeenLastCalledWith(
      expect.any(String),
      expect.objectContaining({
        auth: { token: "second-token" },
        path: "/socket.io/",
      })
    );
    expect(mockSocketOn).toHaveBeenCalledWith(
      "notifications:new",
      expect.any(Function)
    );
    expect(mockSocketOn).toHaveBeenCalledWith(
      "notifications:invalidate",
      expect.any(Function)
    );
  });
});
