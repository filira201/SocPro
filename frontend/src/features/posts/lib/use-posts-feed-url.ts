import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router";

import {
  parsePostsFeedSearchParams,
  postsFeedToApiQuery,
} from "../model/posts-feed-params";
import type { PostsSort } from "../model/types";

import { useDebouncedValue } from "@/shared/lib/react/use-debounced-value";

const DEBOUNCE_MS = 400;

export function usePostsFeedUrl() {
  const [searchParams, setSearchParams] = useSearchParams();
  const feedFromUrl = useMemo(
    () => parsePostsFeedSearchParams(searchParams),
    [searchParams]
  );

  const [queryInput, setQueryInput] = useState(feedFromUrl.q);
  const skipNextUrlToInputSync = useRef(false);

  useEffect(() => {
    if (skipNextUrlToInputSync.current) {
      skipNextUrlToInputSync.current = false;

      return;
    }

    setQueryInput(feedFromUrl.q);
  }, [feedFromUrl.q]);

  const debouncedQuery = useDebouncedValue(queryInput, DEBOUNCE_MS);

  useEffect(() => {
    const trimmed = debouncedQuery.trim();
    const nextQ = trimmed;
    const currentQ = feedFromUrl.q;

    if (nextQ === currentQ) {
      return;
    }

    skipNextUrlToInputSync.current = true;
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);

        if (nextQ) {
          next.set("q", nextQ);
        } else {
          next.delete("q");
        }

        return next;
      },
      { replace: true }
    );
  }, [debouncedQuery, feedFromUrl.q, setSearchParams]);

  const setMine = useCallback(
    (mine: boolean) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);

          if (mine) {
            next.set("mine", "1");
          } else {
            next.delete("mine");
          }

          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  const setSort = useCallback(
    (sort: PostsSort) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);

          if (sort === "old") {
            next.set("sort", "old");
          } else {
            next.delete("sort");
          }

          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  const apiFilters = useMemo(
    () => postsFeedToApiQuery(feedFromUrl),
    [feedFromUrl]
  );

  const feedResetKey = useMemo(
    () => `${feedFromUrl.q}|${feedFromUrl.mine ? "1" : ""}|${feedFromUrl.sort}`,
    [feedFromUrl.q, feedFromUrl.mine, feedFromUrl.sort]
  );

  return {
    feedFromUrl,
    queryInput,
    setQueryInput,
    setMine,
    setSort,
    apiFilters,
    feedResetKey,
  };
}
