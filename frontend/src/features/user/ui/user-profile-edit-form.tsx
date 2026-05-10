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
import { CountryCityFields } from "@/features/geo/ui/country-city-fields";
import { cn } from "@/shared/lib/css";
import { Button } from "@/shared/ui/kit/button";
import { Calendar } from "@/shared/ui/kit/calendar";
import { Checkbox } from "@/shared/ui/kit/checkbox";
import {
  Field,
  FieldError,
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

  const {
    clearErrors,
    control,
    handleSubmit,
    register,
    setError,
    setValue,
    formState: { errors },
  } = useForm<ProfileEditFormValues>({
    resolver: zodResolver(profileEditSchema),
    mode: "onSubmit",
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
    control,
    name: "contacts",
  });

  const dateBirthStr = useWatch({ control, name: "dateOfBirth" }) ?? "";

  const parsedBirth = dateBirthStr
    ? parse(dateBirthStr, "yyyy-MM-dd", new Date())
    : undefined;

  const birthButtonLabel =
    parsedBirth && isValid(parsedBirth)
      ? format(parsedBirth, "d MMMM yyyy", { locale: ru })
      : "Выберите дату";

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    setContactsApiError(null);
    clearErrors();

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

      if (!mapProfileApiErrorToFormFields(message, setError)) {
        setFormError(message);
      }
    }
  });

  return (
    <form
      onSubmit={onSubmit}
      noValidate
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
        <FieldLegend>Профиль</FieldLegend>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="profile-email">
              Почта <span className="text-destructive">*</span>
            </FieldLabel>
            <Input
              id="profile-email"
              type="email"
              value={user.email}
              disabled
              autoComplete="email"
              className="bg-muted"
            />
          </Field>
          <Field data-invalid={!!errors.firstName}>
            <FieldLabel htmlFor="profile-firstName">
              Имя <span className="text-destructive">*</span>
            </FieldLabel>
            <Input
              id="profile-firstName"
              autoComplete="given-name"
              aria-invalid={Boolean(errors.firstName)}
              {...register("firstName")}
            />
            {errors.firstName?.message ? (
              <FieldError>{errors.firstName.message}</FieldError>
            ) : null}
          </Field>
          <Field data-invalid={!!errors.lastName}>
            <FieldLabel htmlFor="profile-lastName">Фамилия</FieldLabel>
            <Input
              id="profile-lastName"
              autoComplete="family-name"
              aria-invalid={Boolean(errors.lastName)}
              {...register("lastName")}
            />
            {errors.lastName?.message ? (
              <FieldError>{errors.lastName.message}</FieldError>
            ) : null}
          </Field>
          <Field data-invalid={!!errors.patronymic}>
            <FieldLabel htmlFor="profile-patronymic">Отчество</FieldLabel>
            <Input
              id="profile-patronymic"
              autoComplete="additional-name"
              aria-invalid={Boolean(errors.patronymic)}
              {...register("patronymic")}
            />
            {errors.patronymic?.message ? (
              <FieldError>{errors.patronymic.message}</FieldError>
            ) : null}
          </Field>
        </FieldGroup>
        <Field className="mt-4">
          <FieldLabel htmlFor="profile-avatar">Аватар</FieldLabel>
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
        <Field data-invalid={!!errors.bio} className="mt-4">
          <FieldLabel htmlFor="profile-bio">О себе</FieldLabel>
          <Textarea
            id="profile-bio"
            rows={4}
            className="min-h-24 resize-y"
            aria-invalid={Boolean(errors.bio)}
            {...register("bio")}
          />
          {errors.bio?.message ? (
            <FieldError>{errors.bio.message}</FieldError>
          ) : null}
        </Field>
        <Field data-invalid={!!errors.dateOfBirth} className="mt-4">
          <FieldLabel>Дата рождения</FieldLabel>
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
                  setValue("dateOfBirth", d ? format(d, "yyyy-MM-dd") : "", {
                    shouldValidate: true,
                    shouldDirty: true,
                  });
                  setCalendarOpen(false);
                }}
              />
            </PopoverContent>
          </Popover>
          {errors.dateOfBirth?.message ? (
            <FieldError className="mt-2">
              {errors.dateOfBirth.message}
            </FieldError>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={() => {
                setValue("dateOfBirth", "", {
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
            <Field orientation="horizontal">
              <Checkbox
                id="profile-remove-resume"
                checked={removeResume}
                onCheckedChange={(checked) => {
                  const next = checked === true;

                  setRemoveResume(next);

                  if (next) {
                    setResumeFile(null);
                  }
                }}
              />
              <FieldLabel
                htmlFor="profile-remove-resume"
                className="cursor-pointer font-normal"
              >
                Удалить резюме
              </FieldLabel>
            </Field>
          ) : null}
        </FieldGroup>
      </FieldSet>

      <FieldSet>
        <FieldLegend>Образование</FieldLegend>
        <FieldGroup>
          <Field data-invalid={!!errors.university}>
            <FieldLabel htmlFor="profile-university">Вуз</FieldLabel>
            <Input
              id="profile-university"
              aria-invalid={Boolean(errors.university)}
              {...register("university")}
            />
            {errors.university?.message ? (
              <FieldError>{errors.university.message}</FieldError>
            ) : null}
          </Field>
          <Field data-invalid={!!errors.faculty}>
            <FieldLabel htmlFor="profile-faculty">Факультет</FieldLabel>
            <Input
              id="profile-faculty"
              aria-invalid={Boolean(errors.faculty)}
              {...register("faculty")}
            />
            {errors.faculty?.message ? (
              <FieldError>{errors.faculty.message}</FieldError>
            ) : null}
          </Field>
          <Field data-invalid={!!errors.course}>
            <FieldLabel htmlFor="profile-course">Курс</FieldLabel>
            <Input
              id="profile-course"
              aria-invalid={Boolean(errors.course)}
              {...register("course")}
            />
            {errors.course?.message ? (
              <FieldError>{errors.course.message}</FieldError>
            ) : null}
          </Field>
        </FieldGroup>
      </FieldSet>

      <FieldSet>
        <FieldLegend>Место жительства</FieldLegend>
        <FieldGroup>
          <CountryCityFields control={control} setValue={setValue} errors={errors} />
        </FieldGroup>
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
                  {...register(`contacts.${index}.value`)}
                />
                {errors.contacts?.[index]?.value?.message ? (
                  <FieldError className="mt-1">
                    {errors.contacts[index]?.value?.message}
                  </FieldError>
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
    </form>
  );
}
