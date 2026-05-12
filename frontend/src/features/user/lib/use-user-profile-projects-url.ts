import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router";

import {
  PROFILE_PROJECTS_AUTHOR_PARAM,
  PROFILE_PROJECTS_Q_PARAM,
  parseProfileProjectsSearchParams,
  profileProjectsFeedToListFilters,
} from "../model/profile-projects-params";

import { useDebouncedValue } from "@/shared/lib/react/use-debounced-value";

const TITLE_SEARCH_DEBOUNCE_MS = 400;

export function useUserProfileProjectsUrl() {
  const [searchParams, setSearchParams] = useSearchParams();
  const feedFromUrl = useMemo(
    () => parseProfileProjectsSearchParams(searchParams),
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
          next.set(PROFILE_PROJECTS_Q_PARAM, trimmed);
        } else {
          next.delete(PROFILE_PROJECTS_Q_PARAM);
        }

        return next;
      },
      { replace: true }
    );
  }, [debouncedTitle, feedFromUrl.q, setSearchParams]);

  const setAuthorOnly = useCallback(
    (authorOnly: boolean) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);

          if (authorOnly) {
            next.set(PROFILE_PROJECTS_AUTHOR_PARAM, "1");
          } else {
            next.delete(PROFILE_PROJECTS_AUTHOR_PARAM);
          }

          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  const apiFilters = useMemo(
    () => profileProjectsFeedToListFilters(feedFromUrl),
    [feedFromUrl]
  );

  const listResetKey = useMemo(() => {
    return `${feedFromUrl.q}|${feedFromUrl.authorOnly ? "1" : ""}`;
  }, [feedFromUrl.authorOnly, feedFromUrl.q]);

  return {
    feedFromUrl,
    titleInput,
    setTitleInput,
    setAuthorOnly,
    apiFilters,
    listResetKey,
  };
}
