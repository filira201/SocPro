import { z } from "zod";

export const postSchema = z.object({
  content: z.string().max(5000, "Максимум 5000 символов"),
});

export type PostFormValues = z.infer<typeof postSchema>;
