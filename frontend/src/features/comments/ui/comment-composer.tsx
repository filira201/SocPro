import { zodResolver } from "@hookform/resolvers/zod";
import { FileText, Paperclip, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router";
import { z } from "zod";

import { useCreateCommentMutation } from "../api/comments.api";
import {
  MAX_COMMENT_LENGTH,
  type CommentBodyFormValues,
} from "../model/schemas";
import type { Comment } from "../model/types";

import { ROUTES } from "@/shared/model/routes";
import { Button } from "@/shared/ui/kit/button";
import { FieldError } from "@/shared/ui/kit/field";
import { Spinner } from "@/shared/ui/kit/spinner";
import { Textarea } from "@/shared/ui/kit/textarea";

type CommentComposerProps = {
  postId: string;
  parentId?: string | null;
  replyToUserId?: string | null;
  replyToUsername?: string | null;
  onCreated?: (comment: Comment) => void;
  onCancelReply?: () => void;
};

type SelectedFile = {
  file: File;
  previewUrl: string | null;
};

export function CommentComposer({
  postId,
  parentId,
  replyToUserId,
  replyToUsername,
  onCreated,
  onCancelReply,
}: CommentComposerProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const filesRef = useRef<SelectedFile[]>([]);
  const [files, setFiles] = useState<SelectedFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [createComment, { isLoading }] = useCreateCommentMutation();

  const replyPrefixPlain =
    replyToUsername && parentId ? `@${replyToUsername}, ` : "";

  const schema = useMemo(() => {
    const maxBody = Math.max(0, MAX_COMMENT_LENGTH - replyPrefixPlain.length);

    return z.object({
      body: z.string().max(maxBody, "Максимум 2000 символов"),
    });
  }, [replyPrefixPlain]);

  const { handleSubmit, register, reset } = useForm<CommentBodyFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { body: "" },
  });

  const onSubmit = async (values: CommentBodyFormValues) => {
    setError(null);

    const trimmedBody = values.body.trim();
    const payloadText = replyPrefixPlain
      ? `${replyPrefixPlain}${trimmedBody}`
      : trimmedBody;

    if (replyPrefixPlain && !trimmedBody && files.length === 0) {
      setError("Добавьте текст или файл после упоминания");

      return;
    }

    if (!replyPrefixPlain && !payloadText && files.length === 0) {
      setError("Добавьте текст или файл");

      return;
    }

    const body = new FormData();
    body.append("postId", postId);
    body.append("content", payloadText);

    if (parentId) {
      body.append("parentId", parentId);
    }

    files.forEach(({ file }) => body.append("files", file));

    try {
      const comment = await createComment(body).unwrap();
      reset();
      files.forEach((item) => {
        if (item.previewUrl) {
          URL.revokeObjectURL(item.previewUrl);
        }
      });
      setFiles([]);
      onCreated?.(comment);

      if (parentId) {
        onCancelReply?.();
      }
    } catch {
      setError("Не удалось отправить комментарий");
    }
  };

  const stopBubble = (event: React.SyntheticEvent) => {
    event.stopPropagation();
  };

  const removeFile = (index: number) => {
    setFiles((current) => {
      const target = current[index];

      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }

      return current.filter((_, itemIndex) => itemIndex !== index);
    });
  };

  useEffect(() => {
    filesRef.current = files;
  }, [files]);

  useEffect(() => {
    return () => {
      filesRef.current.forEach((item) => {
        if (item.previewUrl) {
          URL.revokeObjectURL(item.previewUrl);
        }
      });
    };
  }, []);

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      onClick={stopBubble}
      onKeyDown={stopBubble}
      className="grid gap-2"
      noValidate
    >
      {replyToUsername && replyToUserId && parentId ? (
        <div className="flex flex-wrap items-baseline gap-1 text-sm">
          <Link
            to={ROUTES.USER_DETAILS.replace(":userId", replyToUserId)}
            className="font-medium text-sky-600 hover:underline dark:text-sky-400"
          >
            @{replyToUsername}
          </Link>
          <span className="text-muted-foreground">, </span>
        </div>
      ) : null}

      <Textarea
        rows={2}
        placeholder="Напишите комментарий"
        disabled={isLoading}
        className="min-h-20 resize-y text-sm"
        {...register("body")}
      />

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
                  <FileText className="size-4 shrink-0" />
                  <span className="min-w-0 truncate">{item.file.name}</span>
                </div>
              )}
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className="absolute right-1 top-1 bg-background/80"
                aria-label="Убрать файл"
                onClick={() => removeFile(index)}
              >
                <X />
              </Button>
            </div>
          ))}
        </div>
      ) : null}

      {error ? (
        <FieldError role="alert" className="text-destructive">
          {error}
        </FieldError>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        {parentId ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isLoading}
            onClick={onCancelReply}
          >
            Отмена
          </Button>
        ) : null}
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isLoading}
          onClick={() => inputRef.current?.click()}
        >
          <Paperclip />
          Файлы
        </Button>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(event) => {
            const selected = Array.from(event.target.files || []).map(
              (file) => ({
                file,
                previewUrl: file.type.startsWith("image/")
                  ? URL.createObjectURL(file)
                  : null,
              })
            );
            setFiles((current) => [...current, ...selected]);
            event.target.value = "";
          }}
        />
        <Button type="submit" size="sm" disabled={isLoading}>
          {isLoading ? (
            <Spinner data-icon="inline-end" />
          ) : parentId ? (
            "Ответить"
          ) : (
            "Отправить"
          )}
        </Button>
      </div>
    </form>
  );
}
