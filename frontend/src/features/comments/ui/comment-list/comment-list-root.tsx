import { useState } from "react";

import {
  useGetCommentsQuery,
  useLazyGetCommentsQuery,
} from "../../api/comments.api";
import { dedupeComments, insertBySort } from "../../lib/comment-list-helpers";
import type { Comment, CommentsSort } from "../../model/types";
import { CommentComposer } from "../comment-composer";

import { CommentThreadItem } from "./comment-thread-item";
import { PAGE_LIMIT, ROOT_INITIAL_LIMIT } from "./constants";
import { LoadMoreTrigger } from "./load-more-trigger";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/kit/select";

type CommentListRootProps = {
  postId: string;
};

export function CommentListRoot({ postId }: CommentListRootProps) {
  const stopBubble = (event: React.SyntheticEvent) => {
    event.stopPropagation();
  };

  const [sort, setSort] = useState<CommentsSort>("top");
  const [extraComments, setExtraComments] = useState<Comment[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null | undefined>(
    undefined
  );
  const rootQuery = {
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
