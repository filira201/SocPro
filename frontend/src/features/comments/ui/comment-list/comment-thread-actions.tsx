import {
  ChevronDown,
  ChevronUp,
  Heart,
  MessageCircle,
  Pencil,
  Trash2,
} from "lucide-react";

import { Button } from "@/shared/ui/kit/button";
import { Toggle } from "@/shared/ui/kit/toggle";

type CommentThreadActionsProps = {
  likedByUserDisplay: boolean;
  likeCountDisplay: number;
  replyCount: number;
  repliesExpanded: boolean;
  replyComposerOpen: boolean;
  isOwner: boolean;
  isDeleting: boolean;
  onToggleLike: () => void;
  onToggleReply: () => void;
  onToggleShowReplies: () => void;
  onStartEdit: () => void;
  onRequestDelete: () => void;
};

export function CommentThreadActions({
  likedByUserDisplay,
  likeCountDisplay,
  replyCount,
  repliesExpanded,
  replyComposerOpen,
  isOwner,
  isDeleting,
  onToggleLike,
  onToggleReply,
  onToggleShowReplies,
  onStartEdit,
  onRequestDelete,
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
      <Toggle
        type="button"
        pressed={replyComposerOpen}
        variant="outline"
        size="sm"
        onPressedChange={() => {
          onToggleReply();
        }}
        aria-expanded={replyComposerOpen}
        aria-label={
          replyComposerOpen ? "Закрыть форму ответа" : "Открыть форму ответа"
        }
      >
        <MessageCircle />
        Ответить
      </Toggle>
      {replyCount > 0 ? (
        <Toggle
          type="button"
          pressed={repliesExpanded}
          variant="outline"
          size="sm"
          onPressedChange={() => {
            onToggleShowReplies();
          }}
          aria-expanded={repliesExpanded}
          aria-label={repliesExpanded ? "Скрыть ответы" : "Показать ответы"}
        >
          {repliesExpanded ? (
            <ChevronUp className="size-3.5" />
          ) : (
            <ChevronDown className="size-3.5" />
          )}
          {repliesExpanded ? "Скрыть ответы" : `${replyCount} ответов`}
        </Toggle>
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
            onClick={onRequestDelete}
            aria-label="Удалить комментарий"
          >
            <Trash2 />
          </Button>
        </>
      ) : null}
    </div>
  );
}
