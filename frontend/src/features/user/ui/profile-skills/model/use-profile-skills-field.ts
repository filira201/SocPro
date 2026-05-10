import { useEffect, useMemo, useRef, useState } from "react";
import { useController, type Control } from "react-hook-form";

import type { ProfileEditFormValues } from "../../../model/profile-edit-schema";

import {
  MAX_PROFILE_SKILLS,
  MIN_SEARCH_CHARS,
  PAGE_SIZE,
  SCROLL_LOAD_THRESHOLD_PX,
  SEARCH_DEBOUNCE_MS,
} from "./constants";

import type { Skill, User } from "@/features/auth";
import {
  type SkillWithMatch,
  useCreateSkillMutation,
  useLazyListSkillsQuery,
} from "@/features/skills/api/skills.api";
import { useDebouncedValue } from "@/shared/lib/react/use-debounced-value";

export type FuseChoiceState = {
  userInput: string;
  suggestion: SkillWithMatch;
};

export function useProfileSkillsField({
  control,
  user,
  disabled,
}: {
  control: Control<ProfileEditFormValues>;
  user: User;
  disabled?: boolean;
}) {
  const {
    field,
    fieldState: { error },
  } = useController({
    control,
    name: "skillIds",
  });

  const skillIds = useMemo(() => field.value ?? [], [field.value]);

  const [catalogOpen, setCatalogOpen] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState("");
  const debouncedSearch = useDebouncedValue(
    catalogSearch.trim(),
    SEARCH_DEBOUNCE_MS
  );
  const [supplementalNames, setSupplementalNames] = useState<
    Record<string, string>
  >({});
  const [createHint, setCreateHint] = useState<string | null>(null);
  const [customName, setCustomName] = useState("");
  const [fuseChoice, setFuseChoice] = useState<FuseChoiceState | null>(null);

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

      const q =
        debouncedSearch.length >= MIN_SEARCH_CHARS ? debouncedSearch : "";

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

    const qParam =
      debouncedSearch.length >= MIN_SEARCH_CHARS ? debouncedSearch : "";
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

  const idToName = useMemo(() => {
    const m = new Map<string, string>();
    user.skills?.forEach((s) => {
      m.set(s.id, s.name);
    });

    for (const [id, name] of Object.entries(supplementalNames)) {
      m.set(id, name);
    }

    return m;
  }, [user.skills, supplementalNames]);

  const addSkill = (skill: Skill) => {
    const ids = field.value ?? [];

    if (ids.includes(skill.id)) {
      return;
    }

    if (ids.length >= MAX_PROFILE_SKILLS) {
      return;
    }

    field.onChange([...ids, skill.id]);
    setSupplementalNames((prev) => ({ ...prev, [skill.id]: skill.name }));
  };

  const removeSkill = (id: string) => {
    const ids = field.value ?? [];
    field.onChange(ids.filter((x) => x !== id));
    setSupplementalNames((prev) => {
      const next = { ...prev };
      delete next[id];

      return next;
    });
  };

  const [createSkill, { isLoading: isCreating }] = useCreateSkillMutation();

  const handleCreateCustom = async () => {
    const name = customName.trim();

    if (!name || disabled || isCreating || fuseChoice) {
      return;
    }

    setCreateHint(null);

    try {
      const created = await createSkill({ name }).unwrap();

      if (created.matchedBy === "fuse") {
        setFuseChoice({ userInput: name, suggestion: created });

        return;
      }

      const ids = field.value ?? [];

      if (!ids.includes(created.id)) {
        if (ids.length >= MAX_PROFILE_SKILLS) {
          return;
        }

        field.onChange([...ids, created.id]);
      }

      setSupplementalNames((prev) => ({ ...prev, [created.id]: created.name }));

      if (created.matchedBy && created.matchedBy !== "created") {
        setCreateHint(`Сохранено как «${created.name}»`);
      }

      setCustomName("");
    } catch {
      setCreateHint("Не удалось добавить навык. Попробуйте ещё раз.");
    }
  };

  const fuseDialogBusy = Boolean(fuseChoice && isCreating);

  const handleFuseAccept = () => {
    if (!fuseChoice || disabled || fuseDialogBusy) {
      return;
    }

    addSkill(fuseChoice.suggestion);
    setCreateHint(`Сохранено как «${fuseChoice.suggestion.name}»`);
    setFuseChoice(null);
    setCustomName("");
  };

  const handleFuseOwn = async () => {
    if (!fuseChoice || disabled || fuseDialogBusy) {
      return;
    }

    setCreateHint(null);

    try {
      const created = await createSkill({
        name: fuseChoice.userInput,
        skipFuse: true,
      }).unwrap();
      const ids = field.value ?? [];

      if (!ids.includes(created.id)) {
        if (ids.length >= MAX_PROFILE_SKILLS) {
          setFuseChoice(null);

          return;
        }

        field.onChange([...ids, created.id]);
      }

      setSupplementalNames((prev) => ({ ...prev, [created.id]: created.name }));

      if (created.matchedBy && created.matchedBy !== "created") {
        setCreateHint(`Сохранено как «${created.name}»`);
      }

      setFuseChoice(null);
      setCustomName("");
    } catch {
      setCreateHint("Не удалось добавить навык. Попробуйте ещё раз.");
    }
  };

  const pickedSet = useMemo(() => new Set(skillIds), [skillIds]);

  const visibleCatalogSkills = useMemo(
    () => mergedSkills.filter((s) => !pickedSet.has(s.id)),
    [mergedSkills, pickedSet]
  );

  const showCatalogInitialSpinner = initialLoading && mergedSkills.length === 0;

  const catalogBlocked = skillIds.length >= MAX_PROFILE_SKILLS;

  const pickFromCatalog = (skill: Skill) => {
    addSkill(skill);
    setCatalogOpen(false);
    setCatalogSearch("");
  };

  const setCatalogOpenWrapped = (next: boolean) => {
    setCatalogOpen(next);

    if (!next) {
      setCatalogSearch("");
    }
  };

  return {
    fieldError: error,
    skillIds,
    getDisplayName: (id: string) => idToName.get(id) ?? id,
    removeSkill,
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
    customSkill: {
      name: customName,
      setName: setCustomName,
      onSubmit: handleCreateCustom,
      isCreating,
      blockedByFuseDialog: Boolean(fuseChoice),
      catalogBlocked,
    },
    fuseDialog: {
      choice: fuseChoice,
      busy: fuseDialogBusy,
      onOpenChange: (nextOpen: boolean) => {
        if (!nextOpen) {
          setFuseChoice(null);
        }
      },
      onAccept: handleFuseAccept,
      onOwn: handleFuseOwn,
    },
    createHint,
  };
}
