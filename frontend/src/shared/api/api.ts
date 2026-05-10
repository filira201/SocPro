import {
  createApi,
  fetchBaseQuery,
  retry,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from "@reduxjs/toolkit/query/react";

import type { AppDispatch, RootState } from "@/app/store";
import { logout, TOKEN_KEY } from "@/features/auth/model/user.slice";
import { BASE_URL } from "@/shared/config/env";

const rawBaseQuery = fetchBaseQuery({
  baseUrl: `${BASE_URL}/api`,
  prepareHeaders: (headers, { getState }) => {
    const state = getState() as RootState;
    const token = state.user.token || localStorage.getItem(TOKEN_KEY);

    if (token) {
      headers.set("authorization", `Bearer ${token}`);
    }

    return headers;
  },
});

const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, baseQueryApi, extra) => {
  const result = await rawBaseQuery(args, baseQueryApi, extra);

  if (result.error?.status === 401) {
    (baseQueryApi.dispatch as AppDispatch)(logout());
  }

  return result;
};

const baseQueryWithRetry = retry(baseQueryWithReauth, { maxRetries: 1 });

export const api = createApi({
  reducerPath: "splitApi",
  baseQuery: baseQueryWithRetry,
  refetchOnMountOrArgChange: true,
  tagTypes: [
    "User",
    "FollowList",
    "Post",
    "Project",
    "Skill",
    "Application",
    "Member",
    "Geo",
  ],
  endpoints: () => ({}),
});
