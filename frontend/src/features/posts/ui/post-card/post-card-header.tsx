import { ExternalLink, Pencil, Trash2 } from "lucide-react";

import { formatPostDate, toAbsoluteUploadUrl } from "../../lib/format";
import type { Post } from "../../model/types";

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
  const authorFallback = post.author.username.slice(0, 2).toUpperCase();

  return (
    <header className="flex items-start gap-3">
      <Avatar size="lg">
        <AvatarImage
          src={
            post.author.avatarUrl
              ? toAbsoluteUploadUrl(post.author.avatarUrl)
              : ""
          }
          alt={post.author.username}
        />
        <AvatarFallback>{authorFallback}</AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-medium">@{post.author.username}</span>
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
