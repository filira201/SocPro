import type { User } from "../lib/types";
import { setCredentials, setUser } from "../model/user.slice";

import { api } from "@/shared/api/api";

type LoginPayload = {
  email: string;
  password: string;
};

type RegisterPayload = {
  email: string;
  firstName: string;
  lastName?: string | null;
  patronymic?: string | null;
  password: string;
  personalDataConsent: boolean;
};

export const authApi = api.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation<{ token: string }, LoginPayload>({
      query: (credentials) => ({
        url: "/login",
        method: "POST",
        body: credentials,
      }),
      async onQueryStarted(_args, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(setCredentials({ token: data.token }));
          await dispatch(authApi.endpoints.current.initiate()).unwrap();
        } catch {
          // ошибка обрабатывается на странице через unwrap()
        }
      },
    }),

    register: builder.mutation<User, RegisterPayload>({
      query: (payload) => ({
        url: "/register",
        method: "POST",
        body: payload,
      }),
    }),

    current: builder.query<User, void>({
      query: () => ({
        url: "/current",
        method: "GET",
      }),
      providesTags: ["User"],
      async onQueryStarted(_args, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(setUser(data));
        } catch {
          // если запрос упал — slice уже пустой
        }
      },
    }),

    getUserById: builder.query<User, string>({
      query: (id) => ({
        url: `/users/${id}`,
        method: "GET",
      }),
      providesTags: (_result, _error, id) => [{ type: "User", id }],
    }),

    updateUser: builder.mutation<User, { userData: FormData; id: string }>({
      query: ({ userData, id }) => ({
        url: `/users/${id}`,
        method: "PUT",
        body: userData,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        "User",
        "UserProjects",
        { type: "User", id },
        { type: "UserProjects", id },
      ],
    }),
  }),
});

export const {
  useRegisterMutation,
  useLoginMutation,
  useCurrentQuery,
  useLazyCurrentQuery,
  useGetUserByIdQuery,
  useLazyGetUserByIdQuery,
  useUpdateUserMutation,
} = authApi;

export const {
  endpoints: { login, register, current, getUserById, updateUser },
} = authApi;
