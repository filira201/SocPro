const OBJECT_ID_REGEX = /^[a-f\d]{24}$/i;

/** Разбор legacy-hash `#comment-{id}` для редиректа на страницу фокуса. */
export function parseCommentHash(hash: string): string | null {
  const raw = hash.replace(/^#/, "").trim();

  if (!raw.startsWith("comment-")) {
    return null;
  }

  const commentId = raw.slice("comment-".length);

  return OBJECT_ID_REGEX.test(commentId) ? commentId : null;
}
