import type { User } from "@/features/auth";

export type AttachmentKind = "image" | "document";

export type Attachment = {
  id: string;
  url: string;
  filename: string;
  originalName: string | null;
  mimeType: string;
  size: number;
  kind: AttachmentKind;
  createdAt: string;
};

export type Post = {
  id: string;
  content: string;
  authorId: string;
  author: User;
  attachments: Attachment[];
  createdAt: string;
  updatedAt: string;
  likeCount: number;
  commentCount: number;
  likedByUser: boolean;
  isOwner: boolean;
  isEdited: boolean;
};

export type PaginatedResponse<T> = {
  items: T[];
  nextCursor: string | null;
};

export const POSTS_SORT_VALUES = ["new", "old"] as const;
export type PostsSort = (typeof POSTS_SORT_VALUES)[number];

export type PostsQuery = {
  cursor?: string | null;
  limit?: number;
  /** Поиск по тексту поста и по частям ФИО автора (слова через пробел — каждое должно «найтись»). */
  q?: string;
  /** Только посты текущего пользователя. */
  mine?: boolean;
  sort?: PostsSort;
};
