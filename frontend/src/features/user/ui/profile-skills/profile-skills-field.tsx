import type { Control } from "react-hook-form";

import type { ProfileEditFormValues } from "../../model/profile-edit-schema";

import type { User } from "@/features/auth";
import { SkillIdsField } from "@/features/skills";

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
  return (
    <SkillIdsField
      control={control}
      name="skillIds"
      seedSkills={user.skills}
      disabled={disabled}
      fuseContext="profile"
      fuseDialogKeyPrefix="profile-skills-fuse"
      catalogAllAlreadySelectedMessage="Все подходящие навыки уже добавлены в профиль"
      description={
        <>
          Сначала найдите технологию в каталоге. Если её нет — добавьте новую.
          Название будет автоматически приведено к общему виду на сервере.
        </>
      }
    />
  );
}
