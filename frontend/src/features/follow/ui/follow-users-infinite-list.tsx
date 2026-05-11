import { useEffect, useMemo, useRef, useState } from "react";

import type { FollowListQueryArgs, FollowListUser } from "../api/follow.api";
import {
  useGetUserFollowersQuery,
  useGetUserFollowingQuery,
} from "../api/follow.api";

import { FollowUserCard } from "./follow-user-card";

import { getApiErrorMessage } from "@/shared/lib/api-error";
import { Spinner } from "@/shared/ui/kit/spinner";

const OBJECT_ID_REGEX = /^[a-f\d]{24}$/i;

type FollowUsersInfiniteListProps = {
  userId: string;
  kind: "followers" | "following";
  qFromUrl: string;
  emptyMessage: string;
};

export function FollowUsersInfiniteList({
  userId,
  kind,
  qFromUrl,
  emptyMessage,
}: FollowUsersInfiniteListProps) {
  const [cursor, setCursor] = useState<string | null>(null);
  const requestedCursors = useRef(new Set<string | null>([null]));
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const queryArgs: FollowListQueryArgs = useMemo(
    () => ({
      userId,
      limit: 10,
      cursor,
      ...(qFromUrl ? { q: qFromUrl } : {}),
    }),
    [userId, cursor, qFromUrl]
  );

  const skipBase = !OBJECT_ID_REGEX.test(userId);

  const followersResult = useGetUserFollowersQuery(queryArgs, {
    skip: skipBase || kind !== "followers",
  });

  const followingResult = useGetUserFollowingQuery(queryArgs, {
    skip: skipBase || kind !== "following",
  });

  const active = kind === "followers" ? followersResult : followingResult;
  const { data, isFetching, isLoading, error } = active;

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

  const globalError = getApiErrorMessage(error);
  const list: FollowListUser[] = data?.items ?? [];

  return (
    <>
      {globalError ? (
        <p className="mt-4 text-destructive" role="alert">
          {globalError}
        </p>
      ) : null}

      {!globalError && list.length > 0 ? (
        <ul className="mt-6 grid gap-3">
          {list.map((item) => (
            <li key={item.id}>
              <FollowUserCard user={item} isFollowing={item.isFollowing} />
            </li>
          ))}
        </ul>
      ) : null}

      {isLoading || isFetching ? (
        <div className="mt-8 flex justify-center text-muted-foreground">
          <Spinner />
        </div>
      ) : null}

      {!isLoading && !globalError && list.length === 0 ? (
        <p className="mt-4 text-muted-foreground">{emptyMessage}</p>
      ) : null}

      <div ref={sentinelRef} className="h-4" />
    </>
  );
}
