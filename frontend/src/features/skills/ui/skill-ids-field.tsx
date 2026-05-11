import type { ReactNode } from "react";
import type { Control, FieldPath, FieldValues } from "react-hook-form";

import { useSkillIdsField } from "../model/use-skill-ids-field";

import { CustomSkillRow } from "./custom-skill-row";
import {
  FuseSkillConfirmDialog,
  type FuseSkillContext,
} from "./fuse-skill-confirm-dialog";
import { SelectedSkillsChips } from "./selected-skills-chips";
import { SkillsCatalogPopover } from "./skills-catalog-popover";

import type { Skill } from "@/features/auth";
import { cn } from "@/shared/lib/css";
import { Field, FieldDescription, FieldError } from "@/shared/ui/kit/field";

export type SkillIdsFieldProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
> = {
  control: Control<TFieldValues>;
  name: TName;
  seedSkills?: Skill[] | null;
  disabled?: boolean;
  maxSkills?: number;
  description: ReactNode;
  /** Текст диалога слияния (fuse) с сервером */
  fuseContext?: FuseSkillContext;
  /** Сообщение, когда API вернул навыки, но все уже в списке */
  catalogAllAlreadySelectedMessage?: string;
  /** Доп. классы для блока «каталог + свой навык» */
  actionsClassName?: string;
  /** Префикс для `key` у диалога fuse (стабильность при нескольких полях на странице) */
  fuseDialogKeyPrefix?: string;
};

export function SkillIdsField<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
>({
  control,
  name,
  seedSkills,
  disabled,
  maxSkills,
  description,
  fuseContext = "profile",
  catalogAllAlreadySelectedMessage,
  actionsClassName,
  fuseDialogKeyPrefix = "skill-ids-fuse",
}: SkillIdsFieldProps<TFieldValues, TName>) {
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
    name,
    seedSkills,
    maxSkills,
    disabled,
  });

  return (
    <Field data-invalid={!!fieldError}>
      <FieldDescription>{description}</FieldDescription>

      <SelectedSkillsChips
        skillIds={skillIds}
        getDisplayName={getDisplayName}
        onRemove={removeSkill}
        disabled={disabled}
      />

      <div className={cn("flex flex-col gap-3", actionsClassName)}>
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
          allAlreadySelectedMessage={catalogAllAlreadySelectedMessage}
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
            ? `${fuseDialogKeyPrefix}:${fuseDialog.choice.suggestion.id}:${fuseDialog.choice.userInput}`
            : fuseDialogKeyPrefix
        }
        open={fuseDialog.choice !== null}
        fuseChoice={fuseDialog.choice}
        busy={fuseDialog.busy}
        disabled={disabled}
        context={fuseContext}
        onOpenChange={fuseDialog.onOpenChange}
        onAccept={fuseDialog.onAccept}
        onOwn={fuseDialog.onOwn}
      />
    </Field>
  );
}
