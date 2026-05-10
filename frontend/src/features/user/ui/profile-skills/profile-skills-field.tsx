import type { Control } from "react-hook-form";

import type { ProfileEditFormValues } from "../../model/profile-edit-schema";

import { useProfileSkillsField } from "./model/use-profile-skills-field";
import { CustomSkillRow } from "./ui/custom-skill-row";
import { FuseSkillConfirmDialog } from "./ui/fuse-skill-confirm-dialog";
import { SelectedSkillsChips } from "./ui/selected-skills-chips";
import { SkillsCatalogPopover } from "./ui/skills-catalog-popover";

import type { User } from "@/features/auth";
import { Field, FieldDescription, FieldError } from "@/shared/ui/kit/field";

export type ProfileSkillsFieldProps = {
  control: Control<ProfileEditFormValues>;
  user: User;
  disabled?: boolean;
};

export function ProfileSkillsField({
  control,
  user,
  disabled,
}: ProfileSkillsFieldProps) {
  const {
    fieldError,
    skillIds,
    getDisplayName,
    removeSkill,
    catalog,
    customSkill,
    fuseDialog,
    createHint,
  } = useProfileSkillsField({ control, user, disabled });

  return (
    <Field data-invalid={!!fieldError}>
      <FieldDescription>
        Сначала найдите технологию в каталоге. Если её нет — добавьте новую.
        Название будет автоматически приведено к общему виду на сервере.
      </FieldDescription>

      <SelectedSkillsChips
        skillIds={skillIds}
        getDisplayName={getDisplayName}
        onRemove={removeSkill}
        disabled={disabled}
      />

      <div className="flex flex-col gap-3">
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
            : "fuse-dialog"
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
