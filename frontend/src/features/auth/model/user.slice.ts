import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

import type { User } from "../lib/types";

const TOKEN_STORAGE_KEY = "token";

type UserState = {
  user: User | null;
  token: string | null;
};

const readTokenFromStorage = (): string | null => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
};

const writeTokenToStorage = (token: string | null) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    if (token) {
      window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch {
    // ignore storage errors
  }
};

const initialState: UserState = {
  user: null,
  token: readTokenFromStorage(),
};

type SetCredentialsPayload = {
  token: string;
  user?: User | null;
};

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    setCredentials(state, action: PayloadAction<SetCredentialsPayload>) {
      state.token = action.payload.token;

      if (action.payload.user !== undefined) {
        state.user = action.payload.user;
      }

      writeTokenToStorage(action.payload.token);
    },
    setUser(state, action: PayloadAction<User | null>) {
      state.user = action.payload;
    },
    logout(state) {
      state.user = null;
      state.token = null;
      writeTokenToStorage(null);
    },
  },
});

export const { setCredentials, setUser, logout } = userSlice.actions;

export const userReducer = userSlice.reducer;

export type { UserState };

export const TOKEN_KEY = TOKEN_STORAGE_KEY;
