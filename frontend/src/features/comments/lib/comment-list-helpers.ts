import type { Comment, CommentsSort } from "../model/types";

export function dedupeComments(items: Comment[]) {
  const seen = new Set<string>();
  const result: Comment[] = [];

  for (const item of items) {
    if (seen.has(item.id)) {
      continue;
    }

    seen.add(item.id);
    result.push(item);
  }

  return result;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function stripMentionPrefix(content: string, username: string | null) {
  if (!username) {
    return content;
  }

  const escaped = escapeRegExp(username);
  const withComma = new RegExp(`^@${escaped},\\s*`);
  const withSpaceOnly = new RegExp(`^@${escaped}\\s+`);

  if (withComma.test(content)) {
    return content.replace(withComma, "");
  }

  if (withSpaceOnly.test(content)) {
    return content.replace(withSpaceOnly, "");
  }

  return content;
}

export function compareByInteresting(a: Comment, b: Comment) {
  const aScore = a.likeCount + a.replyCount;
  const bScore = b.likeCount + b.replyCount;

  if (aScore !== bScore) {
    return bScore - aScore;
  }

  if (a.likeCount !== b.likeCount) {
    return b.likeCount - a.likeCount;
  }

  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

export function insertBySort(
  items: Comment[],
  next: Comment,
  sort: CommentsSort
) {
  const merged = dedupeComments([next, ...items]);

  if (sort === "new") {
    return [...merged].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  if (sort === "old") {
    return [...merged].sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }

  return [...merged].sort(compareByInteresting);
}
