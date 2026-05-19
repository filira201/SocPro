import type { Comment } from "../../model/types";

const DEFAULT_POST_ID = "6a04cae90445f0b3a1d3861a";
const DEFAULT_USER_ID = "507f1f77bcf86cd799439011";

export function makeComment(
  overrides: Partial<Comment> & { id: string; content: string }
): Comment {
  const parentId = overrides.parentId ?? null;

  return {
    id: overrides.id,
    content: overrides.content,
    userId: overrides.userId ?? DEFAULT_USER_ID,
    user: overrides.user ?? {
      id: DEFAULT_USER_ID,
      email: "author@example.com",
      firstName: "Иван",
      lastName: "Иванов",
      patronymic: null,
      avatarUrl: null,
      bio: null,
      dateOfBirth: null,
      createdAt: "2026-01-01T00:00:00.000Z",
    },
    postId: overrides.postId ?? DEFAULT_POST_ID,
    parentId,
    replyToUserId: overrides.replyToUserId ?? null,
    replyToDisplayName: overrides.replyToDisplayName ?? null,
    attachments: overrides.attachments ?? [],
    createdAt: overrides.createdAt ?? "2026-01-01T00:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2026-01-01T00:00:00.000Z",
    likeCount: overrides.likeCount ?? 0,
    replyCount: overrides.replyCount ?? 0,
    likedByUser: overrides.likedByUser ?? false,
    isReply: overrides.isReply ?? parentId !== null,
    isOwner: overrides.isOwner ?? false,
    isEdited: overrides.isEdited ?? false,
  };
}

export { DEFAULT_POST_ID };
