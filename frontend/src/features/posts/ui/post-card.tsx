import {
  ExternalLink,
  FileText,
  Heart,
  MessageCircle,
  Paperclip,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
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

type SelectedFile = {
  file: File;
  previewUrl: string | null;
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
  const [removedAttachmentIds, setRemovedAttachmentIds] = useState<string[]>(
    []
  );
  const [newFiles, setNewFiles] = useState<SelectedFile[]>([]);
  const newFilesRef = useRef<SelectedFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
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
    removedAttachmentIds.forEach((attachmentId) =>
      body.append("removeAttachmentIds", attachmentId)
    );
    newFiles.forEach(({ file }) => body.append("files", file));
    await updatePost({ id: post.id, body }).unwrap();
    newFiles.forEach((item) => {
      if (item.previewUrl) {
        URL.revokeObjectURL(item.previewUrl);
      }
    });
    setRemovedAttachmentIds([]);
    setNewFiles([]);
    setIsEditing(false);
  };

  useEffect(() => {
    newFilesRef.current = newFiles;
  }, [newFiles]);

  useEffect(() => {
    return () => {
      newFilesRef.current.forEach((item) => {
        if (item.previewUrl) {
          URL.revokeObjectURL(item.previewUrl);
        }
      });
    };
  }, []);

  const removeNewFile = (index: number) => {
    setNewFiles((current) => {
      const target = current[index];

      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }

      return current.filter((_, itemIndex) => itemIndex !== index);
    });
  };

  const visibleAttachments = post.attachments.filter(
    (attachment) => !removedAttachmentIds.includes(attachment.id)
  );

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
          {visibleAttachments.length ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {visibleAttachments.map((attachment) => {
                const url = toAbsoluteUploadUrl(attachment.url);

                if (attachment.kind === "image") {
                  return (
                    <div
                      key={attachment.id}
                      className="relative overflow-hidden rounded-lg border"
                    >
                      <img
                        src={url}
                        alt={attachment.originalName || attachment.filename}
                        className="aspect-video w-full object-cover"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        className="absolute right-1 top-1 bg-background/80"
                        onClick={() =>
                          setRemovedAttachmentIds((current) => [
                            ...current,
                            attachment.id,
                          ])
                        }
                      >
                        <X />
                      </Button>
                    </div>
                  );
                }

                return (
                  <div
                    key={attachment.id}
                    className="relative rounded-lg border p-2"
                  >
                    <div className="flex items-center gap-2 text-sm">
                      <FileText className="size-4 shrink-0" />
                      <span className="min-w-0 truncate">
                        {attachment.originalName || attachment.filename}
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      className="absolute right-1 top-1 bg-background/80"
                      onClick={() =>
                        setRemovedAttachmentIds((current) => [
                          ...current,
                          attachment.id,
                        ])
                      }
                    >
                      <X />
                    </Button>
                  </div>
                );
              })}
            </div>
          ) : null}
          {newFiles.length ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {newFiles.map((item, index) => (
                <div
                  key={`${item.file.name}-${index}`}
                  className="relative rounded-lg border p-2"
                >
                  {item.previewUrl ? (
                    <img
                      src={item.previewUrl}
                      alt={item.file.name}
                      className="aspect-video w-full rounded-md object-cover"
                    />
                  ) : (
                    <div className="flex items-center gap-2 text-sm">
                      <FileText className="size-4 shrink-0" />
                      <span className="min-w-0 truncate">{item.file.name}</span>
                    </div>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    className="absolute right-1 top-1 bg-background/80"
                    onClick={() => removeNewFile(index)}
                  >
                    <X />
                  </Button>
                </div>
              ))}
            </div>
          ) : null}
          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip />
              Файлы
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(event) => {
                const selected = Array.from(event.target.files || []).map(
                  (file) => ({
                    file,
                    previewUrl: file.type.startsWith("image/")
                      ? URL.createObjectURL(file)
                      : null,
                  })
                );
                setNewFiles((current) => [...current, ...selected]);
                event.target.value = "";
              }}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                newFiles.forEach((item) => {
                  if (item.previewUrl) {
                    URL.revokeObjectURL(item.previewUrl);
                  }
                });
                setContent(post.content);
                setRemovedAttachmentIds([]);
                setNewFiles([]);
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

      {isEditing ? null : <AttachmentList attachments={post.attachments} />}

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
