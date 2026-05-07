import {
  ExternalLink,
  Heart,
  MessageCircle,
  Pencil,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";

import {
  useDeletePostMutation,
  useLikePostMutation,
  useUnlikePostMutation,
  useUpdatePostMutation,
} from "../api/posts.api";
import { formatPostDate, toAbsoluteUploadUrl } from "../lib/format";
import type { Post } from "../model/types";

import { AttachmentList } from "./attachment-list";

import { CommentList } from "@/features/comments";
import { ROUTES } from "@/shared/model/routes";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/kit/avatar";
import { Button } from "@/shared/ui/kit/button";
import { Textarea } from "@/shared/ui/kit/textarea";
import { Toggle } from "@/shared/ui/kit/toggle";

type PostCardProps = {
  post: Post;
  showCommentsInitially?: boolean;
  showOpenPostButton?: boolean;
};

export function PostCard({
  post,
  showCommentsInitially = true,
  showOpenPostButton = true,
}: PostCardProps) {
  const navigate = useNavigate();
  const [showComments, setShowComments] = useState(showCommentsInitially);
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(post.content);
  const [likePost] = useLikePostMutation();
  const [unlikePost] = useUnlikePostMutation();
  const [deletePost, { isLoading: isDeleting }] = useDeletePostMutation();
  const [updatePost, { isLoading: isUpdating }] = useUpdatePostMutation();
  const displayDate = post.isEdited ? post.updatedAt : post.createdAt;
  const authorFallback = post.author.username.slice(0, 2).toUpperCase();

  const openPost = () => {
    navigate(ROUTES.POST_DETAILS.replace(":postId", post.id));
  };

  const stop = (event: React.SyntheticEvent) => event.stopPropagation();

  const handleLike = () => {
    if (post.likedByUser) {
      void unlikePost(post.id);

      return;
    }

    void likePost(post.id);
  };

  const handleSave = async () => {
    const body = new FormData();
    body.append("content", content);
    await updatePost({ id: post.id, body }).unwrap();
    setIsEditing(false);
  };

  return (
    <article className="grid gap-4 rounded-xl border bg-card p-3 shadow-sm sm:p-4">
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
              onClick={openPost}
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
                onClick={() => setIsEditing((value) => !value)}
                aria-label="Редактировать пост"
              >
                <Pencil />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={isDeleting}
                onClick={() => void deletePost(post.id)}
                aria-label="Удалить пост"
              >
                <Trash2 />
              </Button>
            </>
          ) : null}
        </div>
      </header>

      {isEditing ? (
        <div className="grid gap-2" onClick={stop} onKeyDown={stop}>
          <Textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            className="min-h-28 resize-y text-base"
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setContent(post.content);
                setIsEditing(false);
              }}
            >
              Отмена
            </Button>
            <Button
              type="button"
              onClick={() => void handleSave()}
              disabled={isUpdating}
            >
              Сохранить
            </Button>
          </div>
        </div>
      ) : post.content ? (
        <p className="whitespace-pre-wrap text-base">{post.content}</p>
      ) : null}

      <AttachmentList attachments={post.attachments} />

      <footer className="flex items-center gap-2 border-t pt-2">
        <Toggle
          type="button"
          pressed={post.likedByUser}
          variant="outline"
          size="sm"
          onPressedChange={() => handleLike()}
          aria-label={post.likedByUser ? "Убрать лайк" : "Поставить лайк"}
        >
          <Heart className={post.likedByUser ? "fill-current" : ""} />
          {post.likeCount}
        </Toggle>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setShowComments((value) => !value)}
        >
          <MessageCircle />
          {post.commentCount}
        </Button>
      </footer>

      {showComments ? <CommentList postId={post.id} /> : null}
    </article>
  );
}
