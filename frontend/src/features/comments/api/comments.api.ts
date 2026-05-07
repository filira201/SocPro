import type { PaginatedResponse, Comment, CommentsQuery } from "../model/types";

import { postsApi } from "@/features/posts/api/posts.api";
import { api } from "@/shared/api/api";

export const commentsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getComments: builder.query<PaginatedResponse<Comment>, CommentsQuery>({
      query: ({ postId, cursor, limit = 10 }) => ({
        url: `/posts/${postId}/comments`,
        params: {
          limit,
          ...(cursor ? { cursor } : {}),
        },
      }),
      providesTags: (_result, _error, { postId }) => [
        { type: "Post", id: `${postId}-comments` },
      ],
    }),
    createComment: builder.mutation<Comment, FormData>({
      query: (body) => ({
        url: "/comments",
        method: "POST",
        body,
      }),
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        const postId = String(arg.get("postId") || "");

        try {
          const { data } = await queryFulfilled;

          dispatch(
            postsApi.util.updateQueryData("getPosts", undefined, (draft) => {
              const post = draft.items.find((item) => item.id === postId);

              if (post) {
                post.commentCount += 1;
              }
            })
          );
          dispatch(
            postsApi.util.updateQueryData("getPostById", postId, (draft) => {
              draft.commentCount += 1;
            })
          );
          dispatch(
            api.util.invalidateTags([
              { type: "Post", id: `${data.postId}-comments` },
            ])
          );
        } catch {
          dispatch(api.util.invalidateTags([{ type: "Post", id: postId }]));
        }
      },
    }),
    updateComment: builder.mutation<Comment, { id: string; body: FormData }>({
      query: ({ id, body }) => ({
        url: `/comments/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_result, _error, { body }) => [
        { type: "Post", id: `${String(body.get("postId") || "")}-comments` },
      ],
    }),
    deleteComment: builder.mutation<Comment, { id: string; postId: string }>({
      query: ({ id }) => ({
        url: `/comments/${id}`,
        method: "DELETE",
      }),
      async onQueryStarted({ postId }, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;

          dispatch(
            postsApi.util.updateQueryData("getPosts", undefined, (draft) => {
              const post = draft.items.find((item) => item.id === postId);

              if (post) {
                post.commentCount = Math.max(0, post.commentCount - 1);
              }
            })
          );
          dispatch(
            postsApi.util.updateQueryData("getPostById", postId, (draft) => {
              draft.commentCount = Math.max(0, draft.commentCount - 1);
            })
          );
          dispatch(
            api.util.invalidateTags([
              { type: "Post", id: `${postId}-comments` },
            ])
          );
        } catch {
          dispatch(api.util.invalidateTags([{ type: "Post", id: postId }]));
        }
      },
    }),
  }),
});

export const {
  useCreateCommentMutation,
  useDeleteCommentMutation,
  useGetCommentsQuery,
  useLazyGetCommentsQuery,
  useUpdateCommentMutation,
} = commentsApi;
