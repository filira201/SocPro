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

export type Comment = {
  id: string;
  content: string;
  userId: string;
  user: User;
  postId: string;
  parentId: string | null;
  replyToUserId: string | null;
  replyToDisplayName: string | null;
  attachments: Attachment[];
  createdAt: string;
  updatedAt: string;
  likeCount: number;
  replyCount: number;
  likedByUser: boolean;
  isReply: boolean;
  isOwner: boolean;
  isEdited: boolean;
};

export type DeleteCommentResponse = Comment & {
  deletedCount?: number;
};

export type PaginatedResponse<T> = {
  items: T[];
  nextCursor: string | null;
};

export type CommentsQuery = {
  postId: string;
  parentId?: string | null;
  sort?: CommentsSort;
  cursor?: string | null;
  limit?: number;
};

export type CommentsSort = "new" | "old" | "top";
