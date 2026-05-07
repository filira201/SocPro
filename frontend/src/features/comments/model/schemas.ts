import { z } from "zod";

export const commentSchema = z.object({
  content: z.string().max(2000, "Максимум 2000 символов"),
});

export type CommentFormValues = z.infer<typeof commentSchema>;
