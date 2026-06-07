import { defaultSerializeQueryArgs } from "@reduxjs/toolkit/query";

import type { AppDispatch, RootState } from "@/app/store";
import type { User } from "@/features/auth";
import { api } from "@/shared/api/api";

export type FollowListUser = User & { isFollowing: boolean };

export type FollowListResponse = {
  items: FollowListUser[];
  nextCursor: string | null;
};

type SplitApiQueryEntry = {
  endpointName?: string;
  status?: string;
  originalArgs?: unknown;
};

type PatchUndo = { undo: () => void };

const FOLLOW_LIST_ENDPOINTS = new Set([
  "getUsersDirectory",
  "getUserFollowers",
  "getUserFollowing",
]);

type UpdateCachedListData = (
  endpointName: string,
  args: unknown,
  updateRecipe: (draft: FollowListResponse) => void
) => Parameters<AppDispatch>[0];

type UpdateCachedUserData = (
  endpointName: "getUserById",
  userId: string,
  updateRecipe: (draft: User) => void
) => Parameters<AppDispatch>[0];

const updateCachedListData = api.util
  .updateQueryData as unknown as UpdateCachedListData;

const updateCachedUserData = api.util
  .updateQueryData as unknown as UpdateCachedUserData;

function updateFollowListCache(
  dispatch: AppDispatch,
  endpointName: string,
  args: unknown,
  followingId: string,
  isFollowing: boolean
): PatchUndo {
  return dispatch(
    updateCachedListData(endpointName, args, (draft) => {
      const item = draft.items.find((user) => user.id === followingId);

      if (item) {
        item.isFollowing = isFollowing;
      }
    })
  ) as unknown as PatchUndo;
}

function updateUserByIdFollowState(
  dispatch: AppDispatch,
  followingId: string,
  isFollowing: boolean
): PatchUndo {
  return dispatch(
    updateCachedUserData("getUserById", followingId, (draft) => {
      draft.isFollowing = isFollowing;
    })
  ) as unknown as PatchUndo;
}

function patchFollowStateInAllCachedLists(
  dispatch: AppDispatch,
  getState: () => RootState,
  followingId: string,
  isFollowing: boolean
) {
  const patches: PatchUndo[] = [];
  const queries = getState().splitApi.queries as Record<
    string,
    SplitApiQueryEntry | undefined
  >;
  const patchedCacheKeys = new Set<string>();

  for (const [cacheKey, entry] of Object.entries(queries)) {
    if (
      !entry?.endpointName ||
      !FOLLOW_LIST_ENDPOINTS.has(entry.endpointName) ||
      entry.status !== "fulfilled" ||
      entry.originalArgs === undefined ||
      entry.originalArgs === null ||
      patchedCacheKeys.has(cacheKey)
    ) {
      continue;
    }

    patchedCacheKeys.add(cacheKey);

    patches.push(
      updateFollowListCache(
        dispatch,
        entry.endpointName,
        entry.originalArgs,
        followingId,
        isFollowing
      )
    );
  }

  const hasUserByIdCache = Object.values(queries).some(
    (entry) =>
      entry?.endpointName === "getUserById" &&
      entry.status === "fulfilled" &&
      entry.originalArgs === followingId
  );

  if (hasUserByIdCache) {
    patches.push(updateUserByIdFollowState(dispatch, followingId, isFollowing));
  }

  return patches;
}

function followMutationLifecycle(isFollowing: boolean) {
  return (
    { followingId }: { followingId: string },
    {
      dispatch,
      queryFulfilled,
      getState,
    }: {
      dispatch: AppDispatch;
      queryFulfilled: Promise<unknown>;
      getState: () => unknown;
    }
  ) => {
    const patches = patchFollowStateInAllCachedLists(
      dispatch,
      getState as () => RootState,
      followingId,
      isFollowing
    );

    queryFulfilled.catch(() => {
      for (const patch of patches) {
        patch.undo();
      }
    });
  };
}

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
      onQueryStarted: followMutationLifecycle(true),
      invalidatesTags: (_result, error, { followingId }) =>
        error
          ? []
          : [
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
      onQueryStarted: followMutationLifecycle(false),
      invalidatesTags: (_result, error, { followingId }) =>
        error
          ? []
          : [
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
