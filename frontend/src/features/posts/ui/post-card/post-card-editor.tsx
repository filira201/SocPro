import { FileText, Paperclip, X } from "lucide-react";
import { useRef } from "react";

import { toAbsoluteUploadUrl } from "../../lib/format";
import type { Attachment } from "../../model/types";

import type { SelectedFile } from "@/shared/lib/use-selected-files-preview";
import { Button } from "@/shared/ui/kit/button";
import { FieldError } from "@/shared/ui/kit/field";
import { Textarea } from "@/shared/ui/kit/textarea";

type PostCardEditorProps = {
  content: string;
  onContentChange: (value: string) => void;
  attachments: Attachment[];
  newFiles: SelectedFile[];
  onRemoveAttachment: (attachmentId: string) => void;
  onRemoveNewFile: (index: number) => void;
  onFilesChange: (files: FileList) => void;
  onCancel: () => void;
  onSave: () => void;
  isUpdating: boolean;
  saveError?: string | null;
  addFilesDisabled?: boolean;
  filesLimitError?: string | null;
  attachmentCountLabel?: string;
};

export function PostCardEditor({
  content,
  onContentChange,
  attachments,
  newFiles,
  onRemoveAttachment,
  onRemoveNewFile,
  onFilesChange,
  onCancel,
  onSave,
  isUpdating,
  saveError,
  addFilesDisabled = false,
  filesLimitError = null,
  attachmentCountLabel,
}: PostCardEditorProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className="grid gap-2">
      <Textarea
        value={content}
        onChange={(event) => onContentChange(event.target.value)}
        className="min-h-28 resize-y text-base"
      />
      {attachments.length ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {attachments.map((attachment) => {
            const url = toAbsoluteUploadUrl(attachment.url);

            if (attachment.kind === "image") {
              return (
                <div
                  key={attachment.id}
                  className="relative overflow-hidden rounded-lg border"
                >
                  <img
                    src={url}
                    alt={attachment.originalName || attachment.filename}
                    className="aspect-video w-full object-cover"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    className="absolute right-1 top-1 bg-background/80"
                    onClick={() => onRemoveAttachment(attachment.id)}
                  >
                    <X />
                  </Button>
                </div>
              );
            }

            return (
              <div
                key={attachment.id}
                className="relative rounded-lg border p-2"
              >
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="size-4 shrink-0" />
                  <span className="min-w-0 truncate">
                    {attachment.originalName || attachment.filename}
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className="absolute right-1 top-1 bg-background/80"
                  onClick={() => onRemoveAttachment(attachment.id)}
                >
                  <X />
                </Button>
              </div>
            );
          })}
        </div>
      ) : null}
      {newFiles.length ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {newFiles.map((item, index) => (
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
                onClick={() => onRemoveNewFile(index)}
              >
                <X />
              </Button>
            </div>
          ))}
        </div>
      ) : null}
      <div className="flex flex-col items-end gap-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isUpdating || addFilesDisabled}
          onClick={() => fileInputRef.current?.click()}
        >
          <Paperclip />
          Файлы
        </Button>
        {attachmentCountLabel ? (
          <p className="text-xs text-muted-foreground">
            {attachmentCountLabel}
          </p>
        ) : null}
        {filesLimitError ? (
          <FieldError role="alert" className="text-right">
            {filesLimitError}
          </FieldError>
        ) : null}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          disabled={isUpdating || addFilesDisabled}
          onChange={(event) => {
            const files = event.target.files;

            if (files?.length) {
              onFilesChange(files);
            }

            event.target.value = "";
          }}
        />
      </div>
      {saveError ? (
        <p
          className="text-right text-sm font-normal text-destructive"
          role="alert"
        >
          {saveError}
        </p>
      ) : null}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Отмена
        </Button>
        <Button type="button" onClick={onSave} disabled={isUpdating}>
          Сохранить
        </Button>
      </div>
    </div>
  );
}
