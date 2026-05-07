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
  attachments: Attachment[];
  createdAt: string;
  updatedAt: string;
  isOwner: boolean;
  isEdited: boolean;
};

export type PaginatedResponse<T> = {
  items: T[];
  nextCursor: string | null;
};

export type CommentsQuery = {
  postId: string;
  cursor?: string | null;
  limit?: number;
};
