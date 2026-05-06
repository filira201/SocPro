import { BASE_URL } from "@/shared/config/env";

const formatter = new Intl.DateTimeFormat("ru-RU", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatPostDate(value: string) {
  return formatter.format(new Date(value));
}

export function toAbsoluteUploadUrl(url: string) {
  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  return `${BASE_URL}${url}`;
}
