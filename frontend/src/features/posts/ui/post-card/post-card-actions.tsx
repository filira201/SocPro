import { Heart, MessageCircle } from "lucide-react";

import type { Post } from "../../model/types";

import { Toggle } from "@/shared/ui/kit/toggle";

type PostCardActionsProps = {
  post: Post;
  commentsExpanded: boolean;
  onToggleLike: () => void;
  onToggleComments: () => void;
};

export function PostCardActions({
  post,
  commentsExpanded,
  onToggleLike,
  onToggleComments,
}: PostCardActionsProps) {
  return (
    <footer className="flex items-center gap-2 border-t pt-2">
      <Toggle
        type="button"
        pressed={post.likedByUser}
        variant="outline"
        size="sm"
        onPressedChange={onToggleLike}
        aria-label={post.likedByUser ? "Убрать лайк" : "Поставить лайк"}
      >
        <Heart className={post.likedByUser ? "fill-current" : ""} />
        {post.likeCount}
      </Toggle>
      <Toggle
        type="button"
        pressed={commentsExpanded}
        variant="outline"
        size="sm"
        onPressedChange={onToggleComments}
        aria-expanded={commentsExpanded}
        aria-label={
          commentsExpanded ? "Скрыть комментарии" : "Показать комментарии"
        }
      >
        <MessageCircle />
        {post.commentCount}
      </Toggle>
    </footer>
  );
}
