import { ID_REGEX } from "@/shared/lib/id";

/** Разбор legacy-hash `#comment-{id}` для редиректа на страницу фокуса. */
export function parseCommentHash(hash: string): string | null {
  const raw = hash.replace(/^#/, "").trim();

  if (!raw.startsWith("comment-")) {
    return null;
  }

  const commentId = raw.slice("comment-".length);

  return ID_REGEX.test(commentId) ? commentId : null;
}
