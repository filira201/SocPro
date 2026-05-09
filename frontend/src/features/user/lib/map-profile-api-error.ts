import type { UseFormSetError } from "react-hook-form";

import type { ProfileEditFormValues } from "../model/profile-edit-schema";

export function mapProfileApiErrorToFormFields(
  message: string,
  setError: UseFormSetError<ProfileEditFormValues>
): boolean {
  if (message.includes("Имя:")) {
    setError("firstName", { type: "server", message });

    return true;
  }

  if (message.includes("Фамилия:")) {
    setError("lastName", { type: "server", message });

    return true;
  }

  if (message.includes("Отчество:")) {
    setError("patronymic", { type: "server", message });

    return true;
  }

  if (
    message === "Некорректная дата рождения" ||
    message.includes("Дата рождения не может быть в будущем")
  ) {
    setError("dateOfBirth", { type: "server", message });

    return true;
  }

  return false;
}
