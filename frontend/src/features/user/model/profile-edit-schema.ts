import { isValid, parse } from "date-fns";
import { z } from "zod";

import {
  fioPartOptionalSchema,
  fioPartRequiredSchema,
} from "@/features/auth/model/schemas";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const shortText = (max: number) =>
  z.string().max(max, `Не более ${max} символов`);

export const profileEditSchema = z.object({
  firstName: fioPartRequiredSchema,
  lastName: fioPartOptionalSchema,
  patronymic: fioPartOptionalSchema,
  bio: shortText(2000),
  university: shortText(200),
  course: shortText(200),
  faculty: shortText(200),
  country: shortText(200),
  city: shortText(200),
  dateOfBirth: z.string().superRefine((val, ctx) => {
    const s = val.trim();

    if (!s) {
      return;
    }

    if (!ISO_DATE.test(s)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Некорректная дата рождения",
      });

      return;
    }

    const d = parse(s, "yyyy-MM-dd", new Date());

    if (!isValid(d)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Некорректная дата рождения",
      });

      return;
    }

    const endToday = new Date();
    endToday.setHours(23, 59, 59, 999);

    if (d > endToday) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Дата рождения не может быть в будущем",
      });
    }
  }),
  contacts: z
    .array(
      z.object({
        value: z.string().max(500, "Не более 500 символов в строке контакта"),
      })
    )
    .max(25, "Не более 25 строк контактов"),
});

export type ProfileEditFormValues = z.infer<typeof profileEditSchema>;

export function defaultContactsFieldArray(
  contacts: string[] | undefined
): ProfileEditFormValues["contacts"] {
  const list =
    contacts?.length && contacts.some((c) => c.trim()) ? [...contacts] : [""];

  return list.map((value) => ({ value }));
}
