import { Check, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";

import {
  useDeleteCommentMutation,
  useGetCommentsQuery,
  useLikeCommentMutation,
  useLazyGetCommentsQuery,
  useUnlikeCommentMutation,
  useUpdateCommentMutation,
} from "../../api/comments.api";
import {
  dedupeComments,
  insertBySort,
  stripMentionPrefix,
} from "../../lib/comment-list-helpers";
import type {
  Attachment,
  Comment,
  CommentsQuery,
  CommentsSort,
} from "../../model/types";
import { CommentComposer } from "../comment-composer";

import { CommentThreadActions } from "./comment-thread-actions";
import { CommentThreadBody } from "./comment-thread-body";
import { CommentThreadEditor } from "./comment-thread-editor";
import { PAGE_LIMIT, ROOT_INITIAL_LIMIT } from "./constants";
import { LoadMoreTrigger } from "./load-more-trigger";

import { displayPublicName, userInitials } from "@/features/auth";
import {
  formatPostDate,
  toAbsoluteUploadUrl,
} from "@/features/posts/lib/format";
import { getApiErrorMessage } from "@/shared/lib/api-error";
import { useSelectedFilesPreview } from "@/shared/lib/use-selected-files-preview";
import { ROUTES } from "@/shared/model/routes";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/kit/avatar";
import { Button } from "@/shared/ui/kit/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/kit/dialog";
import { Spinner } from "@/shared/ui/kit/spinner";

type ThreadItemProps = {
  postId: string;
  comment: Comment;
  sort: CommentsSort;
  onRemoved?: (comment: Comment) => void;
};

export function CommentThreadItem({
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
  const { addFiles, clearFiles, newFiles, removeFile, revokeAll } =
    useSelectedFilesPreview();
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
  const repliesQuery: CommentsQuery = {
    postId,
    parentId: comment.id,
    sort,
    limit: PAGE_LIMIT,
  };
  const { data: firstReplies, isFetching: isRepliesFetching } =
    useGetCommentsQuery(repliesQuery, {
      skip: !showReplies,
    });
  const [loadReplies, { isFetching: isLoadingMoreReplies }] =
    useLazyGetCommentsQuery();
  const [deleteComment, { isLoading: isDeleting }] = useDeleteCommentMutation();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editSaveError, setEditSaveError] = useState<string | null>(null);
  const [updateComment, { isLoading: isUpdating }] = useUpdateCommentMutation();
  const [likeComment] = useLikeCommentMutation();
  const [unlikeComment] = useUnlikeCommentMutation();
  const mergedReplies = dedupeComments([
    ...(firstReplies?.items ?? []),
    ...extraReplies,
  ]);
  const composerRef = useRef<HTMLDivElement | null>(null);
  const replyCursorToLoad =
    nextReplyCursor === undefined ? firstReplies?.nextCursor : nextReplyCursor;
  const displayDate = comment.isEdited ? comment.updatedAt : comment.createdAt;
  const authorPublicName = displayPublicName(comment.user);
  const authorAvatarInitials = userInitials(comment.user);
  const mentionContent = stripMentionPrefix(
    comment.content,
    comment.replyToDisplayName
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

  const handleConfirmDelete = async () => {
    try {
      await handleDelete(comment.id);
      setDeleteDialogOpen(false);
    } catch {
      /* диалог остаётся открытым */
    }
  };

  const handleUpdate = async (commentId: string) => {
    setEditSaveError(null);

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

    try {
      const updated = await updateComment({ id: commentId, body }).unwrap();

      revokeAll(newFiles);
      setEditingId(null);
      setEditingContent("");
      setRemovedAttachmentIds([]);
      clearFiles();
      setExtraReplies((current) =>
        current.map((item) => (item.id === updated.id ? updated : item))
      );
    } catch (err) {
      setEditSaveError(
        getApiErrorMessage(
          err as Parameters<typeof getApiErrorMessage>[0],
          "Не удалось сохранить комментарий"
        )
      );
    }
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

  return (
    <div className="grid gap-3">
      <article className="rounded-lg border p-3">
        <div className="flex items-start gap-3">
          <Link
            to={ROUTES.USER_DETAILS.replace(":userId", comment.userId)}
            className="shrink-0 rounded-full outline-none ring-offset-background transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`Профиль ${authorPublicName}`}
          >
            <Avatar size="default">
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

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
              <span className="font-medium">{authorPublicName}</span>
              <span className="text-muted-foreground">
                {comment.isEdited ? "Изменено " : ""}
                {formatPostDate(displayDate)}
              </span>
            </div>
            {editingId === comment.id ? (
              <CommentThreadEditor
                content={editingContent}
                onContentChange={setEditingContent}
                visibleAttachments={visibleAttachments}
                newFiles={newFiles}
                onRemoveAttachment={(attachmentId) =>
                  setRemovedAttachmentIds((current) => [
                    ...current,
                    attachmentId,
                  ])
                }
                onRemoveNewFile={removeFile}
                onFilesChange={addFiles}
                onCancel={() => {
                  revokeAll(newFiles);
                  setEditingId(null);
                  setEditingContent("");
                  setRemovedAttachmentIds([]);
                  setEditSaveError(null);
                  clearFiles();
                }}
                onSave={() => void handleUpdate(comment.id)}
                isUpdating={isUpdating}
                saveError={editSaveError}
              />
            ) : (
              <CommentThreadBody
                mentionContent={mentionContent}
                replyToUserId={comment.replyToUserId}
                replyToDisplayName={comment.replyToDisplayName}
                attachments={comment.attachments}
              />
            )}
            <CommentThreadActions
              likedByUserDisplay={likedByUserDisplay}
              likeCountDisplay={likeCountDisplay}
              replyCount={comment.replyCount}
              repliesExpanded={showReplies}
              replyComposerOpen={isReplying}
              isOwner={comment.isOwner}
              isDeleting={isDeleting}
              onToggleLike={() => void handleLike()}
              onToggleReply={() => {
                setShowReplies(true);
                setIsReplying((wasOpen) => {
                  const openingReply = !wasOpen;

                  if (openingReply && editingId === comment.id) {
                    revokeAll(newFiles);
                    clearFiles();
                    setEditSaveError(null);
                    setEditingId(null);
                    setEditingContent("");
                    setRemovedAttachmentIds([]);
                  }

                  return !wasOpen;
                });
              }}
              onToggleShowReplies={() => setShowReplies((value) => !value)}
              onStartEdit={() => {
                revokeAll(newFiles);
                clearFiles();
                setEditSaveError(null);
                setIsReplying(false);
                setEditingId(comment.id);
                setEditingContent(comment.content);
                setRemovedAttachmentIds([]);
              }}
              onRequestDelete={() => setDeleteDialogOpen(true)}
            />

            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <DialogContent
                aria-busy={isDeleting}
                showCloseButton={!isDeleting}
                className="max-w-md"
              >
                <DialogHeader>
                  <DialogTitle className="text-lg">Вы уверены?</DialogTitle>
                  <DialogDescription className="text-base">
                    {comment.parentId ? (
                      <>
                        Ответ будет удалён без возможности восстановления. Если
                        к нему есть вложенные ответы, они также будут удалены.
                      </>
                    ) : (
                      <>
                        Комментарий будет удалён без возможности восстановления.
                        Если к нему есть ответы, они также будут удалены.
                      </>
                    )}
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className="flex-col gap-2 sm:flex-col">
                  <Button
                    size="lg"
                    type="button"
                    variant="default"
                    className="w-full text-base"
                    disabled={isDeleting}
                    onClick={() => void handleConfirmDelete()}
                  >
                    {isDeleting ? (
                      <>
                        <Spinner data-icon="inline-start" className="size-4" />
                        Удаление…
                      </>
                    ) : (
                      <>
                        <Check
                          data-icon="inline-start"
                          className="size-4"
                          aria-hidden
                        />
                        Да
                      </>
                    )}
                  </Button>
                  <Button
                    size="lg"
                    type="button"
                    variant="outline"
                    className="w-full text-base"
                    disabled={isDeleting}
                    onClick={() => setDeleteDialogOpen(false)}
                  >
                    <X
                      data-icon="inline-start"
                      className="size-4"
                      aria-hidden
                    />
                    Нет
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
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
                replyToDisplayName={authorPublicName}
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
            replyToDisplayName={authorPublicName}
            onCreated={handleReplyCreated}
            onCancelReply={() => setIsReplying(false)}
          />
        </div>
      ) : null}
    </div>
  );
}
