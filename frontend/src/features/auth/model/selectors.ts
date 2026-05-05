import type { RootState } from "@/app/store";

export const selectToken = (state: RootState) => state.user.token;

export const selectIsAuthenticated = (state: RootState) =>
  Boolean(state.user.token);

export const selectCurrentUser = (state: RootState) => state.user.user;
