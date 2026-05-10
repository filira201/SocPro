import { z } from "zod";

const TEXT_MAX = 20_000;

export const projectCreateSchema = z.object({
  title: z.string().trim().min(1, "Укажите название проекта").max(TEXT_MAX),
  description: z.string().trim().min(1, "Укажите описание").max(TEXT_MAX),
  goals: z.string().trim().min(1, "Укажите цели").max(TEXT_MAX),
  requiredSkillIds: z.array(z.string()),
});

export type ProjectCreateFormValues = z.infer<typeof projectCreateSchema>;
