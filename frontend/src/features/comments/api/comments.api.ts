import type {
  Comment,
  CommentsQuery,
  DeleteCommentResponse,
  PaginatedResponse,
} from "../model/types";

import { postsApi } from "@/features/posts/api/posts.api";
import { api } from "@/shared/api/api";

const ROOT_INITIAL_COMMENT_LIMIT = 3;
const ROOT_PAGE_COMMENT_LIMIT = 10;

function getCommentLikePatchQueries(query: CommentsQuery): CommentsQuery[] {
  if (query.parentId) {
    return [query];
  }

  const sort = query.sort ?? "new";

  return [
    {
      postId: query.postId,
      parentId: null,
      sort,
      limit: ROOT_INITIAL_COMMENT_LIMIT,
    },
    {
      postId: query.postId,
      parentId: null,
      sort,
      limit: ROOT_PAGE_COMMENT_LIMIT,
    },
  ];
}

export const commentsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getComments: builder.query<PaginatedResponse<Comment>, CommentsQuery>({
      query: ({ postId, parentId, sort = "new", cursor, limit = 10 }) => ({
        url: `/posts/${postId}/comments`,
        params: {
          sort,
          limit,
          ...(parentId ? { parentId } : {}),
          ...(cursor ? { cursor } : {}),
        },
      }),
      providesTags: (_result, _error, { postId, parentId, sort }) => [
        {
          type: "Post",
          id: `${postId}-comments-${parentId ?? "root"}-${sort ?? "new"}`,
        },
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
              { type: "Post" as const, id: `${postId}-comments` },
              { type: "Post" as const, id: `${data.postId}-comments-root-new` },
              { type: "Post" as const, id: `${data.postId}-comments-root-old` },
              { type: "Post" as const, id: `${data.postId}-comments-root-top` },
              ...(data.parentId
                ? [
                    {
                      type: "Post" as const,
                      id: `${data.postId}-comments-${data.parentId}-new`,
                    },
                    {
                      type: "Post" as const,
                      id: `${data.postId}-comments-${data.parentId}-old`,
                    },
                    {
                      type: "Post" as const,
                      id: `${data.postId}-comments-${data.parentId}-top`,
                    },
                  ]
                : []),
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
        {
          type: "Post",
          id: `${String(body.get("postId") || "")}-comments-root-new`,
        },
        {
          type: "Post",
          id: `${String(body.get("postId") || "")}-comments-root-old`,
        },
        {
          type: "Post",
          id: `${String(body.get("postId") || "")}-comments-root-top`,
        },
        ...(String(body.get("parentId") || "")
          ? [
              {
                type: "Post" as const,
                id: `${String(body.get("postId") || "")}-comments-${String(body.get("parentId"))}-new`,
              },
              {
                type: "Post" as const,
                id: `${String(body.get("postId") || "")}-comments-${String(body.get("parentId"))}-old`,
              },
              {
                type: "Post" as const,
                id: `${String(body.get("postId") || "")}-comments-${String(body.get("parentId"))}-top`,
              },
            ]
          : []),
      ],
    }),
    deleteComment: builder.mutation<
      DeleteCommentResponse,
      { id: string; postId: string }
    >({
      query: ({ id }) => ({
        url: `/comments/${id}`,
        method: "DELETE",
      }),
      async onQueryStarted({ postId }, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          const decreaseBy = Math.max(1, data.deletedCount ?? 1);

          dispatch(
            postsApi.util.updateQueryData("getPosts", undefined, (draft) => {
              const post = draft.items.find((item) => item.id === postId);

              if (post) {
                post.commentCount = Math.max(0, post.commentCount - decreaseBy);
              }
            })
          );
          dispatch(
            postsApi.util.updateQueryData("getPostById", postId, (draft) => {
              draft.commentCount = Math.max(0, draft.commentCount - decreaseBy);
            })
          );

          dispatch(
            api.util.invalidateTags([
              { type: "Post", id: `${postId}-comments` },
              { type: "Post", id: `${postId}-comments-root-new` },
              { type: "Post", id: `${postId}-comments-root-old` },
              { type: "Post", id: `${postId}-comments-root-top` },
              ...(data.parentId
                ? [
                    {
                      type: "Post" as const,
                      id: `${postId}-comments-${data.parentId}-new`,
                    },
                    {
                      type: "Post" as const,
                      id: `${postId}-comments-${data.parentId}-old`,
                    },
                    {
                      type: "Post" as const,
                      id: `${postId}-comments-${data.parentId}-top`,
                    },
                  ]
                : []),
            ])
          );
        } catch {
          dispatch(api.util.invalidateTags([{ type: "Post", id: postId }]));
        }
      },
    }),
    likeComment: builder.mutation<
      Comment,
      { id: string; query: CommentsQuery }
    >({
      query: ({ id }) => ({
        url: `/comments/${id}/like`,
        method: "POST",
      }),
      onQueryStarted({ id, query }, { dispatch, queryFulfilled }) {
        const targets = getCommentLikePatchQueries(query);
        const patches = targets.map((target) =>
          dispatch(
            commentsApi.util.updateQueryData("getComments", target, (draft) => {
              const comment = draft.items.find((item) => item.id === id);

              if (!comment || comment.likedByUser) {
                return;
              }

              comment.likedByUser = true;
              comment.likeCount += 1;
            })
          )
        );

        queryFulfilled.catch(() => patches.forEach((patch) => patch.undo()));
      },
    }),
    unlikeComment: builder.mutation<
      Comment,
      { id: string; query: CommentsQuery }
    >({
      query: ({ id }) => ({
        url: `/comments/${id}/like`,
        method: "DELETE",
      }),
      onQueryStarted({ id, query }, { dispatch, queryFulfilled }) {
        const targets = getCommentLikePatchQueries(query);
        const patches = targets.map((target) =>
          dispatch(
            commentsApi.util.updateQueryData("getComments", target, (draft) => {
              const comment = draft.items.find((item) => item.id === id);

              if (!comment || !comment.likedByUser) {
                return;
              }

              comment.likedByUser = false;
              comment.likeCount = Math.max(0, comment.likeCount - 1);
            })
          )
        );

        queryFulfilled.catch(() => patches.forEach((patch) => patch.undo()));
      },
    }),
  }),
});

export const {
  useCreateCommentMutation,
  useDeleteCommentMutation,
  useGetCommentsQuery,
  useLikeCommentMutation,
  useLazyGetCommentsQuery,
  useUnlikeCommentMutation,
  useUpdateCommentMutation,
} = commentsApi;
