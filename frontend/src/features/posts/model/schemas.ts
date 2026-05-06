import { z } from "zod";

export const postSchema = z.object({
  content: z.string().max(5000, "Максимум 5000 символов"),
});

export const commentSchema = z.object({
  content: z.string().max(2000, "Максимум 2000 символов"),
});

export type PostFormValues = z.infer<typeof postSchema>;
export type CommentFormValues = z.infer<typeof commentSchema>;
