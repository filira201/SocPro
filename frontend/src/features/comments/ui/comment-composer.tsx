import { zodResolver } from "@hookform/resolvers/zod";
import { FileText, Paperclip, X } from "lucide-react";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";

import { useCreateCommentMutation } from "../api/comments.api";
import { commentSchema, type CommentFormValues } from "../model/schemas";
import type { Comment } from "../model/types";

import { Button } from "@/shared/ui/kit/button";
import { FieldDescription } from "@/shared/ui/kit/field";
import { Spinner } from "@/shared/ui/kit/spinner";
import { Textarea } from "@/shared/ui/kit/textarea";

type CommentComposerProps = {
  postId: string;
  onCreated?: (comment: Comment) => void;
};

export function CommentComposer({ postId, onCreated }: CommentComposerProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [createComment, { isLoading }] = useCreateCommentMutation();
  const { handleSubmit, register, reset } = useForm<CommentFormValues>({
    resolver: zodResolver(commentSchema),
    defaultValues: { content: "" },
  });

  const onSubmit = async (values: CommentFormValues) => {
    setError(null);

    if (!values.content.trim() && files.length === 0) {
      setError("Добавьте текст или файл");

      return;
    }

    const body = new FormData();
    body.append("postId", postId);
    body.append("content", values.content);
    files.forEach((file) => body.append("files", file));

    try {
      const comment = await createComment(body).unwrap();
      reset();
      setFiles([]);
      onCreated?.(comment);
    } catch {
      setError("Не удалось отправить комментарий");
    }
  };

  const stopBubble = (event: React.SyntheticEvent) => {
    event.stopPropagation();
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      onClick={stopBubble}
      onKeyDown={stopBubble}
      className="grid gap-2"
      noValidate
    >
      <Textarea
        rows={2}
        placeholder="Напишите комментарий"
        disabled={isLoading}
        className="min-h-20 resize-y text-sm"
        {...register("content")}
      />

      {files.length ? (
        <div className="flex flex-wrap gap-2">
          {files.map((file, index) => (
            <span
              key={`${file.name}-${index}`}
              className="inline-flex max-w-full items-center gap-1 rounded-md border px-2 py-1 text-xs"
            >
              <FileText className="size-3" />
              <span className="truncate">{file.name}</span>
              <button
                type="button"
                onClick={() =>
                  setFiles((current) =>
                    current.filter((_, itemIndex) => itemIndex !== index)
                  )
                }
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      ) : null}

      {error ? (
        <FieldDescription role="alert" className="text-destructive">
          {error}
        </FieldDescription>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
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
            setFiles((current) => [
              ...current,
              ...Array.from(event.target.files || []),
            ]);
            event.target.value = "";
          }}
        />
        <Button type="submit" size="sm" disabled={isLoading}>
          {isLoading ? <Spinner data-icon="inline-end" /> : "Отправить"}
        </Button>
      </div>
    </form>
  );
}
