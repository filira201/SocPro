import type { Control } from "react-hook-form";

import type { ProfileEditFormValues } from "../../../model/profile-edit-schema";

import { type FuseChoiceState, useSkillIdsField } from "./use-skill-ids-field";

import type { User } from "@/features/auth";

export type { FuseChoiceState };

export function useProfileSkillsField({
  control,
  user,
  disabled,
}: {
  control: Control<ProfileEditFormValues>;
  user: User;
  disabled?: boolean;
}) {
  return useSkillIdsField({
    control,
    name: "skillIds",
    seedSkills: user.skills,
    disabled,
  });
}
