import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useGetPostsQuery } from "./api/posts.api";
import { PostCard } from "./compose/post-card";
import { PostComposer } from "./compose/post-composer";

function PostsPage() {
  const [cursor, setCursor] = useState<string | null>(null);
  const requestedCursors = useRef(new Set<string | null>([null]));
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const { data, isFetching, isLoading } = useGetPostsQuery({
    cursor,
    limit: 10,
  });

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
    <section className="w-full max-w-3xl mx-auto px-3 py-4 sm:px-4 sm:py-6 lg:py-8">
      <div className="grid gap-4">
        <h1 className="text-xl font-semibold sm:text-2xl">Лента публикаций</h1>
        <PostComposer />

        {data?.items.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}

        {isLoading || isFetching ? (
          <div className="flex justify-center py-4 text-muted-foreground">
            <Loader2 className="animate-spin" />
          </div>
        ) : null}

        {!isLoading && !data?.items.length ? (
          <p className="rounded-xl border bg-card p-4 text-center text-muted-foreground">
            Пока нет публикаций
          </p>
        ) : null}

        <div ref={sentinelRef} className="h-4" />
      </div>
    </section>
  );
}

export const Component = PostsPage;
