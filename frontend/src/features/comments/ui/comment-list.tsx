import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";

import {
  useDeleteCommentMutation,
  useGetCommentsQuery,
  useLazyGetCommentsQuery,
  useUpdateCommentMutation,
} from "../api/comments.api";
import type { Comment } from "../model/types";

import { CommentComposer } from "./comment-composer";

import { AttachmentList } from "@/features/posts/compose/attachment-list";
import {
  formatPostDate,
  toAbsoluteUploadUrl,
} from "@/features/posts/lib/format";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/kit/avatar";
import { Button } from "@/shared/ui/kit/button";
import { Spinner } from "@/shared/ui/kit/spinner";
import { Textarea } from "@/shared/ui/kit/textarea";

type CommentListProps = {
  postId: string;
};

export function CommentList({ postId }: CommentListProps) {
  const stopBubble = (event: React.SyntheticEvent) => {
    event.stopPropagation();
  };

  const [extraComments, setExtraComments] = useState<Comment[]>([]);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [overrides, setOverrides] = useState<Record<string, Comment>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [nextCursor, setNextCursor] = useState<string | null | undefined>();
  const { data: firstPage, isFetching: isFirstPageFetching } =
    useGetCommentsQuery({
      postId,
      limit: 10,
    });
  const [loadComments, { isFetching }] = useLazyGetCommentsQuery();
  const [deleteComment, { isLoading: isDeleting }] = useDeleteCommentMutation();
  const [updateComment, { isLoading: isUpdating }] = useUpdateCommentMutation();
  const mergedRaw = [...(firstPage?.items ?? []), ...extraComments];
  const seenIds = new Set<string>();
  const deduped: Comment[] = [];

  for (const comment of mergedRaw) {
    if (seenIds.has(comment.id)) {
      continue;
    }

    seenIds.add(comment.id);
    deduped.push(comment);
  }

  const comments = deduped
    .map((comment) => overrides[comment.id] ?? comment)
    .filter((comment) => !deletedIds.includes(comment.id));
  const cursorToLoad =
    nextCursor === undefined ? firstPage?.nextCursor : nextCursor;

  const loadPage = async (cursor?: string | null) => {
    const result = await loadComments({ postId, cursor, limit: 10 }).unwrap();

    setExtraComments((current) => {
      const existingIds = new Set(current.map((comment) => comment.id));

      return [
        ...current,
        ...result.items.filter((comment) => !existingIds.has(comment.id)),
      ];
    });
    setNextCursor(result.nextCursor);
  };

  const handleCreated = (comment: Comment) => {
    setExtraComments((current) =>
      current.some((item) => item.id === comment.id)
        ? current
        : [...current, comment]
    );
  };

  const handleDelete = async (commentId: string) => {
    await deleteComment({ id: commentId, postId }).unwrap();
    setDeletedIds((current) => [...current, commentId]);
  };

  const handleUpdate = async (commentId: string) => {
    const body = new FormData();
    body.append("postId", postId);
    body.append("content", editingContent);
    const updated = await updateComment({ id: commentId, body }).unwrap();

    setOverrides((current) => ({ ...current, [updated.id]: updated }));
    setEditingId(null);
    setEditingContent("");
  };

  return (
    <div
      className="grid gap-4 border-t pt-4"
      onClick={stopBubble}
      onKeyDown={stopBubble}
    >
      <CommentComposer postId={postId} onCreated={handleCreated} />

      <div className="grid gap-3">
        {comments.map((comment) => {
          const displayDate = comment.isEdited
            ? comment.updatedAt
            : comment.createdAt;

          return (
            <article key={comment.id} className="rounded-lg border p-3">
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
                    <span className="font-medium">
                      @{comment.user.username}
                    </span>
                    <span className="text-muted-foreground">
                      {comment.isEdited ? "Изменено " : ""}
                      {formatPostDate(displayDate)}
                    </span>
                  </div>
                  {editingId === comment.id ? (
                    <div className="mt-2 grid gap-2">
                      <Textarea
                        value={editingContent}
                        onChange={(event) =>
                          setEditingContent(event.target.value)
                        }
                        onClick={(event) => event.stopPropagation()}
                        onKeyDown={(event) => event.stopPropagation()}
                        className="min-h-20 resize-y text-sm"
                      />
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingId(null);
                            setEditingContent("");
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
                  ) : comment.content ? (
                    <p className="mt-2 whitespace-pre-wrap text-sm">
                      {comment.content}
                    </p>
                  ) : null}
                  <div className="mt-2">
                    <AttachmentList attachments={comment.attachments} />
                  </div>
                </div>

                {comment.isOwner ? (
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => {
                        setEditingId(comment.id);
                        setEditingContent(comment.content);
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
                  </div>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>

      {cursorToLoad ? (
        <Button
          type="button"
          variant="outline"
          onClick={() => void loadPage(cursorToLoad)}
          disabled={isFetching || isFirstPageFetching}
        >
          {isFetching ? <Spinner /> : "Загрузить ещё"}
        </Button>
      ) : null}
    </div>
  );
}
