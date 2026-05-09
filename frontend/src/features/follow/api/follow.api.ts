import type { User } from "@/features/auth";
import { api } from "@/shared/api/api";

export type FollowListUser = User & { isFollowing: boolean };

type FollowListResponse = {
  items: FollowListUser[];
};

function followListTags(userId: string, kind: "followers" | "following") {
  return [{ type: "FollowList" as const, id: `${kind}-${userId}` }];
}

export const followApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getUserFollowers: builder.query<FollowListResponse, string>({
      query: (userId) => `/users/${userId}/followers`,
      providesTags: (_result, _error, userId) =>
        followListTags(userId, "followers"),
    }),

    getUserFollowing: builder.query<FollowListResponse, string>({
      query: (userId) => `/users/${userId}/following`,
      providesTags: (_result, _error, userId) =>
        followListTags(userId, "following"),
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
