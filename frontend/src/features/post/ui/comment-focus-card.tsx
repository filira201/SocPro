import { href, Link } from "react-router";

import { displayPublicName, userInitials } from "@/features/auth";
import { stripMentionPrefix } from "@/features/comments/lib/comment-list-helpers";
import type { Comment } from "@/features/comments/model/types";
import { CommentThreadBody } from "@/features/comments/ui/comment-list/comment-thread-body";
import {
  formatPostDate,
  toAbsoluteUploadUrl,
} from "@/features/posts/lib/format";
import { cn } from "@/shared/lib/css";
import { ROUTES } from "@/shared/model/routes";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/kit/avatar";

type CommentFocusCardProps = {
  comment: Comment;
  variant?: "target" | "ancestor";
};

export function CommentFocusCard({
  comment,
  variant = "target",
}: CommentFocusCardProps) {
  const displayDate = comment.isEdited ? comment.updatedAt : comment.createdAt;
  const authorPublicName = displayPublicName(comment.user);
  const authorAvatarInitials = userInitials(comment.user);
  const mentionContent = stripMentionPrefix(
    comment.content,
    comment.replyToDisplayName
  );

  return (
    <article
      className={cn(
        "rounded-lg border p-3",
        variant === "target" &&
          "scroll-mt-24 border-primary/30 bg-card shadow-sm",
        variant === "ancestor" && "bg-muted/30"
      )}
    >
      <div className="mb-2 flex items-start gap-3">
        <Link
          to={href(ROUTES.USER_DETAILS, { userId: comment.userId })}
          className="shrink-0 rounded-full outline-none ring-offset-background transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`Профиль ${authorPublicName}`}
        >
          <Avatar size={variant === "ancestor" ? "sm" : "default"}>
            <AvatarImage
              src={
                comment.user.avatarUrl
                  ? toAbsoluteUploadUrl(comment.user.avatarUrl)
                  : ""
              }
              alt={authorPublicName}
            />
            <AvatarFallback>{authorAvatarInitials}</AvatarFallback>
          </Avatar>
        </Link>

        <CommentCardMeta
          authorPublicName={authorPublicName}
          displayDate={displayDate}
          comment={comment}
          variant={variant}
        />
      </div>

      <CommentThreadBody
        mentionContent={mentionContent}
        replyToUserId={comment.replyToUserId}
        replyToDisplayName={comment.replyToDisplayName}
        attachments={comment.attachments}
      />
    </article>
  );
}

function CommentCardMeta({
  authorPublicName,
  displayDate,
  comment,
  variant,
}: {
  authorPublicName: string;
  displayDate: string;
  comment: Comment;
  variant: "target" | "ancestor";
}) {
  return (
    <div className="min-w-0 flex-1">
      <div
        className={cn(
          "flex flex-wrap items-center gap-x-2 gap-y-1",
          variant === "ancestor" ? "text-xs" : "text-sm"
        )}
      >
        <span className="font-medium">{authorPublicName}</span>
        <span className="text-muted-foreground">
          {comment.isEdited ? "Изменено " : ""}
          {formatPostDate(displayDate)}
        </span>
      </div>
    </div>
  );
}
