import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().min(1, "Введите почту").email("Некорректная почта"),
  password: z.string().min(6, "Минимум 6 символов"),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    email: z.string().min(1, "Введите почту").email("Некорректная почта"),
    username: z
      .string()
      .min(3, "Минимум 3 символа")
      .max(32, "Максимум 32 символа")
      .regex(/^[a-zA-Z0-9_-]+$/, "Только латиница, цифры, _ и -"),
    password: z.string().min(6, "Минимум 6 символов"),
    confirmPassword: z.string().min(6, "Минимум 6 символов"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Пароли не совпадают",
    path: ["confirmPassword"],
  });

export type RegisterFormValues = z.infer<typeof registerSchema>;
