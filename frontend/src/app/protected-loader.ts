import { redirect } from "react-router";

import { TOKEN_KEY } from "@/features/auth/model/user.slice";
import { ROUTES } from "@/shared/model/routes";

export function protectedLoader() {
  const token =
    typeof window === "undefined" ? null : localStorage.getItem(TOKEN_KEY);

  if (!token) {
    return redirect(ROUTES.LOGIN);
  }

  return null;
}
