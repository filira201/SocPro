import { ExternalLink, Pencil, Trash2 } from "lucide-react";
import { Link } from "react-router";

import { formatPostDate, toAbsoluteUploadUrl } from "../../lib/format";
import type { Post } from "../../model/types";

import { displayPublicName, userInitials } from "@/features/auth";
import { ROUTES } from "@/shared/model/routes";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/kit/avatar";
import { Button } from "@/shared/ui/kit/button";

type PostCardHeaderProps = {
  post: Post;
  showOpenPostButton: boolean;
  onOpenPost: () => void;
  onToggleEdit: () => void;
  onDeletePost: () => void;
  isDeleting: boolean;
};

export function PostCardHeader({
  post,
  showOpenPostButton,
  onOpenPost,
  onToggleEdit,
  onDeletePost,
  isDeleting,
}: PostCardHeaderProps) {
  const displayDate = post.isEdited ? post.updatedAt : post.createdAt;
  const authorName = displayPublicName(post.author);
  const authorFallback = userInitials(post.author);
  const profilePath = ROUTES.USER_DETAILS.replace(":userId", post.authorId);

  return (
    <header className="flex items-start gap-3">
      <Link
        to={profilePath}
        className="shrink-0 rounded-full outline-none ring-offset-background transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={`Профиль ${authorName}`}
      >
        <Avatar size="lg">
          <AvatarImage
            src={
              post.author.avatarUrl
                ? toAbsoluteUploadUrl(post.author.avatarUrl)
                : ""
            }
            alt={authorName}
          />
          <AvatarFallback>{authorFallback}</AvatarFallback>
        </Avatar>
      </Link>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-medium">{authorName}</span>
          <span className="text-sm text-muted-foreground">
            {post.isEdited ? "Изменено " : ""}
            {formatPostDate(displayDate)}
          </span>
        </div>
      </div>

      <div className="flex shrink-0 gap-1">
        {showOpenPostButton ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onOpenPost}
            aria-label="Открыть пост"
          >
            <ExternalLink />
          </Button>
        ) : null}
        {post.isOwner ? (
          <>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={onToggleEdit}
              aria-label="Редактировать пост"
            >
              <Pencil />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled={isDeleting}
              onClick={onDeletePost}
              aria-label="Удалить пост"
            >
              <Trash2 />
            </Button>
          </>
        ) : null}
      </div>
    </header>
  );
}
