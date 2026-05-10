import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { href, useNavigate } from "react-router";

import { useCreateProjectMutation } from "../api/projects.api";
import {
  projectCreateSchema,
  type ProjectCreateFormValues,
} from "../model/project-create-schema";

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

    try {
      const project = await createProject({
        title: values.title,
        description: values.description,
        goals: values.goals,
        requiredSkillIds:
          values.requiredSkillIds.length > 0 ? values.requiredSkillIds : [],
      }).unwrap();

      navigate(href(ROUTES.PROJECT_DETAILS, { id: project.id }), {
        replace: true,
      });
    } catch (err: unknown) {
      setFormError(
        getApiErrorMessage(err as ApiError, "Не удалось создать проект")
      );
    }
  });

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
              aria-invalid={Boolean(errors.title)}
              {...register("title")}
            />
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
              className="min-h-[120px] resize-y"
              aria-invalid={Boolean(errors.description)}
              {...register("description")}
            />
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
              className="min-h-[96px] resize-y"
              aria-invalid={Boolean(errors.goals)}
              {...register("goals")}
            />
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

      <FieldSet className="pt-2">
        <FieldLegend className="text-base">Требуемые навыки</FieldLegend>
        <ProjectRequiredSkillsField control={control} disabled={isLoading} />
      </FieldSet>
    </form>
  );
}
