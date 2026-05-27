import { z } from "zod";

import { CYRILLIC_FIO_PART_REGEX } from "../lib/display-name";

import {
  USER_EMAIL_MAX,
  USER_FIO_PART_MAX,
  USER_PASSWORD_MAX,
} from "./auth-field-limits";

const maxLen = (max: number) => `Не более ${max} символов`;

const emailSchema = z
  .string()
  .min(1, "Введите почту")
  .max(USER_EMAIL_MAX, maxLen(USER_EMAIL_MAX))
  .email("Некорректная почта");

const passwordSchema = z
  .string()
  .min(6, "Минимум 6 символов")
  .max(USER_PASSWORD_MAX, maxLen(USER_PASSWORD_MAX));

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export const fioPartRequiredSchema = z
  .string()
  .min(1, "Введите имя")
  .max(USER_FIO_PART_MAX, maxLen(USER_FIO_PART_MAX))
  .regex(
    CYRILLIC_FIO_PART_REGEX,
    "Только кириллица, без пробелов и других символов"
  );

export const fioPartOptionalSchema = z
  .string()
  .max(USER_FIO_PART_MAX, maxLen(USER_FIO_PART_MAX))
  .refine(
    (s) => s.trim() === "" || CYRILLIC_FIO_PART_REGEX.test(s.trim()),
    "Только кириллица, без пробелов и других символов"
  );

export const registerSchema = z
  .object({
    email: emailSchema,
    firstName: fioPartRequiredSchema,
    lastName: fioPartOptionalSchema,
    patronymic: fioPartOptionalSchema,
    password: passwordSchema,
    confirmPassword: passwordSchema,
    personalDataConsent: z.boolean().refine((v) => v === true, {
      message: "Необходимо согласие на обработку персональных данных",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Пароли не совпадают",
    path: ["confirmPassword"],
  });

export type RegisterFormValues = z.infer<typeof registerSchema>;
