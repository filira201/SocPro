import { z } from "zod";

import { CYRILLIC_FIO_PART_REGEX } from "../lib/display-name";

export const loginSchema = z.object({
  email: z.string().min(1, "Введите почту").email("Некорректная почта"),
  password: z.string().min(6, "Минимум 6 символов"),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export const fioPartRequiredSchema = z
  .string()
  .min(1, "Введите имя")
  .regex(
    CYRILLIC_FIO_PART_REGEX,
    "Только кириллица, без пробелов и других символов"
  );

export const fioPartOptionalSchema = z
  .string()
  .refine(
    (s) => s.trim() === "" || CYRILLIC_FIO_PART_REGEX.test(s.trim()),
    "Только кириллица, без пробелов и других символов"
  );

export const registerSchema = z
  .object({
    email: z.string().min(1, "Введите почту").email("Некорректная почта"),
    firstName: fioPartRequiredSchema,
    lastName: fioPartOptionalSchema,
    patronymic: fioPartOptionalSchema,
    password: z.string().min(6, "Минимум 6 символов"),
    confirmPassword: z.string().min(6, "Минимум 6 символов"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Пароли не совпадают",
    path: ["confirmPassword"],
  });

export type RegisterFormValues = z.infer<typeof registerSchema>;
