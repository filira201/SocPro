export type { User } from "./lib/types";

export {
  displayPublicName,
  userInitials,
  CYRILLIC_FIO_PART_REGEX,
} from "./lib/display-name";

export {
  loginSchema,
  registerSchema,
  fioPartRequiredSchema,
  fioPartOptionalSchema,
  type LoginFormValues,
  type RegisterFormValues,
} from "./model/schemas";

export {
  userReducer,
  setCredentials,
  setUser,
  logout,
  TOKEN_KEY,
  type UserState,
} from "./model/user.slice";

export {
  selectToken,
  selectIsAuthenticated,
  selectCurrentUser,
} from "./model/selectors";

export {
  authApi,
  useLoginMutation,
  useRegisterMutation,
  useCurrentQuery,
  useLazyCurrentQuery,
  useGetUserByIdQuery,
  useLazyGetUserByIdQuery,
  useUpdateUserMutation,
} from "./api/auth.api";
