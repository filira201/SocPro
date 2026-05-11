import type { Draft } from "@reduxjs/toolkit";
import { defaultSerializeQueryArgs } from "@reduxjs/toolkit/query";

import type { PaginatedResponse, Post, PostsQuery } from "../model/types";

import type { AppDispatch, RootState } from "@/app/store";
import { api } from "@/shared/api/api";

function normalizePostsQueryForCompare(arg: PostsQuery | undefined) {
  return {
    limit: arg?.limit ?? 10,
    cursor: arg?.cursor ?? null,
    q: (arg?.q ?? "").trim() || null,
    mine: arg?.mine === true,
    sort: arg?.sort === "old" ? "old" : "new",
  };
}

type SplitApiQueryEntry = {
  endpointName?: string;
  status?: string;
  originalArgs?: unknown;
};

export function patchAllGetPostsLists(
  dispatch: AppDispatch,
  getState: () => RootState,
  recipe: (draft: Draft<PaginatedResponse<Post>>) => void
) {
  const patches: Array<{ undo: () => void }> = [];
  const queries = getState().splitApi.queries as Record<
    string,
    SplitApiQueryEntry | undefined
  >;

  for (const entry of Object.values(queries)) {
    if (
      entry?.endpointName === "getPosts" &&
      entry.status === "fulfilled" &&
      entry.originalArgs !== undefined &&
      entry.originalArgs !== null
    ) {
      patches.push(
        dispatch(
          postsApi.util.updateQueryData(
            "getPosts",
            entry.originalArgs as PostsQuery,
            recipe
          )
        )
      );
    }
  }

  return patches;
}

export const postsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getPosts: builder.query<PaginatedResponse<Post>, PostsQuery | undefined>({
      query: (params) => {
        const request = params ?? {};
        const limit = request.limit ?? 10;

        return {
          url: "/posts",
          params: {
            limit,
            ...(request.cursor ? { cursor: request.cursor } : {}),
            ...(request.q?.trim() ? { q: request.q.trim() } : {}),
            ...(request.mine ? { mine: "1" } : {}),
            ...(request.sort === "old" ? { sort: "old" } : {}),
          },
        };
      },
      serializeQueryArgs: ({ queryArgs, endpointDefinition, endpointName }) => {
        const { cursor, ...rest } = queryArgs ?? {};
        void cursor;

        return defaultSerializeQueryArgs({
          queryArgs: rest,
          endpointDefinition,
          endpointName,
        });
      },
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

        const cur = normalizePostsQueryForCompare(currentArg);
        const prev = normalizePostsQueryForCompare(previousArg);

        return (
          cur.cursor !== prev.cursor ||
          cur.q !== prev.q ||
          cur.mine !== prev.mine ||
          cur.sort !== prev.sort ||
          cur.limit !== prev.limit
        );
      },
      providesTags: (result) =>
        result
          ? [
              { type: "Post", id: "LIST" },
              ...result.items.map((post) => ({
                type: "Post" as const,
                id: post.id,
              })),
            ]
          : [{ type: "Post", id: "LIST" }],
    }),
    getPostById: builder.query<Post, string>({
      query: (id) => `/posts/${id}`,
      providesTags: (_result, _error, id) => [{ type: "Post", id }],
    }),
    createPost: builder.mutation<Post, FormData>({
      query: (body) => ({
        url: "/posts",
        method: "POST",
        body,
      }),
      invalidatesTags: (_result, error) =>
        error ? [] : [{ type: "Post", id: "LIST" }],
    }),
    updatePost: builder.mutation<Post, { id: string; body: FormData }>({
      query: ({ id, body }) => ({
        url: `/posts/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_result, error, { id }) =>
        error ? [] : [{ type: "Post", id }],
    }),
    deletePost: builder.mutation<unknown, string>({
      query: (id) => ({
        url: `/posts/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, error) =>
        error ? [] : [{ type: "Post", id: "LIST" }],
    }),
    likePost: builder.mutation<unknown, string>({
      query: (postId) => ({
        url: "/likes",
        method: "POST",
        body: { postId },
      }),
      invalidatesTags: (_result, error, postId) =>
        error ? [] : [{ type: "Post", id: postId }],
    }),
    unlikePost: builder.mutation<unknown, string>({
      query: (postId) => ({
        url: `/likes/${postId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, error, postId) =>
        error ? [] : [{ type: "Post", id: postId }],
    }),
  }),
});

export const {
  useCreatePostMutation,
  useDeletePostMutation,
  useGetPostByIdQuery,
  useGetPostsQuery,
  useLikePostMutation,
  useUnlikePostMutation,
  useUpdatePostMutation,
} = postsApi;
