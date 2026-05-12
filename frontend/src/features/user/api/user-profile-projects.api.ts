import { defaultSerializeQueryArgs } from "@reduxjs/toolkit/query";

import type { ProjectsListResponse } from "@/features/projects/model/types";
import { api } from "@/shared/api/api";

export type UserProfileProjectsQueryArgs = {
  userId: string;
  cursor?: string | null;
  limit?: number;
  q?: string;
  authorOnly?: boolean;
};

type DefaultSerializeQueryArgsParams = Parameters<
  typeof defaultSerializeQueryArgs
>[0];

function userProfileProjectsSerializeQueryArgs({
  queryArgs,
  endpointDefinition,
  endpointName,
}: {
  queryArgs: UserProfileProjectsQueryArgs;
  endpointDefinition: DefaultSerializeQueryArgsParams["endpointDefinition"];
  endpointName: DefaultSerializeQueryArgsParams["endpointName"];
}) {
  const { cursor, ...rest } = queryArgs;
  void cursor;

  return defaultSerializeQueryArgs({
    queryArgs: rest,
    endpointDefinition,
    endpointName,
  });
}

function normalizeUserProfileProjectsQueryForCompare(
  arg: UserProfileProjectsQueryArgs | undefined
) {
  return {
    userId: arg?.userId ?? "",
    limit: arg?.limit ?? 10,
    cursor: arg?.cursor ?? null,
    q: (arg?.q ?? "").trim() || null,
    authorOnly: arg?.authorOnly === true,
  };
}

export const userProfileProjectsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getUserProfileProjects: builder.query<
      ProjectsListResponse,
      UserProfileProjectsQueryArgs
    >({
      query: ({ userId, cursor, limit = 10, q, authorOnly }) => ({
        url: `/users/${userId}/projects`,
        params: {
          limit,
          ...(cursor ? { cursor } : {}),
          ...(q?.trim() ? { q: q.trim() } : {}),
          ...(authorOnly ? { author: "1" } : {}),
        },
      }),
      serializeQueryArgs: userProfileProjectsSerializeQueryArgs,
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

        const cur = normalizeUserProfileProjectsQueryForCompare(currentArg);
        const prev = normalizeUserProfileProjectsQueryForCompare(previousArg);

        return (
          cur.cursor !== prev.cursor ||
          cur.q !== prev.q ||
          cur.authorOnly !== prev.authorOnly ||
          cur.limit !== prev.limit ||
          cur.userId !== prev.userId
        );
      },
      providesTags: (result, _error, arg) =>
        result
          ? [
              "UserProjects",
              { type: "UserProjects" as const, id: arg.userId },
              ...result.items.map((p) => ({
                type: "Project" as const,
                id: p.id,
              })),
            ]
          : ["UserProjects", { type: "UserProjects" as const, id: arg.userId }],
    }),
  }),
});

export const { useGetUserProfileProjectsQuery } = userProfileProjectsApi;
