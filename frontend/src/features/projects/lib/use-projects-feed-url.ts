import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router";

import {
  parseProjectsFeedSearchParams,
  projectsFeedToListQuery,
} from "../model/projects-feed-params";
import type { ProjectsListSort } from "../model/types";

import { useDebouncedValue } from "@/shared/lib/react/use-debounced-value";

const TITLE_SEARCH_DEBOUNCE_MS = 400;

export function useProjectsFeedUrl() {
  const [searchParams, setSearchParams] = useSearchParams();
  const feedFromUrl = useMemo(
    () => parseProjectsFeedSearchParams(searchParams),
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

  const setMember = useCallback(
    (member: boolean) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);

          if (member) {
            next.set("member", "1");
          } else {
            next.delete("member");
          }

          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  const setAcceptingApplications = useCallback(
    (acceptingApplications: boolean) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);

          if (acceptingApplications) {
            next.set("accepting", "1");
          } else {
            next.delete("accepting");
          }

          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  const setSort = useCallback(
    (sort: ProjectsListSort) => {
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
    () => projectsFeedToListQuery(feedFromUrl),
    [feedFromUrl]
  );

  const feedResetKey = useMemo(() => {
    const skillsKey = [...feedFromUrl.skillIds].sort().join(",");

    return `${feedFromUrl.q}|${feedFromUrl.member ? "1" : ""}|${feedFromUrl.acceptingApplications ? "A" : ""}|${feedFromUrl.sort}|${skillsKey}`;
  }, [
    feedFromUrl.acceptingApplications,
    feedFromUrl.member,
    feedFromUrl.q,
    feedFromUrl.sort,
    feedFromUrl.skillIds,
  ]);

  return {
    feedFromUrl,
    titleInput,
    setTitleInput,
    setMember,
    setAcceptingApplications,
    setSort,
    setSkillIds,
    apiFilters,
    feedResetKey,
  };
}
