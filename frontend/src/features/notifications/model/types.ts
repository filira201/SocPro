import type { User } from "@/features/auth";

export const NOTIFICATION_TYPES = [
  "POST_LIKED",
  "COMMENT_LIKED",
  "POST_COMMENTED",
  "COMMENT_REPLIED",
  "USER_FOLLOWED",
  "PROJECT_APPLICATION_SUBMITTED_SELF",
  "PROJECT_APPLICATION_WITHDRAWN_SELF",
  "PROJECT_INVITE_DECLINED_SELF",
  "PROJECT_APPLICATION_ACCEPTED",
  "PROJECT_APPLICATION_REJECTED",
  "PROJECT_INVITE_RECEIVED",
  "PROJECT_MEMBER_PROMOTED_ADMIN",
  "PROJECT_MEMBER_DEMOTED_FROM_ADMIN",
  "PROJECT_MEMBER_REMOVED",
  "PROJECT_DELETED",
  "STAFF_NEW_APPLICATION",
  "STAFF_APPLICATION_WITHDRAWN",
  "STAFF_INVITE_SENT",
  "STAFF_INVITE_ACCEPTED",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export type Notification = {
  id: string;
  type: NotificationType;
  receiverId: string;
  actorId: string | null;
  subjectUserId: string | null;
  postId: string | null;
  commentId: string | null;
  projectId: string | null;
  applicationId: string | null;
  projectTitleSnapshot: string | null;
  readAt: string | null;
  deleteAt: string | null;
  createdAt: string;
  isRead: boolean;
  actor?: User | null;
  subjectUser?: User | null;
};

export type PaginatedNotifications = {
  items: Notification[];
  nextCursor: string | null;
};

export type NotificationsQuery = {
  cursor?: string | null;
  limit?: number;
};
