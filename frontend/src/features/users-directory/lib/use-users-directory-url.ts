import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router";

import {
  parseUsersDirectorySearchParams,
  usersDirectoryToListQuery,
} from "../model/users-directory-params";

import { useDebouncedValue } from "@/shared/lib/react/use-debounced-value";

const TITLE_SEARCH_DEBOUNCE_MS = 400;

export function useUsersDirectoryUrl() {
  const [searchParams, setSearchParams] = useSearchParams();
  const feedFromUrl = useMemo(
    () => parseUsersDirectorySearchParams(searchParams),
    [searchParams]
  );

  const [titleInput, setTitleInput] = useState(feedFromUrl.q);
  const skipNextUrlToTitleSync = useRef(false);

  useEffect(() => {
    if (skipNextUrlToTitleSync.current) {
      skipNextUrlToTitleSync.current = false;

      return;
    }

    setTitleInput(feedFromUrl.q);
  }, [feedFromUrl.q]);

  const debouncedTitle = useDebouncedValue(
    titleInput,
    TITLE_SEARCH_DEBOUNCE_MS
  );

  useEffect(() => {
    const trimmed = debouncedTitle.trim();
    const currentQ = feedFromUrl.q;

    if (trimmed === currentQ) {
      return;
    }

    skipNextUrlToTitleSync.current = true;
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);

        if (trimmed) {
          next.set("q", trimmed);
        } else {
          next.delete("q");
        }

        return next;
      },
      { replace: true }
    );
  }, [debouncedTitle, feedFromUrl.q, setSearchParams]);

  const setSkillIds = useCallback(
    (skillIds: string[]) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);

          if (skillIds.length) {
            next.set("skills", skillIds.join(","));
          } else {
            next.delete("skills");
          }

          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  const apiFilters = useMemo(
    () => usersDirectoryToListQuery(feedFromUrl),
    [feedFromUrl]
  );

  const feedResetKey = useMemo(() => {
    const skillsKey = [...feedFromUrl.skillIds].sort().join(",");

    return `${feedFromUrl.q}|${skillsKey}`;
  }, [feedFromUrl.q, feedFromUrl.skillIds]);

  return {
    feedFromUrl,
    titleInput,
    setTitleInput,
    setSkillIds,
    apiFilters,
    feedResetKey,
  };
}
