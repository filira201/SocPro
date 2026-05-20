import { zodResolver } from "@hookform/resolvers/zod";
import { CircleCheck } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useController, useForm, useWatch } from "react-hook-form";

import { useUpdateProjectMutation } from "../api/projects.api";
import { buildUpdateProjectFormData } from "../lib/build-project-form-data";
import {
  MAX_PROJECT_ATTACHMENTS,
  PROJECT_ATTACHMENTS_LIMIT_ERROR,
  PROJECT_DOCUMENT_ACCEPT,
} from "../lib/project-attachments";
import {
  isTerminalProjectStatus,
  PROJECT_STATUS_OPTIONS,
} from "../lib/project-status-options";
import {
  projectEditSchema,
  type ProjectEditFormValues,
} from "../model/project-edit-schema";
import {
  PROJECT_DESCRIPTION_MAX,
  PROJECT_GOALS_MAX,
  PROJECT_TITLE_MAX,
} from "../model/project-field-limits";
import type { ProjectDetail } from "../model/types";

import { ProjectRequiredSkillsField } from "./project-required-skills-field";

import { getApiErrorMessage, type ApiError } from "@/shared/lib/api-error";
import { Button } from "@/shared/ui/kit/button";
import { Checkbox } from "@/shared/ui/kit/checkbox";
import {
  Field,
  FieldContent,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/shared/ui/kit/field";
import { Input } from "@/shared/ui/kit/input";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemMedia,
} from "@/shared/ui/kit/item";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/kit/select";
import { Textarea } from "@/shared/ui/kit/textarea";

type ProjectEditFormProps = {
  project: ProjectDetail;
};

function toEditDefaults(project: ProjectDetail): ProjectEditFormValues {
  const statusOk = PROJECT_STATUS_OPTIONS.some(
    (o) => o.value === project.status
  );

  return {
    title: project.title,
    description: project.description,
    goals: project.goals,
    status: (statusOk
      ? project.status
      : "OPEN") as ProjectEditFormValues["status"],
    acceptingApplications: project.acceptingApplications,
    requiredSkillIds: project.requiredSkills?.map((s) => s.id) ?? [],
  };
}

/** Версия проекта с сервера: при изменении синхронизируем поля формы через `reset`. */
function projectServerSyncToken(project: ProjectDetail) {
  return `${project.id}:${project.updatedAt ?? ""}`;
}

function ProjectEditFormBody({ project }: ProjectEditFormProps) {
  const [updateProject, { isLoading }] = useUpdateProjectMutation();
  const [formError, setFormError] = useState<string | null>(null);
  const [savedHint, setSavedHint] = useState<string | null>(null);
  const [newDocumentFiles, setNewDocumentFiles] = useState<File[]>([]);
  const [pendingRemoveAttachmentIds, setPendingRemoveAttachmentIds] = useState<
    string[]
  >([]);
  const [documentsError, setDocumentsError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<ProjectEditFormValues>({
    resolver: zodResolver(projectEditSchema),
    mode: "onSubmit",
    defaultValues: toEditDefaults(project),
  });

  const status = useWatch({ control, name: "status" });
  const { field: acceptingApplicationsField } = useController({
    control,
    name: "acceptingApplications",
  });

  const syncToken = projectServerSyncToken(project);
  const didMountSyncRef = useRef(false);

  useLayoutEffect(() => {
    if (!didMountSyncRef.current) {
      didMountSyncRef.current = true;

      return;
    }

    reset(toEditDefaults(project));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- синхронизация только при новой версии с сервера (`syncToken`).
  }, [syncToken, reset]);

  useEffect(() => {
    if (isTerminalProjectStatus(status)) {
      setValue("acceptingApplications", false);
    }
  }, [status, setValue]);

  const keptAttachmentCount =
    (project.attachments ?? []).filter(
      (a) => !pendingRemoveAttachmentIds.includes(a.id)
    ).length + newDocumentFiles.length;

  const handleDocumentsChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const incoming = Array.from(event.target.files ?? []);
    event.target.value = "";

    if (incoming.length === 0) {
      return;
    }

    const keptExisting = (project.attachments ?? []).filter(
      (a) => !pendingRemoveAttachmentIds.includes(a.id)
    ).length;
    const room =
      MAX_PROJECT_ATTACHMENTS - keptExisting - newDocumentFiles.length;

    if (incoming.length > room) {
      setDocumentsError(PROJECT_ATTACHMENTS_LIMIT_ERROR);

      return;
    }

    setDocumentsError(null);
    setNewDocumentFiles((current) => [...current, ...incoming]);
  };

  const removeNewDocumentAt = (index: number) => {
    setNewDocumentFiles((current) => current.filter((_, i) => i !== index));
    setDocumentsError(null);
  };

  const toggleRemoveExisting = (attachmentId: string) => {
    setPendingRemoveAttachmentIds((current) =>
      current.includes(attachmentId)
        ? current.filter((id) => id !== attachmentId)
        : [...current, attachmentId]
    );
    setDocumentsError(null);
  };

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    setSavedHint(null);
    setDocumentsError(null);

    try {
      const body = buildUpdateProjectFormData(values, {
        newFiles: newDocumentFiles,
        removeAttachmentIds: pendingRemoveAttachmentIds,
      });

      await updateProject({
        id: project.id,
        body,
      }).unwrap();
      setNewDocumentFiles([]);
      setPendingRemoveAttachmentIds([]);
      setDocumentsError(null);
      setSavedHint("Изменения сохранены");
    } catch (err: unknown) {
      setFormError(
        getApiErrorMessage(err as ApiError, "Не удалось сохранить проект")
      );
    }
  });

  const terminal = isTerminalProjectStatus(status);

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      aria-busy={isLoading}
      className="grid gap-6"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-base font-semibold leading-tight">
          Редактирование проекта
        </h2>
        <Button
          type="submit"
          disabled={isLoading}
          className="w-full shrink-0 sm:w-auto"
        >
          {isLoading ? "Сохранение…" : "Сохранить"}
        </Button>
      </div>

      {formError ? (
        <p
          className="w-full rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          role="alert"
        >
          {formError}
        </p>
      ) : null}

      {savedHint ? (
        <Item
          role="status"
          variant="outline"
          className="w-full border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
        >
          <ItemMedia variant="icon">
            <CircleCheck className="text-emerald-600 dark:text-emerald-400" />
          </ItemMedia>
          <ItemContent>
            <ItemDescription className="line-clamp-none text-emerald-700 dark:text-emerald-400">
              {savedHint}
            </ItemDescription>
          </ItemContent>
        </Item>
      ) : null}

      <FieldSet>
        <FieldLegend>Основное</FieldLegend>
        <FieldGroup>
          <Field data-invalid={!!errors.title}>
            <FieldLabel htmlFor="edit-project-title">
              Название <span className="text-destructive">*</span>
            </FieldLabel>
            <Input
              id="edit-project-title"
              autoComplete="off"
              maxLength={PROJECT_TITLE_MAX}
              aria-invalid={Boolean(errors.title)}
              {...register("title")}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Обязательно, до {PROJECT_TITLE_MAX} символов.
            </p>
            {errors.title?.message ? (
              <FieldError>{errors.title.message}</FieldError>
            ) : null}
          </Field>

          <Field data-invalid={!!errors.description} className="mt-4">
            <FieldLabel htmlFor="edit-project-description">
              Описание <span className="text-destructive">*</span>
            </FieldLabel>
            <Textarea
              id="edit-project-description"
              rows={6}
              maxLength={PROJECT_DESCRIPTION_MAX}
              className="min-h-[120px] resize-y"
              aria-invalid={Boolean(errors.description)}
              {...register("description")}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Обязательно, до {PROJECT_DESCRIPTION_MAX} символов.
            </p>
            {errors.description?.message ? (
              <FieldError>{errors.description.message}</FieldError>
            ) : null}
          </Field>

          <Field data-invalid={!!errors.goals} className="mt-4">
            <FieldLabel htmlFor="edit-project-goals">
              Цели <span className="text-destructive">*</span>
            </FieldLabel>
            <Textarea
              id="edit-project-goals"
              rows={4}
              maxLength={PROJECT_GOALS_MAX}
              className="min-h-[96px] resize-y"
              aria-invalid={Boolean(errors.goals)}
              {...register("goals")}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Обязательно, до {PROJECT_GOALS_MAX} символов.
            </p>
            {errors.goals?.message ? (
              <FieldError>{errors.goals.message}</FieldError>
            ) : null}
          </Field>

          <Field data-invalid={!!errors.status} className="mt-4">
            <FieldLabel htmlFor="edit-project-status">
              Статус проекта
            </FieldLabel>
            <Select
              value={status}
              onValueChange={(value) =>
                setValue("status", value as ProjectEditFormValues["status"], {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
              disabled={isLoading}
            >
              <SelectTrigger
                id="edit-project-status"
                className="h-9 w-full max-w-md"
                aria-invalid={Boolean(errors.status)}
              >
                <SelectValue placeholder="Выберите статус" />
              </SelectTrigger>
              <SelectContent>
                {PROJECT_STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.status?.message ? (
              <FieldError>{errors.status.message}</FieldError>
            ) : null}
          </Field>

          <Field orientation="horizontal" className="mt-4">
            <Checkbox
              id="edit-project-accepting"
              checked={acceptingApplicationsField.value}
              onCheckedChange={(checked) =>
                acceptingApplicationsField.onChange(checked === true)
              }
              disabled={terminal || isLoading}
            />
            <FieldContent className="grid gap-1.5 leading-none">
              <FieldLabel
                htmlFor="edit-project-accepting"
                className="cursor-pointer"
              >
                Принимаем заявки на участие
              </FieldLabel>
              {terminal ? (
                <p className="text-xs text-muted-foreground">
                  Для статусов «Выполнен» и «Закрыт» приём заявок всегда
                  выключен.
                </p>
              ) : null}
            </FieldContent>
          </Field>
        </FieldGroup>
      </FieldSet>

      <FieldSet>
        <FieldLegend>Документы проекта</FieldLegend>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="edit-project-documents">
              Добавить файлы (PDF или Word, всего не более{" "}
              {MAX_PROJECT_ATTACHMENTS})
            </FieldLabel>
            <Input
              id="edit-project-documents"
              type="file"
              multiple
              accept={PROJECT_DOCUMENT_ACCEPT}
              className="cursor-pointer"
              disabled={
                isLoading || keptAttachmentCount >= MAX_PROJECT_ATTACHMENTS
              }
              onChange={handleDocumentsChange}
            />
            <p className="mt-1 text-sm text-muted-foreground">
              Сейчас в проекте (с учётом изменений): {keptAttachmentCount} /{" "}
              {MAX_PROJECT_ATTACHMENTS}
            </p>
            {documentsError ? <FieldError>{documentsError}</FieldError> : null}
          </Field>
          {(project.attachments ?? []).length > 0 ? (
            <ul className="grid gap-1 text-sm">
              {(project.attachments ?? []).map((att) => {
                const marked = pendingRemoveAttachmentIds.includes(att.id);

                return (
                  <li
                    key={att.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-2 py-1.5"
                  >
                    <span
                      className={
                        marked
                          ? "min-w-0 truncate text-muted-foreground line-through"
                          : "min-w-0 truncate"
                      }
                    >
                      {att.originalName ?? att.filename}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="shrink-0"
                      disabled={isLoading}
                      onClick={() => toggleRemoveExisting(att.id)}
                    >
                      {marked ? "Вернуть" : "Убрать"}
                    </Button>
                  </li>
                );
              })}
            </ul>
          ) : null}
          {newDocumentFiles.length > 0 ? (
            <ul className="mt-2 grid gap-1 text-sm">
              {newDocumentFiles.map((file, index) => (
                <li
                  key={`${file.name}-${file.size}-${index}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-dashed px-2 py-1.5"
                >
                  <span className="min-w-0 truncate">Новый: {file.name}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="shrink-0"
                    disabled={isLoading}
                    onClick={() => removeNewDocumentAt(index)}
                  >
                    Убрать
                  </Button>
                </li>
              ))}
            </ul>
          ) : null}
        </FieldGroup>
      </FieldSet>

      <FieldSet className="pt-2">
        <FieldLegend className="text-base">Требуемые навыки</FieldLegend>
        <ProjectRequiredSkillsField
          control={control}
          seedSkills={project.requiredSkills}
          disabled={isLoading}
        />
      </FieldSet>
    </form>
  );
}

export function ProjectEditForm({ project }: ProjectEditFormProps) {
  return <ProjectEditFormBody key={project.id} project={project} />;
}
