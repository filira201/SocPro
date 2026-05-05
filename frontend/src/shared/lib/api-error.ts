import type { SerializedError } from "@reduxjs/toolkit";
import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";

type BackendErrorPayload = {
  error?: string;
  message?: string;
};

export type ApiError = FetchBaseQueryError | SerializedError;

export function getApiErrorMessage(
  err: ApiError | undefined,
  fallback = "Что-то пошло не так"
): string {
  if (!err) {
    return fallback;
  }

  if ("status" in err) {
    const data = (err as FetchBaseQueryError).data as
      | BackendErrorPayload
      | undefined;

    if (data?.error) {
      return data.error;
    }

    if (data?.message) {
      return data.message;
    }

    if (err.status === "FETCH_ERROR") {
      return "Сервер недоступен";
    }

    if (err.status === "TIMEOUT_ERROR") {
      return "Превышено время ожидания";
    }

    if (err.status === "PARSING_ERROR") {
      return "Ошибка при разборе ответа";
    }

    if (err.status === "CUSTOM_ERROR") {
      return (err as { error?: string }).error ?? fallback;
    }

    if (typeof err.status === "number") {
      return `Ошибка ${err.status}`;
    }

    return fallback;
  }

  return err.message || fallback;
}
