import { z } from "zod";

import { PROJECT_STATUS_VALUES } from "../lib/project-status-options";

import {
  PROJECT_DESCRIPTION_MAX,
  PROJECT_GOALS_MAX,
  PROJECT_TITLE_MAX,
} from "./project-field-limits";

const statusSchema = z.enum(
  PROJECT_STATUS_VALUES as unknown as [string, ...string[]]
);

export const projectEditSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Укажите название проекта")
    .max(PROJECT_TITLE_MAX, `Не более ${PROJECT_TITLE_MAX} символов`),
  description: z
    .string()
    .trim()
    .min(1, "Укажите описание")
    .max(
      PROJECT_DESCRIPTION_MAX,
      `Не более ${PROJECT_DESCRIPTION_MAX} символов`
    ),
  goals: z
    .string()
    .trim()
    .min(1, "Укажите цели")
    .max(PROJECT_GOALS_MAX, `Не более ${PROJECT_GOALS_MAX} символов`),
  status: statusSchema,
  acceptingApplications: z.boolean(),
  requiredSkillIds: z.array(z.string()),
});

export type ProjectEditFormValues = z.infer<typeof projectEditSchema>;
