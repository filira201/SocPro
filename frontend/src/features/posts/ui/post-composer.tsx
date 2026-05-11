import { zodResolver } from "@hookform/resolvers/zod";
import { FileText, Image, X } from "lucide-react";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";

import { useCreatePostMutation } from "../api/posts.api";
import {
  MAX_POST_ATTACHMENTS,
  POST_ATTACHMENTS_LIMIT_ERROR,
} from "../lib/post-attachments";
import { postSchema, type PostFormValues } from "../model/schemas";

import { getApiErrorMessage } from "@/shared/lib/api-error";
import { Button } from "@/shared/ui/kit/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/shared/ui/kit/field";
import { Spinner } from "@/shared/ui/kit/spinner";
import { Textarea } from "@/shared/ui/kit/textarea";

type SelectedFile = {
  file: File;
  previewUrl: string | null;
};

export function PostComposer() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [files, setFiles] = useState<SelectedFile[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [filesLimitError, setFilesLimitError] = useState<string | null>(null);
  const [createPost, { isLoading }] = useCreatePostMutation();
  const {
    formState: { errors },
    handleSubmit,
    register,
    reset,
  } = useForm<PostFormValues>({
    resolver: zodResolver(postSchema),
    defaultValues: { content: "" },
  });

  const handleFilesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const raw = Array.from(event.target.files || []);
    event.target.value = "";

    if (raw.length === 0) {
      return;
    }

    setFiles((current) => {
      const room = MAX_POST_ATTACHMENTS - current.length;

      if (raw.length > room) {
        queueMicrotask(() => setFilesLimitError(POST_ATTACHMENTS_LIMIT_ERROR));

        return current;
      }

      queueMicrotask(() => setFilesLimitError(null));
      const incoming = raw.map((file) => ({
        file,
        previewUrl: file.type.startsWith("image/")
          ? URL.createObjectURL(file)
          : null,
      }));

      return [...current, ...incoming];
    });
  };

  const removeFile = (index: number) => {
    setFilesLimitError(null);
    setFiles((current) => {
      const file = current[index];

      if (file?.previewUrl) {
        URL.revokeObjectURL(file.previewUrl);
      }

      return current.filter((_, itemIndex) => itemIndex !== index);
    });
  };

  const onSubmit = async (values: PostFormValues) => {
    setFormError(null);
    setFilesLimitError(null);

    if (!values.content.trim() && files.length === 0) {
      setFormError("Добавьте текст или файл");

      return;
    }

    const body = new FormData();
    body.append("content", values.content);
    files.forEach(({ file }) => body.append("files", file));

    try {
      await createPost(body).unwrap();
      reset();
      files.forEach((file) => {
        if (file.previewUrl) {
          URL.revokeObjectURL(file.previewUrl);
        }
      });
      setFiles([]);
    } catch (err) {
      setFormError(
        getApiErrorMessage(
          err as Parameters<typeof getApiErrorMessage>[0],
          "Не удалось опубликовать пост"
        )
      );
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      aria-busy={isLoading}
      className="rounded-xl border bg-card p-3 shadow-sm sm:p-4"
      noValidate
    >
      <FieldGroup>
        <Field data-invalid={!!errors.content || !!formError}>
          <FieldLabel htmlFor="post-content">Новый пост</FieldLabel>
          <Textarea
            id="post-content"
            rows={4}
            placeholder="Что нового?"
            disabled={isLoading}
            className="min-h-28 resize-y text-base"
            aria-invalid={!!errors.content || !!formError}
            {...register("content")}
          />
          {errors.content?.message || formError ? (
            <FieldDescription role="alert" className="text-destructive">
              {errors.content?.message || formError}
            </FieldDescription>
          ) : null}
        </Field>

        {files.length ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {files.map((item, index) => (
              <div
                key={`${item.file.name}-${index}`}
                className="relative rounded-lg border p-2"
              >
                {item.previewUrl ? (
                  <img
                    src={item.previewUrl}
                    alt={item.file.name}
                    className="aspect-video w-full rounded-md object-cover"
                  />
                ) : (
                  <div className="flex items-center gap-2 text-sm">
                    <FileText className="size-4" />
                    <span className="min-w-0 truncate">{item.file.name}</span>
                  </div>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className="absolute right-1 top-1 bg-background/80"
                  onClick={() => removeFile(index)}
                >
                  <X />
                </Button>
              </div>
            ))}
          </div>
        ) : null}

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading || files.length >= MAX_POST_ATTACHMENTS}
            >
              <Image />
              Прикрепить файлы
            </Button>
            <p className="text-xs text-muted-foreground">
              Файлов: {files.length} / {MAX_POST_ATTACHMENTS}
            </p>
            {filesLimitError ? (
              <FieldError role="alert">{filesLimitError}</FieldError>
            ) : null}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            disabled={isLoading || files.length >= MAX_POST_ATTACHMENTS}
            onChange={handleFilesChange}
          />

          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                Публикуем...
                <Spinner data-icon="inline-end" />
              </>
            ) : (
              "Опубликовать"
            )}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
