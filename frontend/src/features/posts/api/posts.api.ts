import type { PaginatedResponse, Post, PostsQuery } from "../model/types";

import { api } from "@/shared/api/api";

function patchPostLike(post: Post, likedByUser: boolean) {
  if (post.likedByUser === likedByUser) {
    return;
  }

  post.likedByUser = likedByUser;
  post.likeCount += likedByUser ? 1 : -1;
}

export const postsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getPosts: builder.query<PaginatedResponse<Post>, PostsQuery | undefined>({
      query: (params) => {
        const request = params ?? {};

        return {
          url: "/posts",
          params: {
            limit: request.limit ?? 10,
            ...(request.cursor ? { cursor: request.cursor } : {}),
          },
        };
      },
      serializeQueryArgs: ({ endpointName }) => endpointName,
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
        const currentCursor = currentArg && currentArg.cursor;
        const previousCursor = previousArg && previousArg.cursor;

        return currentCursor !== previousCursor;
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
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;

          dispatch(
            postsApi.util.updateQueryData("getPosts", undefined, (draft) => {
              if (!draft.items.some((post) => post.id === data.id)) {
                draft.items.unshift(data);
              }
            })
          );
        } catch {
          dispatch(api.util.invalidateTags([{ type: "Post", id: "LIST" }]));
        }
      },
    }),
    updatePost: builder.mutation<Post, { id: string; body: FormData }>({
      query: ({ id, body }) => ({
        url: `/posts/${id}`,
        method: "PATCH",
        body,
      }),
      async onQueryStarted({ id }, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;

          dispatch(
            postsApi.util.updateQueryData("getPosts", undefined, (draft) => {
              const index = draft.items.findIndex((post) => post.id === id);

              if (index !== -1) {
                draft.items[index] = data;
              }
            })
          );
          dispatch(
            postsApi.util.updateQueryData("getPostById", id, (draft) => {
              Object.assign(draft, data);
            })
          );
        } catch {
          dispatch(api.util.invalidateTags([{ type: "Post", id }]));
        }
      },
    }),
    deletePost: builder.mutation<unknown, string>({
      query: (id) => ({
        url: `/posts/${id}`,
        method: "DELETE",
      }),
      async onQueryStarted(id, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          postsApi.util.updateQueryData("getPosts", undefined, (draft) => {
            draft.items = draft.items.filter((post) => post.id !== id);
          })
        );

        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
    }),
    likePost: builder.mutation<unknown, string>({
      query: (postId) => ({
        url: "/likes",
        method: "POST",
        body: { postId },
      }),
      onQueryStarted(postId, { dispatch, queryFulfilled }) {
        const patches = [
          dispatch(
            postsApi.util.updateQueryData("getPosts", undefined, (draft) => {
              const post = draft.items.find((item) => item.id === postId);

              if (post) {
                patchPostLike(post, true);
              }
            })
          ),
          dispatch(
            postsApi.util.updateQueryData("getPostById", postId, (draft) => {
              patchPostLike(draft, true);
            })
          ),
        ];

        queryFulfilled.catch(() => patches.forEach((patch) => patch.undo()));
      },
    }),
    unlikePost: builder.mutation<unknown, string>({
      query: (postId) => ({
        url: `/likes/${postId}`,
        method: "DELETE",
      }),
      onQueryStarted(postId, { dispatch, queryFulfilled }) {
        const patches = [
          dispatch(
            postsApi.util.updateQueryData("getPosts", undefined, (draft) => {
              const post = draft.items.find((item) => item.id === postId);

              if (post) {
                patchPostLike(post, false);
              }
            })
          ),
          dispatch(
            postsApi.util.updateQueryData("getPostById", postId, (draft) => {
              patchPostLike(draft, false);
            })
          ),
        ];

        queryFulfilled.catch(() => patches.forEach((patch) => patch.undo()));
      },
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
