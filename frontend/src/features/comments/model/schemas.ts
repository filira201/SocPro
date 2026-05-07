import { z } from "zod";

export const MAX_COMMENT_LENGTH = 2000;

export const commentBodySchema = z.object({
  body: z.string().max(MAX_COMMENT_LENGTH, "Максимум 2000 символов"),
});

export type CommentBodyFormValues = z.infer<typeof commentBodySchema>;
