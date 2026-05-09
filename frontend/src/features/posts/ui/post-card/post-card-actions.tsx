import { Heart, MessageCircle } from "lucide-react";

import type { Post } from "../../model/types";

import { Button } from "@/shared/ui/kit/button";
import { Toggle } from "@/shared/ui/kit/toggle";

type PostCardActionsProps = {
  post: Post;
  onToggleLike: () => void;
  onToggleComments: () => void;
};

export function PostCardActions({
  post,
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
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onToggleComments}
      >
        <MessageCircle />
        {post.commentCount}
      </Button>
    </footer>
  );
}
