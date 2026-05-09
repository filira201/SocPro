import { useState } from "react";
import { useNavigate } from "react-router";

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
import { useEditPostFiles } from "./post-card/use-edit-post-files";

import { CommentList } from "@/features/comments";
import { ROUTES } from "@/shared/model/routes";

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
    useEditPostFiles();
  const [likePost] = useLikePostMutation();
  const [unlikePost] = useUnlikePostMutation();
  const [deletePost, { isLoading: isDeleting }] = useDeletePostMutation();
  const [updatePost, { isLoading: isUpdating }] = useUpdatePostMutation();

  const openPost = () => {
    navigate(ROUTES.POST_DETAILS.replace(":postId", post.id));
  };

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
    revokeAll(newFiles);
    setRemovedAttachmentIds([]);
    clearFiles();
    setIsEditing(false);
  };

  const visibleAttachments = post.attachments.filter(
    (attachment) => !removedAttachmentIds.includes(attachment.id)
  );

  return (
    <article className="grid gap-4 rounded-xl border bg-card p-3 shadow-sm sm:p-4">
      <PostCardHeader
        post={post}
        showOpenPostButton={showOpenPostButton}
        onOpenPost={openPost}
        onToggleEdit={() => setIsEditing((value) => !value)}
        onDeletePost={() => void deletePost(post.id)}
        isDeleting={isDeleting}
      />

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
            clearFiles();
            setIsEditing(false);
          }}
          onSave={() => void handleSave()}
          isUpdating={isUpdating}
        />
      ) : post.content ? (
        <p className="whitespace-pre-wrap text-base">{post.content}</p>
      ) : null}

      {isEditing ? null : <AttachmentList attachments={post.attachments} />}

      <PostCardActions
        post={post}
        onToggleLike={handleLike}
        onToggleComments={() => setShowComments((value) => !value)}
      />

      {showComments ? <CommentList postId={post.id} /> : null}
    </article>
  );
}
