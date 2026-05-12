import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { href, useNavigate } from "react-router";

import { useCreateProjectMutation } from "../api/projects.api";
import { buildCreateProjectFormData } from "../lib/build-project-form-data";
import {
  MAX_PROJECT_ATTACHMENTS,
  PROJECT_ATTACHMENTS_LIMIT_ERROR,
  PROJECT_DOCUMENT_ACCEPT,
} from "../lib/project-attachments";
import {
  projectCreateSchema,
  type ProjectCreateFormValues,
} from "../model/project-create-schema";
import {
  PROJECT_DESCRIPTION_MAX,
  PROJECT_GOALS_MAX,
  PROJECT_TITLE_MAX,
} from "../model/project-field-limits";

import { ProjectRequiredSkillsField } from "./project-required-skills-field";

import { getApiErrorMessage, type ApiError } from "@/shared/lib/api-error";
import { ROUTES } from "@/shared/model/routes";
import { Button } from "@/shared/ui/kit/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/shared/ui/kit/field";
import { Input } from "@/shared/ui/kit/input";
import { Textarea } from "@/shared/ui/kit/textarea";

type ProjectCreateFormProps = {
  onCancel: () => void;
};

export function ProjectCreateForm({ onCancel }: ProjectCreateFormProps) {
  const navigate = useNavigate();
  const [createProject, { isLoading }] = useCreateProjectMutation();
  const [formError, setFormError] = useState<string | null>(null);
  const [documentFiles, setDocumentFiles] = useState<File[]>([]);
  const [documentsError, setDocumentsError] = useState<string | null>(null);
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ProjectCreateFormValues>({
    resolver: zodResolver(projectCreateSchema),
    mode: "onSubmit",
    defaultValues: {
      title: "",
      description: "",
      goals: "",
      requiredSkillIds: [],
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    setDocumentsError(null);

    try {
      const formData = buildCreateProjectFormData(
        {
          title: values.title,
          description: values.description,
          goals: values.goals,
          requiredSkillIds:
            values.requiredSkillIds.length > 0 ? values.requiredSkillIds : [],
        },
        documentFiles
      );

      const project = await createProject(formData).unwrap();

      navigate(href(ROUTES.PROJECT_DETAILS, { id: project.id }), {
        replace: true,
      });
    } catch (err: unknown) {
      setFormError(
        getApiErrorMessage(err as ApiError, "Не удалось создать проект")
      );
    }
  });

  const handleDocumentsChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const incoming = Array.from(event.target.files ?? []);
    event.target.value = "";

    if (incoming.length === 0) {
      return;
    }

    const room = MAX_PROJECT_ATTACHMENTS - documentFiles.length;

    if (incoming.length > room) {
      setDocumentsError(PROJECT_ATTACHMENTS_LIMIT_ERROR);

      return;
    }

    setDocumentsError(null);
    setDocumentFiles((current) => [...current, ...incoming]);
  };

  const removeDocumentAt = (index: number) => {
    setDocumentFiles((current) => current.filter((_, i) => i !== index));
    setDocumentsError(null);
  };

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      aria-busy={isLoading}
      className="mt-6 grid gap-6 rounded-xl border bg-card p-4 sm:p-6"
    >
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Отмена
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Создание…" : "Создать проект"}
        </Button>
      </div>

      {formError ? (
        <p
          className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          role="alert"
        >
          {formError}
        </p>
      ) : null}

      <FieldSet>
        <FieldLegend>Основное</FieldLegend>
        <FieldGroup>
          <Field data-invalid={!!errors.title}>
            <FieldLabel htmlFor="project-title">
              Название <span className="text-destructive">*</span>
            </FieldLabel>
            <Input
              id="project-title"
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
            <FieldLabel htmlFor="project-description">
              Описание <span className="text-destructive">*</span>
            </FieldLabel>
            <Textarea
              id="project-description"
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
            <FieldLabel htmlFor="project-goals">
              Цели <span className="text-destructive">*</span>
            </FieldLabel>
            <Textarea
              id="project-goals"
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

          <p className="mt-4 max-w-xl text-xs text-muted-foreground">
            Статус по умолчанию — открытый проект с приёмом заявок; изменить их
            можно будет позже в карточке проекта.
          </p>
        </FieldGroup>
      </FieldSet>

      <FieldSet>
        <FieldLegend>Документы проекта</FieldLegend>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="project-documents">
              Файлы (PDF или Word, не более {MAX_PROJECT_ATTACHMENTS})
            </FieldLabel>
            <Input
              id="project-documents"
              type="file"
              multiple
              accept={PROJECT_DOCUMENT_ACCEPT}
              className="cursor-pointer"
              disabled={
                isLoading || documentFiles.length >= MAX_PROJECT_ATTACHMENTS
              }
              onChange={handleDocumentsChange}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Выбрано: {documentFiles.length} / {MAX_PROJECT_ATTACHMENTS}
            </p>
            {documentsError ? <FieldError>{documentsError}</FieldError> : null}
          </Field>
          {documentFiles.length > 0 ? (
            <ul className="mt-2 grid gap-1 text-sm">
              {documentFiles.map((file, index) => (
                <li
                  key={`${file.name}-${file.size}-${index}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-2 py-1.5"
                >
                  <span className="min-w-0 truncate">{file.name}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="shrink-0"
                    disabled={isLoading}
                    onClick={() => removeDocumentAt(index)}
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
        <ProjectRequiredSkillsField control={control} disabled={isLoading} />
      </FieldSet>
    </form>
  );
}
