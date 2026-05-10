import { Check, X } from "lucide-react";
import { useState } from "react";
import { href, useNavigate } from "react-router";

import {
  useDeletePostMutation,
  useLikePostMutation,
  useUnlikePostMutation,
  useUpdatePostMutation,
} from "../api/posts.api";
import type { Post } from "../model/types";

import { AttachmentList } from "./attachment-list";
import { PostCardActions } from "./post-card/post-card-actions";
import { PostCardEditor } from "./post-card/post-card-editor";
import { PostCardHeader } from "./post-card/post-card-header";

import { CommentList } from "@/features/comments";
import { getApiErrorMessage } from "@/shared/lib/api-error";
import { useSelectedFilesPreview } from "@/shared/lib/use-selected-files-preview";
import { ROUTES } from "@/shared/model/routes";
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
  const [removedAttachmentIds, setRemovedAttachmentIds] = useState<string[]>(
    []
  );
  const { addFiles, clearFiles, newFiles, removeFile, revokeAll } =
    useSelectedFilesPreview();
  const [likePost] = useLikePostMutation();
  const [unlikePost] = useUnlikePostMutation();
  const [deletePost, { isLoading: isDeleting }] = useDeletePostMutation();
  const [updatePost, { isLoading: isUpdating }] = useUpdatePostMutation();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editSaveError, setEditSaveError] = useState<string | null>(null);

  const openPost = () => {
    navigate(href(ROUTES.POST_DETAILS, { postId: post.id }));
  };

  const handleLike = () => {
    if (post.likedByUser) {
      void unlikePost(post.id);

      return;
    }

    void likePost(post.id);
  };

  const handleSave = async () => {
    setEditSaveError(null);

    const body = new FormData();
    body.append("content", content);
    removedAttachmentIds.forEach((attachmentId) =>
      body.append("removeAttachmentIds", attachmentId)
    );
    newFiles.forEach(({ file }) => body.append("files", file));

    try {
      await updatePost({ id: post.id, body }).unwrap();
      revokeAll(newFiles);
      setRemovedAttachmentIds([]);
      clearFiles();
      setIsEditing(false);
    } catch (err) {
      setEditSaveError(
        getApiErrorMessage(
          err as Parameters<typeof getApiErrorMessage>[0],
          "Не удалось сохранить пост"
        )
      );
    }
  };

  const visibleAttachments = post.attachments.filter(
    (attachment) => !removedAttachmentIds.includes(attachment.id)
  );

  const handleConfirmDeletePost = async () => {
    try {
      await deletePost(post.id).unwrap();
      setDeleteDialogOpen(false);
    } catch {
      /* диалог остаётся открытым */
    }
  };

  return (
    <article className="grid gap-4 rounded-xl border bg-card p-3 shadow-sm sm:p-4">
      <PostCardHeader
        post={post}
        showOpenPostButton={showOpenPostButton}
        onOpenPost={openPost}
        onToggleEdit={() => {
          setEditSaveError(null);
          setIsEditing((value) => !value);
        }}
        onRequestDelete={() => setDeleteDialogOpen(true)}
        isDeleting={isDeleting}
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
              Пост будет удалён без возможности восстановления вместе с
              комментариями и вложениями.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              size="lg"
              type="button"
              variant="default"
              className="w-full text-base"
              disabled={isDeleting}
              onClick={() => void handleConfirmDeletePost()}
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
              <X data-icon="inline-start" className="size-4" aria-hidden />
              Нет
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isEditing ? (
        <PostCardEditor
          content={content}
          onContentChange={setContent}
          attachments={visibleAttachments}
          newFiles={newFiles}
          onRemoveAttachment={(attachmentId) =>
            setRemovedAttachmentIds((current) => [...current, attachmentId])
          }
          onRemoveNewFile={removeFile}
          onFilesChange={addFiles}
          onCancel={() => {
            revokeAll(newFiles);
            setContent(post.content);
            setRemovedAttachmentIds([]);
            setEditSaveError(null);
            clearFiles();
            setIsEditing(false);
          }}
          onSave={() => void handleSave()}
          isUpdating={isUpdating}
          saveError={editSaveError}
        />
      ) : post.content ? (
        <p className="whitespace-pre-wrap text-base">{post.content}</p>
      ) : null}

      {isEditing ? null : <AttachmentList attachments={post.attachments} />}

      <PostCardActions
        post={post}
        commentsExpanded={showComments}
        onToggleLike={handleLike}
        onToggleComments={() => setShowComments((value) => !value)}
      />

      {showComments ? <CommentList postId={post.id} /> : null}
    </article>
  );
}
