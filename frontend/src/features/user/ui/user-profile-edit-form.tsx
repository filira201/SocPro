import { zodResolver } from "@hookform/resolvers/zod";
import {
  format,
  isAfter,
  isValid,
  parse,
  startOfDay,
} from "date-fns";
import { ru } from "date-fns/locale";
import { CalendarIcon, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { buildProfileFormData } from "../lib/build-profile-form-data";
import { parseBirthDateToInput } from "../lib/format-profile";

import type { User } from "@/features/auth";
import { useUpdateUserMutation } from "@/features/auth";
import { cn } from "@/shared/lib/css";
import { Button } from "@/shared/ui/kit/button";
import { Calendar } from "@/shared/ui/kit/calendar";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/shared/ui/kit/field";
import { Input } from "@/shared/ui/kit/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/ui/kit/popover";
import { Textarea } from "@/shared/ui/kit/textarea";

const profileSchema = z.object({
  username: z
    .string()
    .min(3, "Минимум 3 символа")
    .max(32, "Максимум 32 символа")
    .regex(/^[\p{L}\p{N}_-]+$/u, "Только буквы, цифры, _ и -"),
  bio: z.string(),
  location: z.string(),
  university: z.string(),
  course: z.string(),
  faculty: z.string(),
  country: z.string(),
  city: z.string(),
  dateOfBirth: z.string(),
});

type ProfileFormValues = {
  username: string;
  bio: string;
  location: string;
  university: string;
  course: string;
  faculty: string;
  country: string;
  city: string;
  dateOfBirth: string;
};

type UserProfileEditFormProps = {
  user: User;
  onCancel: () => void;
  onSaved: () => void;
};

export function UserProfileEditForm({
  user,
  onCancel,
  onSaved,
}: UserProfileEditFormProps) {
  const [updateUser, { isLoading }] = useUpdateUserMutation();
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [removeResume, setRemoveResume] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const initialContacts =
    user.contacts?.length && user.contacts.some((c) => c.trim())
      ? [...user.contacts]
      : [""];

  const [contactLines, setContactLines] = useState<string[]>(initialContacts);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      username: user.username,
      bio: user.bio ?? "",
      location: user.location ?? "",
      university: user.university ?? "",
      course: user.course ?? "",
      faculty: user.faculty ?? "",
      country: user.country ?? "",
      city: user.city ?? "",
      dateOfBirth: parseBirthDateToInput(user.dateOfBirth),
    },
  });

  const dateBirthStr =
    useWatch({ control: form.control, name: "dateOfBirth" }) ?? "";

  const parsedBirth = dateBirthStr
    ? parse(dateBirthStr, "yyyy-MM-dd", new Date())
    : undefined;

  const birthButtonLabel =
    parsedBirth && isValid(parsedBirth)
      ? format(parsedBirth, "d MMMM yyyy", { locale: ru })
      : "Выберите дату";

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);

    try {
      await updateUser({
        id: user.id,
        userData: buildProfileFormData({
          username: values.username,
          bio: values.bio,
          location: values.location,
          university: values.university,
          course: values.course,
          faculty: values.faculty,
          country: values.country,
          city: values.city,
          contacts: contactLines,
          dateOfBirth: values.dateOfBirth,
          avatarFile,
          resumeFile,
          removeResume,
        }),
      }).unwrap();

      onSaved();
    } catch (err: unknown) {
      const message =
        err &&
        typeof err === "object" &&
        "data" in err &&
        err.data &&
        typeof err.data === "object" &&
        "error" in err.data &&
        typeof (err.data as { error: unknown }).error === "string"
          ? (err.data as { error: string }).error
          : "Не удалось сохранить профиль";
      setFormError(message);
    }
  });

  return (
    <form
      onSubmit={onSubmit}
      className="grid gap-6 rounded-xl border bg-card p-4 sm:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Редактирование профиля</h1>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Отмена
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Сохранение…" : "Сохранить"}
          </Button>
        </div>
      </div>

      {formError ? (
        <p className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {formError}
        </p>
      ) : null}

      <FieldSet>
        <FieldLegend>Учётная запись</FieldLegend>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="profile-email">Почта</FieldLabel>
            <Input
              id="profile-email"
              type="email"
              value={user.email}
              disabled
              autoComplete="email"
              className="bg-muted"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="profile-username">
              Имя пользователя <span className="text-destructive">*</span>
            </FieldLabel>
            <Input
              id="profile-username"
              autoComplete="username"
              aria-invalid={Boolean(form.formState.errors.username)}
              {...form.register("username")}
            />
            {form.formState.errors.username ? (
              <p className="text-sm text-destructive">
                {form.formState.errors.username.message}
              </p>
            ) : null}
          </Field>
        </FieldGroup>
      </FieldSet>

      <FieldSet>
        <FieldLegend>Аватар</FieldLegend>
        <Field>
          <FieldLabel htmlFor="profile-avatar">Новое изображение</FieldLabel>
          <Input
            id="profile-avatar"
            type="file"
            accept="image/*"
            className="cursor-pointer"
            onChange={(e) => {
              const file = e.target.files?.[0];
              setAvatarFile(file ?? null);
            }}
          />
          <p className="text-xs text-muted-foreground">
            Если не выбран файл, текущий аватар сохранится.
          </p>
        </Field>
      </FieldSet>

      <FieldSet>
        <FieldLegend>О себе</FieldLegend>
        <Field>
          <FieldLabel htmlFor="profile-bio">О себе</FieldLabel>
          <Textarea
            id="profile-bio"
            rows={4}
            className="min-h-24 resize-y"
            {...form.register("bio")}
          />
        </Field>
      </FieldSet>

      <FieldSet>
        <FieldLegend>Контакты</FieldLegend>
        <FieldGroup className="gap-3">
          {contactLines.map((line, index) => (
            <div key={`contact-${index}`} className="flex gap-2">
              <Input
                placeholder="Телефон, почта, ссылка…"
                aria-label={`Контакт ${index + 1}`}
                value={line}
                onChange={(e) => {
                  const v = e.target.value;

                  setContactLines((rows) => {
                    const next = [...rows];
                    next[index] = v;

                    return next;
                  });
                }}
              />
              {contactLines.length > 1 ? (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  onClick={() =>
                    setContactLines((rows) => rows.filter((_, i) => i !== index))
                  }
                  aria-label="Удалить контакт"
                >
                  <Trash2 className="size-4" />
                </Button>
              ) : null}
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-fit"
            onClick={() => setContactLines((rows) => [...rows, ""])}
          >
            <Plus className="mr-1 size-4" />
            Добавить контакт
          </Button>
        </FieldGroup>
      </FieldSet>

      <FieldSet>
        <FieldLegend>Дата рождения</FieldLegend>
        <Field>
          <FieldLabel>День рождения</FieldLabel>
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className={cn(
                  "w-full max-w-xs justify-start font-normal",
                  !dateBirthStr && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 size-4 opacity-70" />
                {birthButtonLabel}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto overflow-hidden p-0" align="start">
              <Calendar
                mode="single"
                selected={parsedBirth && isValid(parsedBirth) ? parsedBirth : undefined}
                defaultMonth={
                  parsedBirth && isValid(parsedBirth) ? parsedBirth : new Date()
                }
                captionLayout="dropdown"
                locale={ru}
                disabled={(date) =>
                  isAfter(startOfDay(date), startOfDay(new Date()))
                }
                onSelect={(d) => {
                  form.setValue(
                    "dateOfBirth",
                    d ? format(d, "yyyy-MM-dd") : "",
                    { shouldValidate: true, shouldDirty: true }
                  );
                  setCalendarOpen(false);
                }}
              />
            </PopoverContent>
          </Popover>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={() => {
                form.setValue("dateOfBirth", "", { shouldDirty: true });
              }}
            >
              Очистить дату
            </Button>
          </div>
        </Field>
      </FieldSet>

      <FieldSet>
        <FieldLegend>Учёба и место жительства</FieldLegend>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="profile-university">Вуз</FieldLabel>
            <Input id="profile-university" {...form.register("university")} />
          </Field>
          <Field>
            <FieldLabel htmlFor="profile-course">Курс</FieldLabel>
            <Input id="profile-course" {...form.register("course")} />
          </Field>
          <Field>
            <FieldLabel htmlFor="profile-faculty">Факультет</FieldLabel>
            <Input id="profile-faculty" {...form.register("faculty")} />
          </Field>
          <Field>
            <FieldLabel htmlFor="profile-country">Страна</FieldLabel>
            <Input id="profile-country" {...form.register("country")} />
          </Field>
          <Field>
            <FieldLabel htmlFor="profile-city">Город</FieldLabel>
            <Input id="profile-city" {...form.register("city")} />
          </Field>
          <Field>
            <FieldLabel htmlFor="profile-location">Локация (доп.)</FieldLabel>
            <Input id="profile-location" {...form.register("location")} />
          </Field>
        </FieldGroup>
      </FieldSet>

      <FieldSet>
        <FieldLegend>Резюме</FieldLegend>
        <FieldGroup className="gap-2">
          {user.resumeUrl && !removeResume && !resumeFile ? (
            <p className="text-sm text-muted-foreground">
              Текущий файл: {user.resumeOriginalName ?? "загружено"}
            </p>
          ) : null}
          <Field>
            <FieldLabel htmlFor="profile-resume">
              {user.resumeUrl ? "Заменить файл" : "Загрузить файл"}
            </FieldLabel>
            <Input
              id="profile-resume"
              type="file"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="cursor-pointer"
              onChange={(e) => {
                const file = e.target.files?.[0];

                setResumeFile(file ?? null);

                if (file) {
                  setRemoveResume(false);
                }
              }}
            />
          </Field>
          {user.resumeUrl ? (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={removeResume}
                onChange={(e) => {
                  setRemoveResume(e.target.checked);

                  if (e.target.checked) {
                    setResumeFile(null);
                  }
                }}
              />
              Удалить резюме
            </label>
          ) : null}
        </FieldGroup>
      </FieldSet>
    </form>
  );
}
