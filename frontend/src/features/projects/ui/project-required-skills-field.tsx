import type { Control, FieldPath, FieldValues } from "react-hook-form";

import { useSkillIdsField } from "@/features/user/ui/profile-skills/model/use-skill-ids-field";
import { CustomSkillRow } from "@/features/user/ui/profile-skills/ui/custom-skill-row";
import { FuseSkillConfirmDialog } from "@/features/user/ui/profile-skills/ui/fuse-skill-confirm-dialog";
import { SelectedSkillsChips } from "@/features/user/ui/profile-skills/ui/selected-skills-chips";
import { SkillsCatalogPopover } from "@/features/user/ui/profile-skills/ui/skills-catalog-popover";
import { Field, FieldDescription, FieldError } from "@/shared/ui/kit/field";

export type ProjectRequiredSkillsFieldProps<
  TFieldValues extends FieldValues & { requiredSkillIds: string[] },
> = {
  control: Control<TFieldValues>;
  disabled?: boolean;
};

export function ProjectRequiredSkillsField<
  TFieldValues extends FieldValues & { requiredSkillIds: string[] },
>({ control, disabled }: ProjectRequiredSkillsFieldProps<TFieldValues>) {
  const {
    fieldError,
    skillIds,
    getDisplayName,
    removeSkill,
    catalog,
    customSkill,
    fuseDialog,
    createHint,
  } = useSkillIdsField({
    control,
    name: "requiredSkillIds" as FieldPath<TFieldValues>,
    seedSkills: [],
    disabled,
  });

  return (
    <Field data-invalid={!!fieldError}>
      <FieldDescription>
        Укажите требуемые навыки из каталога или добавьте новый навык — название
        будет приведено к общему виду на сервере.
      </FieldDescription>

      <SelectedSkillsChips
        skillIds={skillIds}
        getDisplayName={getDisplayName}
        onRemove={removeSkill}
        disabled={disabled}
      />

      <div className="mt-3 flex flex-col gap-3">
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
        />

        <CustomSkillRow
          value={customSkill.name}
          onChange={customSkill.setName}
          onSubmit={customSkill.onSubmit}
          disabled={disabled}
          isCreating={customSkill.isCreating}
          blockedByFuseDialog={customSkill.blockedByFuseDialog}
          catalogBlocked={customSkill.catalogBlocked}
        />
      </div>

      {createHint ? (
        <p className="mt-2 text-sm text-muted-foreground" role="status">
          {createHint}
        </p>
      ) : null}

      {fieldError?.message ? (
        <FieldError>{fieldError.message}</FieldError>
      ) : null}

      <FuseSkillConfirmDialog
        key={
          fuseDialog.choice
            ? `${fuseDialog.choice.suggestion.id}:${fuseDialog.choice.userInput}`
            : "fuse-dialog-project"
        }
        open={fuseDialog.choice !== null}
        fuseChoice={fuseDialog.choice}
        busy={fuseDialog.busy}
        disabled={disabled}
        onOpenChange={fuseDialog.onOpenChange}
        onAccept={fuseDialog.onAccept}
        onOwn={fuseDialog.onOwn}
      />
    </Field>
  );
}
