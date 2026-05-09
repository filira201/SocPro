import { zodResolver } from "@hookform/resolvers/zod";
import { format, isAfter, isValid, parse, startOfDay } from "date-fns";
import { ru } from "date-fns/locale";
import { CalendarIcon, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";

import { buildProfileFormData } from "../lib/build-profile-form-data";
import { parseBirthDateToInput } from "../lib/format-profile";
import { mapProfileApiErrorToFormFields } from "../lib/map-profile-api-error";
import {
  defaultContactsFieldArray,
  profileEditSchema,
  type ProfileEditFormValues,
} from "../model/profile-edit-schema";

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
  const [contactsApiError, setContactsApiError] = useState<string | null>(null);

  const form = useForm<ProfileEditFormValues>({
    resolver: zodResolver(profileEditSchema),
    defaultValues: {
      firstName: user.firstName,
      lastName: user.lastName ?? "",
      patronymic: user.patronymic ?? "",
      bio: user.bio ?? "",
      university: user.university ?? "",
      course: user.course ?? "",
      faculty: user.faculty ?? "",
      country: user.country ?? "",
      city: user.city ?? "",
      dateOfBirth: parseBirthDateToInput(user.dateOfBirth),
      contacts: defaultContactsFieldArray(user.contacts),
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "contacts",
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
    setContactsApiError(null);
    form.clearErrors();

    try {
      await updateUser({
        id: user.id,
        userData: buildProfileFormData({
          firstName: values.firstName,
          lastName: values.lastName,
          patronymic: values.patronymic,
          bio: values.bio,
          university: values.university,
          course: values.course,
          faculty: values.faculty,
          country: values.country,
          city: values.city,
          contacts: values.contacts.map((row) => row.value),
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

      if (message === "Некорректные контакты") {
        setContactsApiError(message);

        return;
      }

      if (!mapProfileApiErrorToFormFields(message, form.setError)) {
        setFormError(message);
      }
    }
  });

  const errors = form.formState.errors;

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
            <FieldLabel htmlFor="profile-firstName">
              Имя <span className="text-destructive">*</span>
            </FieldLabel>
            <Input
              id="profile-firstName"
              autoComplete="given-name"
              aria-invalid={Boolean(errors.firstName)}
              {...form.register("firstName")}
            />
            {errors.firstName?.message ? (
              <p className="text-sm text-destructive">
                {errors.firstName.message}
              </p>
            ) : null}
          </Field>
          <Field>
            <FieldLabel htmlFor="profile-lastName">Фамилия</FieldLabel>
            <Input
              id="profile-lastName"
              autoComplete="family-name"
              aria-invalid={Boolean(errors.lastName)}
              {...form.register("lastName")}
            />
            {errors.lastName?.message ? (
              <p className="text-sm text-destructive">
                {errors.lastName.message}
              </p>
            ) : null}
          </Field>
          <Field>
            <FieldLabel htmlFor="profile-patronymic">Отчество</FieldLabel>
            <Input
              id="profile-patronymic"
              autoComplete="additional-name"
              aria-invalid={Boolean(errors.patronymic)}
              {...form.register("patronymic")}
            />
            {errors.patronymic?.message ? (
              <p className="text-sm text-destructive">
                {errors.patronymic.message}
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
            aria-invalid={Boolean(errors.bio)}
            {...form.register("bio")}
          />
          {errors.bio?.message ? (
            <p className="text-sm text-destructive">{errors.bio.message}</p>
          ) : null}
        </Field>
      </FieldSet>

      <FieldSet>
        <FieldLegend>Контакты</FieldLegend>
        {contactsApiError ? (
          <p className="mb-2 rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {contactsApiError}
          </p>
        ) : null}
        {errors.contacts?.message ? (
          <p className="mb-2 text-sm text-destructive">
            {errors.contacts.message}
          </p>
        ) : null}
        <FieldGroup className="gap-3">
          {fields.map((field, index) => (
            <div key={field.id} className="flex gap-2">
              <div className="min-w-0 flex-1">
                <Input
                  placeholder="Телефон, почта, ссылка…"
                  aria-label={`Контакт ${index + 1}`}
                  aria-invalid={Boolean(
                    errors.contacts?.[index]?.value?.message
                  )}
                  {...form.register(`contacts.${index}.value`)}
                />
                {errors.contacts?.[index]?.value?.message ? (
                  <p className="mt-1 text-sm text-destructive">
                    {errors.contacts[index]?.value?.message}
                  </p>
                ) : null}
              </div>
              {fields.length > 1 ? (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="shrink-0 self-start"
                  onClick={() => remove(index)}
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
            onClick={() => append({ value: "" })}
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
                aria-invalid={Boolean(errors.dateOfBirth)}
                className={cn(
                  "w-full max-w-xs justify-start font-normal",
                  !dateBirthStr && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 size-4 opacity-70" />
                {birthButtonLabel}
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-auto overflow-hidden p-0"
              align="start"
            >
              <Calendar
                mode="single"
                selected={
                  parsedBirth && isValid(parsedBirth) ? parsedBirth : undefined
                }
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
          {errors.dateOfBirth?.message ? (
            <p className="mt-2 text-sm text-destructive">
              {errors.dateOfBirth.message}
            </p>
          ) : null}
          <div className="mt-2 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={() => {
                form.setValue("dateOfBirth", "", {
                  shouldDirty: true,
                  shouldValidate: true,
                });
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
            <Input
              id="profile-university"
              aria-invalid={Boolean(errors.university)}
              {...form.register("university")}
            />
            {errors.university?.message ? (
              <p className="text-sm text-destructive">
                {errors.university.message}
              </p>
            ) : null}
          </Field>
          <Field>
            <FieldLabel htmlFor="profile-course">Курс</FieldLabel>
            <Input
              id="profile-course"
              aria-invalid={Boolean(errors.course)}
              {...form.register("course")}
            />
            {errors.course?.message ? (
              <p className="text-sm text-destructive">
                {errors.course.message}
              </p>
            ) : null}
          </Field>
          <Field>
            <FieldLabel htmlFor="profile-faculty">Факультет</FieldLabel>
            <Input
              id="profile-faculty"
              aria-invalid={Boolean(errors.faculty)}
              {...form.register("faculty")}
            />
            {errors.faculty?.message ? (
              <p className="text-sm text-destructive">
                {errors.faculty.message}
              </p>
            ) : null}
          </Field>
          <Field>
            <FieldLabel htmlFor="profile-country">Страна</FieldLabel>
            <Input
              id="profile-country"
              aria-invalid={Boolean(errors.country)}
              {...form.register("country")}
            />
            {errors.country?.message ? (
              <p className="text-sm text-destructive">
                {errors.country.message}
              </p>
            ) : null}
          </Field>
          <Field>
            <FieldLabel htmlFor="profile-city">Город</FieldLabel>
            <Input
              id="profile-city"
              aria-invalid={Boolean(errors.city)}
              {...form.register("city")}
            />
            {errors.city?.message ? (
              <p className="text-sm text-destructive">{errors.city.message}</p>
            ) : null}
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
