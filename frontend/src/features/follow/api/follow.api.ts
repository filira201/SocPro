import { defaultSerializeQueryArgs } from "@reduxjs/toolkit/query";

import type { User } from "@/features/auth";
import { api } from "@/shared/api/api";

export type FollowListUser = User & { isFollowing: boolean };

export type FollowListResponse = {
  items: FollowListUser[];
  nextCursor: string | null;
};

export type FollowListQueryArgs = {
  userId: string;
  cursor?: string | null;
  limit?: number;
  /** Поиск по частям ФИО (слова через пробел). */
  q?: string;
};

function normalizeFollowListQueryForCompare(
  arg: FollowListQueryArgs | undefined
) {
  return {
    userId: arg?.userId ?? "",
    limit: arg?.limit ?? 10,
    cursor: arg?.cursor ?? null,
    q: (arg?.q ?? "").trim() || null,
  };
}

function followListTags(userId: string, kind: "followers" | "following") {
  return [{ type: "FollowList" as const, id: `${kind}-${userId}` }];
}

type DefaultSerializeQueryArgsParams = Parameters<
  typeof defaultSerializeQueryArgs
>[0];

type FollowListSerializeQueryArgsInput = {
  queryArgs: FollowListQueryArgs;
  endpointDefinition: DefaultSerializeQueryArgsParams["endpointDefinition"];
  endpointName: DefaultSerializeQueryArgsParams["endpointName"];
};

function followListSerializeQueryArgs({
  queryArgs,
  endpointDefinition,
  endpointName,
}: FollowListSerializeQueryArgsInput) {
  const { cursor, ...rest } = queryArgs;
  void cursor;

  return defaultSerializeQueryArgs({
    queryArgs: rest,
    endpointDefinition,
    endpointName,
  });
}

function buildFollowListEndpoint(pathSuffix: "followers" | "following") {
  return {
    query: (arg: FollowListQueryArgs) => {
      const { userId, cursor, limit = 10, q } = arg;

      return {
        url: `/users/${userId}/${pathSuffix}`,
        params: {
          limit,
          ...(cursor ? { cursor } : {}),
          ...(q?.trim() ? { q: q.trim() } : {}),
        },
      };
    },
    serializeQueryArgs: followListSerializeQueryArgs,
    merge: (
      currentCache: FollowListResponse,
      newItems: FollowListResponse,
      { arg }: { arg: FollowListQueryArgs | undefined }
    ) => {
      if (!arg || !arg.cursor) {
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
    forceRefetch({
      currentArg,
      previousArg,
    }: {
      currentArg: FollowListQueryArgs | undefined;
      previousArg: FollowListQueryArgs | undefined;
    }) {
      if (previousArg === undefined) {
        return true;
      }

      const cur = normalizeFollowListQueryForCompare(currentArg);
      const prev = normalizeFollowListQueryForCompare(previousArg);

      return (
        cur.cursor !== prev.cursor ||
        cur.q !== prev.q ||
        cur.limit !== prev.limit ||
        cur.userId !== prev.userId
      );
    },
    providesTags: (
      _result: unknown,
      _error: unknown,
      arg: FollowListQueryArgs
    ) => followListTags(arg.userId, pathSuffix),
  };
}

export const followApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getUserFollowers: builder.query<FollowListResponse, FollowListQueryArgs>({
      ...buildFollowListEndpoint("followers"),
    }),

    getUserFollowing: builder.query<FollowListResponse, FollowListQueryArgs>({
      ...buildFollowListEndpoint("following"),
    }),

    followUser: builder.mutation<void, { followingId: string }>({
      query: ({ followingId }) => ({
        url: "/follow",
        method: "POST",
        body: { followingId },
      }),
      invalidatesTags: (_result, _error, { followingId }) => [
        "User",
        { type: "User", id: followingId },
        /** Все списки подписчиков/подписок (в т.ч. текущая страница «Подписчики» с флагом isFollowing) */
        "FollowList",
        "UsersDirectory",
      ],
    }),

    unfollowUser: builder.mutation<void, { followingId: string }>({
      query: ({ followingId }) => ({
        url: `/unfollow/${followingId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, { followingId }) => [
        "User",
        { type: "User", id: followingId },
        "FollowList",
        "UsersDirectory",
      ],
    }),
  }),
});

export const {
  useGetUserFollowersQuery,
  useGetUserFollowingQuery,
  useFollowUserMutation,
  useUnfollowUserMutation,
} = followApi;
