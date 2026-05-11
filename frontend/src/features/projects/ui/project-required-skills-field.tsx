import type { Control, FieldPath, FieldValues } from "react-hook-form";

import { SkillIdsField } from "@/features/skills";

export type ProjectRequiredSkillsFieldProps<
  TFieldValues extends FieldValues & { requiredSkillIds: string[] },
> = {
  control: Control<TFieldValues>;
  seedSkills?: { id: string; name: string }[] | null;
  disabled?: boolean;
};

export function ProjectRequiredSkillsField<
  TFieldValues extends FieldValues & { requiredSkillIds: string[] },
>({
  control,
  seedSkills,
  disabled,
}: ProjectRequiredSkillsFieldProps<TFieldValues>) {
  return (
    <SkillIdsField
      control={control}
      name={"requiredSkillIds" as FieldPath<TFieldValues>}
      seedSkills={seedSkills}
      disabled={disabled}
      fuseContext="project"
      fuseDialogKeyPrefix="project-required-skills-fuse"
      catalogAllAlreadySelectedMessage="Все подходящие навыки уже добавлены в проект"
      actionsClassName="mt-3"
      description={
        <>
          Сначала найдите навык в каталоге. Если его нет — добавьте новый.
          Название будет автоматически приведено к общему виду на сервере.
        </>
      }
    />
  );
}
