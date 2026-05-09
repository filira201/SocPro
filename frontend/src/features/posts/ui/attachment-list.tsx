import { FileText } from "lucide-react";
import { useState } from "react";

import { toAbsoluteUploadUrl } from "../lib/format";
import type { Attachment } from "../model/types";

import { ImagePreviewModal } from "@/shared/ui/image-preview-modal";

type AttachmentListProps = {
  attachments: Attachment[];
};

export function AttachmentList({ attachments }: AttachmentListProps) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);
  const imageAttachments = attachments.filter(
    (attachment) => attachment.kind === "image"
  );
  const documentAttachments = attachments.filter(
    (attachment) => attachment.kind !== "image"
  );

  if (!attachments.length) {
    return null;
  }

  return (
    <>
      {imageAttachments.length ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {imageAttachments.map((attachment, index) => {
            const url = toAbsoluteUploadUrl(attachment.url);
            const alt = attachment.originalName || attachment.filename;

            return (
              <button
                key={attachment.id}
                type="button"
                className="overflow-hidden rounded-lg border bg-muted p-0 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={(event) => {
                  event.stopPropagation();
                  setPreviewIndex(index);
                  setIsPreviewOpen(true);
                }}
              >
                <img
                  src={url}
                  alt={alt}
                  className="aspect-video w-full object-cover"
                />
              </button>
            );
          })}
        </div>
      ) : null}
      {documentAttachments.length ? (
        <div className="grid gap-2">
          {documentAttachments.map((attachment) => {
            const url = toAbsoluteUploadUrl(attachment.url);

            return (
              <a
                key={attachment.id}
                href={url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-muted"
                onClick={(event) => event.stopPropagation()}
              >
                <FileText className="size-4 shrink-0" />
                <span className="min-w-0 truncate">
                  {attachment.originalName || attachment.filename}
                </span>
              </a>
            );
          })}
        </div>
      ) : null}
      <ImagePreviewModal
        open={isPreviewOpen}
        onOpenChange={setIsPreviewOpen}
        title="Просмотр изображений"
        sources={imageAttachments.map((attachment) => ({
          src: toAbsoluteUploadUrl(attachment.url),
          alt: attachment.originalName || attachment.filename,
        }))}
        initialIndex={previewIndex}
      />
    </>
  );
}
