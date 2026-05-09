import { Heart, MessageCircle, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/shared/ui/kit/button";
import { Toggle } from "@/shared/ui/kit/toggle";

type CommentThreadActionsProps = {
  likedByUserDisplay: boolean;
  likeCountDisplay: number;
  replyCount: number;
  isOwner: boolean;
  isDeleting: boolean;
  onToggleLike: () => void;
  onToggleReply: () => void;
  onToggleShowReplies: () => void;
  onStartEdit: () => void;
  onDelete: () => void;
};

export function CommentThreadActions({
  likedByUserDisplay,
  likeCountDisplay,
  replyCount,
  isOwner,
  isDeleting,
  onToggleLike,
  onToggleReply,
  onToggleShowReplies,
  onStartEdit,
  onDelete,
}: CommentThreadActionsProps) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <Toggle
        type="button"
        pressed={likedByUserDisplay}
        variant="outline"
        size="sm"
        onPressedChange={onToggleLike}
        aria-label={
          likedByUserDisplay
            ? "Убрать лайк у комментария"
            : "Поставить лайк комментария"
        }
      >
        <Heart className={likedByUserDisplay ? "fill-current" : ""} />
        {likeCountDisplay}
      </Toggle>
      <Button type="button" variant="ghost" size="sm" onClick={onToggleReply}>
        <MessageCircle />
        Ответить
      </Button>
      {replyCount > 0 ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onToggleShowReplies}
        >
          {replyCount} ответов
        </Button>
      ) : null}
      {isOwner ? (
        <>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onStartEdit}
            aria-label="Редактировать комментарий"
          >
            <Pencil />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={isDeleting}
            onClick={onDelete}
            aria-label="Удалить комментарий"
          >
            <Trash2 />
          </Button>
        </>
      ) : null}
    </div>
  );
}
