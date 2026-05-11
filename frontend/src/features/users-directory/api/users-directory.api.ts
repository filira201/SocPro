import { defaultSerializeQueryArgs } from "@reduxjs/toolkit/query";

import type { FollowListResponse } from "@/features/follow/api/follow.api";
import { api } from "@/shared/api/api";

export type UsersDirectoryQueryArgs = {
  cursor?: string | null;
  limit?: number;
  q?: string;
  skillIds?: string[];
};

type DefaultSerializeQueryArgsParams = Parameters<
  typeof defaultSerializeQueryArgs
>[0];

function usersDirectorySerializeQueryArgs({
  queryArgs,
  endpointDefinition,
  endpointName,
}: {
  queryArgs: UsersDirectoryQueryArgs;
  endpointDefinition: DefaultSerializeQueryArgsParams["endpointDefinition"];
  endpointName: DefaultSerializeQueryArgsParams["endpointName"];
}) {
  const { cursor, skillIds, ...rest } = queryArgs;
  void cursor;

  const normalized = {
    ...rest,
    ...(skillIds?.length
      ? { skillIds: [...skillIds].filter(Boolean).sort() }
      : {}),
  };

  return defaultSerializeQueryArgs({
    queryArgs: normalized,
    endpointDefinition,
    endpointName,
  });
}

function normalizeUsersDirectoryQueryForCompare(
  arg: UsersDirectoryQueryArgs | undefined
) {
  return {
    limit: arg?.limit ?? 10,
    cursor: arg?.cursor ?? null,
    q: (arg?.q ?? "").trim() || null,
    skillsKey:
      [...(arg?.skillIds ?? [])].filter(Boolean).sort().join(",") || null,
  };
}

export const usersDirectoryApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getUsersDirectory: builder.query<
      FollowListResponse,
      UsersDirectoryQueryArgs
    >({
      query: (arg) => {
        const { cursor, limit = 10, q, skillIds } = arg;
        const filteredIds = [...(skillIds ?? [])].filter(Boolean);
        const skillsCsv = filteredIds.length
          ? [...filteredIds].sort().join(",")
          : undefined;

        return {
          url: "/users",
          params: {
            limit,
            ...(cursor ? { cursor } : {}),
            ...(q?.trim() ? { q: q.trim() } : {}),
            ...(skillsCsv ? { skills: skillsCsv } : {}),
          },
        };
      },
      serializeQueryArgs: usersDirectorySerializeQueryArgs,
      merge: (currentCache, newItems, { arg }) => {
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
      forceRefetch({ currentArg, previousArg }) {
        if (previousArg === undefined) {
          return true;
        }

        const cur = normalizeUsersDirectoryQueryForCompare(currentArg);
        const prev = normalizeUsersDirectoryQueryForCompare(previousArg);

        return (
          cur.cursor !== prev.cursor ||
          cur.q !== prev.q ||
          cur.skillsKey !== prev.skillsKey ||
          cur.limit !== prev.limit
        );
      },
      providesTags: (result) =>
        result
          ? [
              { type: "UsersDirectory" as const, id: "LIST" },
              ...result.items.map((u) => ({
                type: "UsersDirectory" as const,
                id: u.id,
              })),
            ]
          : [{ type: "UsersDirectory" as const, id: "LIST" }],
    }),
  }),
});

export const { useGetUsersDirectoryQuery } = usersDirectoryApi;
