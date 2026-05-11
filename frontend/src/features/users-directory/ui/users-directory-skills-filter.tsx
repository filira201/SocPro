import { useCallback, useEffect } from "react";

import type { Skill } from "@/features/auth";
import { useProjectsFeedSkillsCatalog } from "@/features/projects/lib/use-projects-feed-skills-catalog";
import { MAX_PROJECT_FEED_SKILL_IDS } from "@/features/projects/model/projects-feed-params";
import { SelectedSkillsChips, SkillsCatalogPopover } from "@/features/skills";
import { useResolveSkillsByIdsQuery } from "@/features/skills/api/skills.api";

type UsersDirectorySkillsFilterProps = {
  skillIds: string[];
  onSkillIdsChange: (ids: string[]) => void;
  disabled?: boolean;
};

export function UsersDirectorySkillsFilter({
  skillIds,
  onSkillIdsChange,
  disabled,
}: UsersDirectorySkillsFilterProps) {
  const onAddSkill = useCallback(
    (skill: Skill) => {
      if (skillIds.includes(skill.id)) {
        return;
      }

      if (skillIds.length >= MAX_PROJECT_FEED_SKILL_IDS) {
        return;
      }

      onSkillIdsChange([...skillIds, skill.id]);
    },
    [onSkillIdsChange, skillIds]
  );

  const { data: resolvedSkills } = useResolveSkillsByIdsQuery(skillIds, {
    skip: skillIds.length === 0,
  });

  const { getDisplayName, setSupplementalNames, catalog } =
    useProjectsFeedSkillsCatalog({
      selectedIds: skillIds,
      disabled,
      onAddSkill,
    });

  useEffect(() => {
    if (!resolvedSkills?.length) {
      return;
    }

    setSupplementalNames((prev) => {
      const next = { ...prev };

      for (const s of resolvedSkills) {
        next[s.id] = s.name;
      }

      return next;
    });
  }, [resolvedSkills, setSupplementalNames]);

  const removeSkill = useCallback(
    (id: string) => {
      onSkillIdsChange(skillIds.filter((x) => x !== id));
    },
    [onSkillIdsChange, skillIds]
  );

  return (
    <div className="flex flex-col gap-2">
      <p className="text-muted-foreground text-sm">
        Навыки: только из каталога. Показываются пользователи, у которых в
        профиле есть <span className="text-foreground">каждый</span> из
        выбранных навыков (если добавить навык, которого нет в профиле
        пользователя, он исчезнет из выдачи).
      </p>

      <SelectedSkillsChips
        skillIds={skillIds}
        getDisplayName={getDisplayName}
        onRemove={removeSkill}
        disabled={disabled}
      />

      <SkillsCatalogPopover
        open={catalog.open}
        onOpenChange={catalog.setOpen}
        search={catalog.search}
        onSearchChange={catalog.setSearch}
        debouncedSearch={catalog.debouncedSearch}
        mergedSkillsCount={catalog.mergedSkillsCount}
        visibleSkills={catalog.visibleSkills}
        onListScroll={catalog.onListScroll}
        showInitialSpinner={catalog.showInitialSpinner}
        loadingMore={catalog.loadingMore}
        onPick={catalog.onPick}
        disabled={disabled}
        catalogBlocked={catalog.catalogBlocked}
        allAlreadySelectedMessage="Все найденные навыки уже добавлены в фильтр"
        triggerLabel="Добавить навык из каталога"
        triggerClassName="h-10"
      />
    </div>
  );
}
