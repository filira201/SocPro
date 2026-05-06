import { FileText, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { toAbsoluteUploadUrl } from "../lib/format";
import type { Attachment } from "../model/types";

type AttachmentListProps = {
  attachments: Attachment[];
};

export function AttachmentList({ attachments }: AttachmentListProps) {
  const [preview, setPreview] = useState<{ url: string; alt: string } | null>(
    null
  );

  useEffect(() => {
    if (!preview) {
      return undefined;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPreview(null);
      }
    };

    document.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [preview]);

  if (!attachments.length) {
    return null;
  }

  const modal =
    preview &&
    createPortal(
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Просмотр изображения"
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
        onClick={() => setPreview(null)}
      >
        <button
          type="button"
          className="absolute top-4 right-4 rounded-md bg-background/90 p-2 shadow-md hover:bg-background"
          aria-label="Закрыть"
          onClick={(event) => {
            event.stopPropagation();
            setPreview(null);
          }}
        >
          <X className="size-5" />
        </button>
        <img
          src={preview.url}
          alt={preview.alt}
          className="max-h-[90dvh] max-w-full object-contain"
          onClick={(event) => event.stopPropagation()}
        />
      </div>,
      document.body
    );

  return (
    <>
      <div className="grid gap-2 sm:grid-cols-2">
        {attachments.map((attachment) => {
          const url = toAbsoluteUploadUrl(attachment.url);

          if (attachment.kind === "image") {
            const alt = attachment.originalName || attachment.filename;

            return (
              <button
                key={attachment.id}
                type="button"
                className="overflow-hidden rounded-lg border bg-muted p-0 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={(event) => {
                  event.stopPropagation();
                  setPreview({ url, alt });
                }}
              >
                <img
                  src={url}
                  alt={alt}
                  className="aspect-video w-full object-cover"
                />
              </button>
            );
          }

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
      {modal}
    </>
  );
}
