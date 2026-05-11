import { z } from "zod";

import { PROJECT_STATUS_VALUES } from "../lib/project-status-options";

const TEXT_MAX = 20_000;

const statusSchema = z.enum(
  PROJECT_STATUS_VALUES as unknown as [string, ...string[]]
);

export const projectEditSchema = z.object({
  title: z.string().trim().min(1, "Укажите название проекта").max(TEXT_MAX),
  description: z.string().trim().min(1, "Укажите описание").max(TEXT_MAX),
  goals: z.string().trim().min(1, "Укажите цели").max(TEXT_MAX),
  status: statusSchema,
  acceptingApplications: z.boolean(),
  requiredSkillIds: z.array(z.string()),
});

export type ProjectEditFormValues = z.infer<typeof projectEditSchema>;
