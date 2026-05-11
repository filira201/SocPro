import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { MAX_PROJECT_FEED_SKILL_IDS } from "../model/projects-feed-params";

import type { Skill } from "@/features/auth";
import {
  PAGE_SIZE,
  SCROLL_LOAD_THRESHOLD_PX,
  SEARCH_DEBOUNCE_MS,
} from "@/features/skills";
import { useLazyListSkillsQuery } from "@/features/skills/api/skills.api";
import { useDebouncedValue } from "@/shared/lib/react/use-debounced-value";

type UseProjectsFeedSkillsCatalogOptions = {
  selectedIds: string[];
  disabled?: boolean;
  onAddSkill: (skill: Skill) => void;
};

export function useProjectsFeedSkillsCatalog({
  selectedIds,
  disabled,
  onAddSkill,
}: UseProjectsFeedSkillsCatalogOptions) {
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState("");
  const debouncedSearch = useDebouncedValue(
    catalogSearch.trim(),
    SEARCH_DEBOUNCE_MS
  );
  const [supplementalNames, setSupplementalNames] = useState<
    Record<string, string>
  >({});
  const [mergedSkills, setMergedSkills] = useState<Skill[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [initialLoading, setInitialLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const apiSkipRef = useRef(0);
  const loadMoreGuardRef = useRef(false);

  const [triggerSearch] = useLazyListSkillsQuery();

  useEffect(() => {
    if (!catalogOpen) {
      return;
    }

    let cancelled = false;

    const loadFirstPage = async () => {
      setInitialLoading(true);
      setMergedSkills([]);
      apiSkipRef.current = 0;
      setHasMore(true);

      const q = debouncedSearch.length >= 1 ? debouncedSearch : "";

      try {
        const data = await triggerSearch({
          q,
          skip: 0,
          take: PAGE_SIZE,
        }).unwrap();

        if (cancelled) {
          return;
        }

        setMergedSkills(data);
        apiSkipRef.current = data.length;
        setHasMore(data.length === PAGE_SIZE);
      } catch {
        if (!cancelled) {
          setMergedSkills([]);
          setHasMore(false);
        }
      } finally {
        if (!cancelled) {
          setInitialLoading(false);
        }
      }
    };

    void loadFirstPage();

    return () => {
      cancelled = true;
    };
  }, [catalogOpen, debouncedSearch, triggerSearch]);

  const handleCatalogListScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (
      !catalogOpen ||
      !hasMore ||
      initialLoading ||
      loadingMore ||
      loadMoreGuardRef.current
    ) {
      return;
    }

    const el = e.currentTarget;

    if (
      el.scrollHeight - el.scrollTop - el.clientHeight >
      SCROLL_LOAD_THRESHOLD_PX
    ) {
      return;
    }

    loadMoreGuardRef.current = true;
    setLoadingMore(true);

    const qParam = debouncedSearch.length >= 1 ? debouncedSearch : "";
    const skip = apiSkipRef.current;

    void (async () => {
      try {
        const data = await triggerSearch({
          q: qParam,
          skip,
          take: PAGE_SIZE,
        }).unwrap();

        setMergedSkills((prev) => {
          const seen = new Set(prev.map((s) => s.id));
          const extra = data.filter((s) => !seen.has(s.id));

          return [...prev, ...extra];
        });

        apiSkipRef.current = skip + data.length;
        setHasMore(data.length === PAGE_SIZE);
      } finally {
        setLoadingMore(false);
        loadMoreGuardRef.current = false;
      }
    })();
  };

  const pickedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const visibleCatalogSkills = useMemo(
    () => mergedSkills.filter((s) => !pickedSet.has(s.id)),
    [mergedSkills, pickedSet]
  );

  const showCatalogInitialSpinner = initialLoading && mergedSkills.length === 0;

  const catalogBlocked =
    Boolean(disabled) || selectedIds.length >= MAX_PROJECT_FEED_SKILL_IDS;

  const setCatalogOpenWrapped = (next: boolean) => {
    setCatalogOpen(next);

    if (!next) {
      setCatalogSearch("");
    }
  };

  const pickFromCatalog = useCallback(
    (skill: Skill) => {
      onAddSkill(skill);
      setSupplementalNames((prev) => ({ ...prev, [skill.id]: skill.name }));
      setCatalogOpen(false);
      setCatalogSearch("");
    },
    [onAddSkill]
  );

  const getDisplayName = (id: string) => supplementalNames[id] ?? id;

  return {
    getDisplayName,
    setSupplementalNames,
    supplementalNames,
    catalog: {
      open: catalogOpen,
      setOpen: setCatalogOpenWrapped,
      search: catalogSearch,
      setSearch: setCatalogSearch,
      debouncedSearch,
      mergedSkillsCount: mergedSkills.length,
      visibleSkills: visibleCatalogSkills,
      onListScroll: handleCatalogListScroll,
      showInitialSpinner: showCatalogInitialSpinner,
      loadingMore,
      onPick: pickFromCatalog,
      catalogBlocked,
    },
  };
}
