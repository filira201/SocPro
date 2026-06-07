import { defaultSerializeQueryArgs } from "@reduxjs/toolkit/query";

import type {
  NotificationsQuery,
  PaginatedNotifications,
} from "../model/types";

import { api } from "@/shared/api/api";

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 30;

function normalizeNotificationsQuery(arg: NotificationsQuery | undefined) {
  const limit = arg?.limit ?? DEFAULT_LIMIT;

  return {
    limit: Math.min(Math.max(1, limit), MAX_LIMIT),
    cursor: arg?.cursor ?? null,
  };
}

export const notificationsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getNotifications: builder.query<
      PaginatedNotifications,
      NotificationsQuery | undefined
    >({
      query: (params) => {
        const { limit, cursor } = normalizeNotificationsQuery(params);

        return {
          url: "/notifications",
          params: {
            limit,
            ...(cursor ? { cursor } : {}),
          },
        };
      },
      serializeQueryArgs: ({ queryArgs, endpointDefinition, endpointName }) => {
        const { cursor: _c, ...rest } = normalizeNotificationsQuery(queryArgs);
        void _c;

        return defaultSerializeQueryArgs({
          queryArgs: rest,
          endpointDefinition,
          endpointName,
        });
      },
      merge: (currentCache, newItems, { arg }) => {
        const { cursor } = normalizeNotificationsQuery(arg);

        if (!cursor) {
          currentCache.items = newItems.items;
          currentCache.nextCursor = newItems.nextCursor;

          return;
        }

        const existingIds = new Set(currentCache.items.map((item) => item.id));
        currentCache.items.push(
          ...newItems.items.filter((item) => !existingIds.has(item.id))
        );
        currentCache.nextCursor = newItems.nextCursor;
      },
      forceRefetch({ currentArg, previousArg }) {
        if (previousArg === undefined) {
          return true;
        }

        const cur = normalizeNotificationsQuery(currentArg);
        const prev = normalizeNotificationsQuery(previousArg);

        return cur.cursor !== prev.cursor || cur.limit !== prev.limit;
      },
      providesTags: (result) =>
        result
          ? [
              { type: "Notification" as const, id: "LIST" },
              ...result.items.map((n) => ({
                type: "Notification" as const,
                id: n.id,
              })),
            ]
          : [{ type: "Notification" as const, id: "LIST" }],
    }),

    getUnreadNotificationCount: builder.query<{ count: number }, void>({
      query: () => "/notifications/unread-count",
      providesTags: [{ type: "Notification", id: "UNREAD_COUNT" }],
    }),

    markNotificationRead: builder.mutation<{ ok: boolean }, string>({
      query: (id) => ({
        url: `/notifications/${id}/read`,
        method: "PATCH",
      }),
      invalidatesTags: (_r, err) =>
        err
          ? []
          : [
              { type: "Notification", id: "LIST" },
              { type: "Notification", id: "UNREAD_COUNT" },
            ],
    }),

    markAllNotificationsRead: builder.mutation<
      { ok: boolean; updated: number },
      void
    >({
      query: () => ({
        url: "/notifications/read-all",
        method: "PATCH",
      }),
      invalidatesTags: (_r, err) =>
        err
          ? []
          : [
              { type: "Notification", id: "LIST" },
              { type: "Notification", id: "UNREAD_COUNT" },
            ],
    }),
  }),
});

export const {
  useGetNotificationsQuery,
  useGetUnreadNotificationCountQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
} = notificationsApi;
