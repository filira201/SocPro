import {
  FileText,
  Heart,
  MessageCircle,
  Paperclip,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";

import {
  useDeleteCommentMutation,
  useGetCommentsQuery,
  useLikeCommentMutation,
  useLazyGetCommentsQuery,
  useUnlikeCommentMutation,
  useUpdateCommentMutation,
} from "../api/comments.api";
import type {
  Attachment,
  Comment,
  CommentsQuery,
  CommentsSort,
} from "../model/types";

import { CommentComposer } from "./comment-composer";

import {
  formatPostDate,
  toAbsoluteUploadUrl,
} from "@/features/posts/lib/format";
import { AttachmentList } from "@/features/posts/ui/attachment-list";
import { ROUTES } from "@/shared/model/routes";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/kit/avatar";
import { Button } from "@/shared/ui/kit/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/kit/select";
import { Textarea } from "@/shared/ui/kit/textarea";
import { Toggle } from "@/shared/ui/kit/toggle";

type CommentListProps = {
  postId: string;
};

const ROOT_INITIAL_LIMIT = 3;
const PAGE_LIMIT = 10;

function dedupeComments(items: Comment[]) {
  const seen = new Set<string>();
  const result: Comment[] = [];

  for (const item of items) {
    if (seen.has(item.id)) {
      continue;
    }

    seen.add(item.id);
    result.push(item);
  }

  return result;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function stripMentionPrefix(content: string, username: string | null) {
  if (!username) {
    return content;
  }

  const escaped = escapeRegExp(username);
  const withComma = new RegExp(`^@${escaped},\\s*`);
  const withSpaceOnly = new RegExp(`^@${escaped}\\s+`);

  if (withComma.test(content)) {
    return content.replace(withComma, "");
  }

  if (withSpaceOnly.test(content)) {
    return content.replace(withSpaceOnly, "");
  }

  return content;
}

function compareByInteresting(a: Comment, b: Comment) {
  const aScore = a.likeCount + a.replyCount;
  const bScore = b.likeCount + b.replyCount;

  if (aScore !== bScore) {
    return bScore - aScore;
  }

  if (a.likeCount !== b.likeCount) {
    return b.likeCount - a.likeCount;
  }

  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

function insertBySort(items: Comment[], next: Comment, sort: CommentsSort) {
  const merged = dedupeComments([next, ...items]);

  if (sort === "new") {
    return [...merged].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  if (sort === "old") {
    return [...merged].sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }

  return [...merged].sort(compareByInteresting);
}

type LoadMoreProps = {
  text: string;
  isLoading: boolean;
  onActivate: () => void;
};

function LoadMoreTrigger({ text, isLoading, onActivate }: LoadMoreProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      className="inline-flex cursor-pointer items-center rounded-md border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      onClick={onActivate}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onActivate();
        }
      }}
      aria-disabled={isLoading}
    >
      <span>{isLoading ? "Загрузка..." : text}</span>
    </div>
  );
}

type ThreadItemProps = {
  postId: string;
  comment: Comment;
  sort: CommentsSort;
  onRemoved?: (comment: Comment) => void;
};

type SelectedFile = {
  file: File;
  previewUrl: string | null;
};

function CommentThreadItem({
  postId,
  comment,
  sort,
  onRemoved,
}: ThreadItemProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [removedAttachmentIds, setRemovedAttachmentIds] = useState<string[]>(
    []
  );
  const [newFiles, setNewFiles] = useState<SelectedFile[]>([]);
  const [likeVisual, setLikeVisual] = useState<{
    liked: boolean;
    count: number;
  } | null>(null);
  const [isReplying, setIsReplying] = useState(false);
  const [showReplies, setShowReplies] = useState(false);
  const [extraReplies, setExtraReplies] = useState<Comment[]>([]);
  const [nextReplyCursor, setNextReplyCursor] = useState<
    string | null | undefined
  >(undefined);
  const repliesQuery: CommentsQuery = useMemo(
    () => ({
      postId,
      parentId: comment.id,
      sort,
      limit: PAGE_LIMIT,
    }),
    [comment.id, postId, sort]
  );
  const { data: firstReplies, isFetching: isRepliesFetching } =
    useGetCommentsQuery(repliesQuery, {
      skip: !showReplies,
    });
  const [loadReplies, { isFetching: isLoadingMoreReplies }] =
    useLazyGetCommentsQuery();
  const [deleteComment, { isLoading: isDeleting }] = useDeleteCommentMutation();
  const [updateComment, { isLoading: isUpdating }] = useUpdateCommentMutation();
  const [likeComment] = useLikeCommentMutation();
  const [unlikeComment] = useUnlikeCommentMutation();
  const newFilesInputRef = useRef<HTMLInputElement | null>(null);
  const newFilesRef = useRef<SelectedFile[]>([]);
  const mergedReplies = dedupeComments([
    ...(firstReplies?.items ?? []),
    ...extraReplies,
  ]);
  const composerRef = useRef<HTMLDivElement | null>(null);
  const replyCursorToLoad =
    nextReplyCursor === undefined ? firstReplies?.nextCursor : nextReplyCursor;
  const displayDate = comment.isEdited ? comment.updatedAt : comment.createdAt;
  const mentionContent = stripMentionPrefix(
    comment.content,
    comment.replyToUsername
  );

  const redundantLikeOverlay =
    !!likeVisual &&
    likeVisual.liked === comment.likedByUser &&
    likeVisual.count === comment.likeCount;

  const likedByUserDisplay = redundantLikeOverlay
    ? comment.likedByUser
    : (likeVisual?.liked ?? comment.likedByUser);

  const likeCountDisplay = redundantLikeOverlay
    ? comment.likeCount
    : (likeVisual?.count ?? comment.likeCount);

  const handleDelete = async (commentId: string) => {
    const deleted = await deleteComment({ id: commentId, postId }).unwrap();
    onRemoved?.(deleted);
  };

  const handleUpdate = async (commentId: string) => {
    const body = new FormData();
    body.append("postId", postId);
    body.append("content", editingContent);

    if (comment.parentId) {
      body.append("parentId", comment.parentId);
    }

    removedAttachmentIds.forEach((attachmentId) =>
      body.append("removeAttachmentIds", attachmentId)
    );
    newFiles.forEach(({ file }) => body.append("files", file));
    const updated = await updateComment({ id: commentId, body }).unwrap();

    newFiles.forEach((item) => {
      if (item.previewUrl) {
        URL.revokeObjectURL(item.previewUrl);
      }
    });
    setEditingId(null);
    setEditingContent("");
    setRemovedAttachmentIds([]);
    setNewFiles([]);
    setExtraReplies((current) =>
      current.map((item) => (item.id === updated.id ? updated : item))
    );
  };

  const visibleAttachments: Attachment[] = comment.attachments.filter(
    (attachment) => !removedAttachmentIds.includes(attachment.id)
  );

  const handleLike = async () => {
    const query = {
      postId,
      parentId: comment.parentId ?? null,
      sort,
      limit: comment.parentId ? PAGE_LIMIT : ROOT_INITIAL_LIMIT,
    };

    const wasLiked = likedByUserDisplay;
    const prevCount = likeCountDisplay;

    setLikeVisual({
      liked: !wasLiked,
      count: wasLiked ? Math.max(0, prevCount - 1) : prevCount + 1,
    });

    try {
      const updated = wasLiked
        ? await unlikeComment({ id: comment.id, query }).unwrap()
        : await likeComment({ id: comment.id, query }).unwrap();

      setLikeVisual({
        liked: updated.likedByUser,
        count: updated.likeCount,
      });
    } catch {
      setLikeVisual(null);
    }
  };

  const loadMoreReplies = async () => {
    if (!replyCursorToLoad) {
      return;
    }

    const result = await loadReplies({
      ...repliesQuery,
      cursor: replyCursorToLoad,
      limit: PAGE_LIMIT,
    }).unwrap();

    setExtraReplies((current) => dedupeComments([...current, ...result.items]));
    setNextReplyCursor(result.nextCursor);
  };

  const handleReplyCreated = (created: Comment) => {
    setShowReplies(true);
    setExtraReplies((current) => insertBySort(current, created, sort));
  };

  useEffect(() => {
    if (!isReplying || !composerRef.current) {
      return;
    }

    composerRef.current.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }, [isReplying, mergedReplies.length]);

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

  return (
    <div className="grid gap-3">
      <article className="rounded-lg border p-3">
        <div className="flex items-start gap-3">
          <Avatar size="default">
            <AvatarImage
              src={
                comment.user.avatarUrl
                  ? toAbsoluteUploadUrl(comment.user.avatarUrl)
                  : ""
              }
              alt={comment.user.username}
            />
            <AvatarFallback>
              {comment.user.username.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
              <span className="font-medium">@{comment.user.username}</span>
              <span className="text-muted-foreground">
                {comment.isEdited ? "Изменено " : ""}
                {formatPostDate(displayDate)}
              </span>
            </div>
            {editingId === comment.id ? (
              <div className="mt-2 grid gap-2">
                <Textarea
                  value={editingContent}
                  onChange={(event) => setEditingContent(event.target.value)}
                  onClick={(event) => event.stopPropagation()}
                  onKeyDown={(event) => event.stopPropagation()}
                  className="min-h-20 resize-y text-sm"
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
                              alt={
                                attachment.originalName || attachment.filename
                              }
                              className="aspect-video w-full object-cover"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-xs"
                              className="absolute right-1 top-1 bg-background/80"
                              aria-label="Удалить вложение"
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
                            aria-label="Удалить вложение"
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
                            <span className="min-w-0 truncate">
                              {item.file.name}
                            </span>
                          </div>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          className="absolute right-1 top-1 bg-background/80"
                          aria-label="Убрать файл"
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
                    onClick={() => newFilesInputRef.current?.click()}
                  >
                    <Paperclip />
                    Файлы
                  </Button>
                  <input
                    ref={newFilesInputRef}
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
                    size="sm"
                    onClick={() => {
                      newFiles.forEach((item) => {
                        if (item.previewUrl) {
                          URL.revokeObjectURL(item.previewUrl);
                        }
                      });
                      setEditingId(null);
                      setEditingContent("");
                      setRemovedAttachmentIds([]);
                      setNewFiles([]);
                    }}
                  >
                    Отмена
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={isUpdating}
                    onClick={() => void handleUpdate(comment.id)}
                  >
                    Сохранить
                  </Button>
                </div>
              </div>
            ) : mentionContent ||
              (comment.replyToUserId && comment.replyToUsername) ? (
              <p className="mt-2 whitespace-pre-wrap text-sm">
                {comment.replyToUserId && comment.replyToUsername ? (
                  <>
                    <Link
                      to={ROUTES.USER_DETAILS.replace(
                        ":userId",
                        comment.replyToUserId
                      )}
                      className="font-medium text-sky-600 hover:underline dark:text-sky-400"
                    >
                      @{comment.replyToUsername}
                    </Link>
                    <span>, </span>
                  </>
                ) : null}
                {mentionContent}
              </p>
            ) : null}
            {editingId === comment.id ? null : (
              <div className="mt-2">
                <AttachmentList attachments={comment.attachments} />
              </div>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Toggle
                type="button"
                pressed={likedByUserDisplay}
                variant="outline"
                size="sm"
                onPressedChange={() => void handleLike()}
                aria-label={
                  likedByUserDisplay
                    ? "Убрать лайк у комментария"
                    : "Поставить лайк комментария"
                }
              >
                <Heart className={likedByUserDisplay ? "fill-current" : ""} />
                {likeCountDisplay}
              </Toggle>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowReplies(true);
                  setIsReplying((value) => !value);
                }}
              >
                <MessageCircle />
                Ответить
              </Button>
              {comment.replyCount > 0 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowReplies((value) => !value)}
                >
                  {comment.replyCount} ответов
                </Button>
              ) : null}
              {comment.isOwner ? (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => {
                      newFiles.forEach((item) => {
                        if (item.previewUrl) {
                          URL.revokeObjectURL(item.previewUrl);
                        }
                      });
                      setEditingId(comment.id);
                      setEditingContent(comment.content);
                      setRemovedAttachmentIds([]);
                      setNewFiles([]);
                    }}
                    aria-label="Редактировать комментарий"
                  >
                    <Pencil />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={isDeleting}
                    onClick={() => void handleDelete(comment.id)}
                    aria-label="Удалить комментарий"
                  >
                    <Trash2 />
                  </Button>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </article>

      {showReplies ? (
        <div className="ml-4 grid gap-3 border-l pl-3 sm:ml-8 sm:pl-4">
          {mergedReplies.map((reply) => (
            <CommentThreadItem
              key={reply.id}
              postId={postId}
              comment={reply}
              sort={sort}
              onRemoved={(deleted) => {
                setExtraReplies((current) =>
                  current.filter((item) => item.id !== deleted.id)
                );
              }}
            />
          ))}
          {replyCursorToLoad ? (
            <LoadMoreTrigger
              text="Показать следующие комментарии"
              isLoading={isRepliesFetching || isLoadingMoreReplies}
              onActivate={() => {
                if (!isRepliesFetching && !isLoadingMoreReplies) {
                  void loadMoreReplies();
                }
              }}
            />
          ) : null}
          {isReplying ? (
            <div ref={composerRef}>
              <CommentComposer
                postId={postId}
                parentId={comment.id}
                replyToUserId={comment.user.id}
                replyToUsername={comment.user.username}
                onCreated={handleReplyCreated}
                onCancelReply={() => setIsReplying(false)}
              />
            </div>
          ) : null}
        </div>
      ) : isReplying ? (
        <div ref={composerRef} className="ml-4 border-l pl-3 sm:ml-8 sm:pl-4">
          <CommentComposer
            postId={postId}
            parentId={comment.id}
            replyToUserId={comment.user.id}
            replyToUsername={comment.user.username}
            onCreated={handleReplyCreated}
            onCancelReply={() => setIsReplying(false)}
          />
        </div>
      ) : null}
    </div>
  );
}

export function CommentList({ postId }: CommentListProps) {
  const stopBubble = (event: React.SyntheticEvent) => {
    event.stopPropagation();
  };

  const [sort, setSort] = useState<CommentsSort>("top");
  const [extraComments, setExtraComments] = useState<Comment[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null | undefined>(
    undefined
  );
  const rootQuery: CommentsQuery = {
    postId,
    sort,
    parentId: null,
    limit: ROOT_INITIAL_LIMIT,
  };
  const { data: firstPage, isFetching: isFirstPageFetching } =
    useGetCommentsQuery(rootQuery);
  const [loadComments, { isFetching }] = useLazyGetCommentsQuery();

  const comments = dedupeComments([
    ...(firstPage?.items ?? []),
    ...extraComments,
  ]);
  const cursorToLoad =
    nextCursor === undefined ? firstPage?.nextCursor : nextCursor;

  const loadPage = async (cursor?: string | null) => {
    const result = await loadComments({
      postId,
      parentId: null,
      sort,
      cursor,
      limit: PAGE_LIMIT,
    }).unwrap();

    setExtraComments((current) =>
      dedupeComments([...current, ...result.items])
    );
    setNextCursor(result.nextCursor);
  };

  const handleRootCreated = (created: Comment) => {
    if (created.parentId) {
      return;
    }

    setExtraComments((current) => insertBySort(current, created, sort));
  };

  return (
    <div
      className="grid gap-4 border-t pt-4"
      onClick={stopBubble}
      onKeyDown={stopBubble}
    >
      <div className="flex items-center justify-between gap-2">
        <Select
          value={sort}
          onValueChange={(value) => {
            setSort(value as CommentsSort);
            setExtraComments([]);
            setNextCursor(undefined);
          }}
        >
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Сортировка комментариев" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="new">Сначала новые</SelectItem>
            <SelectItem value="old">Сначала старые</SelectItem>
            <SelectItem value="top">Сначала интересные</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-3">
        {comments.map((comment) => (
          <CommentThreadItem
            key={comment.id}
            postId={postId}
            comment={comment}
            sort={sort}
            onRemoved={(deleted) => {
              setExtraComments((current) =>
                current.filter((item) => item.id !== deleted.id)
              );
            }}
          />
        ))}
      </div>

      {cursorToLoad ? (
        <LoadMoreTrigger
          text="Показать следующие комментарии"
          isLoading={isFetching || isFirstPageFetching}
          onActivate={() => {
            if (!isFetching && !isFirstPageFetching) {
              void loadPage(cursorToLoad);
            }
          }}
        />
      ) : null}

      <CommentComposer postId={postId} onCreated={handleRootCreated} />
    </div>
  );
}
