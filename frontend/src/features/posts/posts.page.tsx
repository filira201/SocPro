import { SearchIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { useGetPostsQuery } from "./api/posts.api";
import { usePostsFeedUrl } from "./lib/use-posts-feed-url";
import type { PostsQuery, PostsSort } from "./model/types";
import { PostCard } from "./ui/post-card";
import { PostComposer } from "./ui/post-composer";

import { Checkbox } from "@/shared/ui/kit/checkbox";
import { Input } from "@/shared/ui/kit/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/kit/select";
import { Spinner } from "@/shared/ui/kit/spinner";

type PostsFeedListProps = {
  apiFilters: Pick<PostsQuery, "q" | "mine" | "sort">;
  emptyMessage: string;
};

function PostsFeedList({ apiFilters, emptyMessage }: PostsFeedListProps) {
  const [cursor, setCursor] = useState<string | null>(null);
  const requestedCursors = useRef(new Set<string | null>([null]));
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const queryArgs = useMemo(
    () => ({
      ...apiFilters,
      cursor,
      limit: 10,
    }),
    [apiFilters, cursor]
  );

  const { data, isFetching, isLoading } = useGetPostsQuery(queryArgs);

  useEffect(() => {
    const sentinel = sentinelRef.current;

    if (!sentinel) {
      return;
    }

    const observer = new IntersectionObserver(([entry]) => {
      const nextCursor = data?.nextCursor ?? null;

      if (
        entry?.isIntersecting &&
        nextCursor &&
        !isFetching &&
        !requestedCursors.current.has(nextCursor)
      ) {
        requestedCursors.current.add(nextCursor);
        setCursor(nextCursor);
      }
    });

    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [data?.nextCursor, isFetching]);

  return (
    <>
      {data?.items.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}

      {isLoading || isFetching ? (
        <div className="flex justify-center py-4 text-muted-foreground">
          <Spinner />
        </div>
      ) : null}

      {!isLoading && !data?.items.length ? (
        <p className="rounded-xl border bg-card p-4 text-center text-muted-foreground">
          {emptyMessage}
        </p>
      ) : null}

      <div ref={sentinelRef} className="h-4" />
    </>
  );
}

function PostsPage() {
  const {
    feedFromUrl,
    queryInput,
    setQueryInput,
    setMine,
    setSort,
    apiFilters,
    feedResetKey,
  } = usePostsFeedUrl();

  const emptyMessage =
    feedFromUrl.q.trim() || feedFromUrl.mine
      ? "По заданным условиям ничего не найдено"
      : "Пока нет публикаций";

  return (
    <section className="w-full max-w-3xl mx-auto px-3 py-4 sm:px-4 sm:py-6 lg:py-8">
      <div className="grid gap-4">
        <h1 className="text-xl font-semibold sm:text-2xl">Лента публикаций</h1>
        <PostComposer />

        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
            <div className="relative min-w-0 flex-1 sm:min-w-48">
              <SearchIcon
                className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                className="h-10 pl-9"
                value={queryInput}
                onChange={(e) => setQueryInput(e.target.value)}
                placeholder="Поиск по тексту или по имени автора…"
                aria-label="Поиск публикаций"
                maxLength={200}
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 sm:shrink-0">
              <div className="flex w-fit max-w-full items-center gap-2">
                <Checkbox
                  id="posts-feed-mine"
                  checked={feedFromUrl.mine}
                  onCheckedChange={(checked) => setMine(checked === true)}
                />
                <label
                  className="cursor-pointer text-sm leading-none whitespace-nowrap select-none"
                  htmlFor="posts-feed-mine"
                >
                  Только мои публикации
                </label>
              </div>

              <span className="sr-only" id="posts-feed-sort-label">
                Порядок
              </span>
              <Select
                value={feedFromUrl.sort}
                onValueChange={(value) => setSort(value as PostsSort)}
              >
                <SelectTrigger
                  aria-labelledby="posts-feed-sort-label"
                  className="h-10 w-full min-w-44 sm:w-52"
                  size="default"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper">
                  <SelectItem value="new">Сначала новые</SelectItem>
                  <SelectItem value="old">Сначала старые</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <PostsFeedList
          key={feedResetKey}
          apiFilters={apiFilters}
          emptyMessage={emptyMessage}
        />
      </div>
    </section>
  );
}

export const Component = PostsPage;
