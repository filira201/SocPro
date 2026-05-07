import { FileText } from "lucide-react";
import { useEffect, useState } from "react";

import { toAbsoluteUploadUrl } from "../lib/format";
import type { Attachment } from "../model/types";

import { ImagePreviewModal } from "@/shared/ui/image-preview-modal";
import {
  type CarouselApi,
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/shared/ui/kit/carousel";

type AttachmentListProps = {
  attachments: Attachment[];
};

export function AttachmentList({ attachments }: AttachmentListProps) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [currentSlide, setCurrentSlide] = useState(1);
  const imageAttachments = attachments.filter(
    (attachment) => attachment.kind === "image"
  );
  const totalSlides = imageAttachments.length;

  useEffect(() => {
    if (!carouselApi || !isPreviewOpen) {
      return;
    }

    const updateCurrent = () => {
      setCurrentSlide(carouselApi.selectedScrollSnap() + 1);
    };

    carouselApi.scrollTo(previewIndex, true);
    updateCurrent();
    carouselApi.on("select", updateCurrent);
    carouselApi.on("reInit", updateCurrent);

    return () => {
      carouselApi.off("select", updateCurrent);
      carouselApi.off("reInit", updateCurrent);
    };
  }, [carouselApi, isPreviewOpen, previewIndex]);

  if (!attachments.length) {
    return null;
  }

  return (
    <>
      <div className="grid gap-2 sm:grid-cols-2">
        {attachments.map((attachment) => {
          const url = toAbsoluteUploadUrl(attachment.url);

          if (attachment.kind === "image") {
            const alt = attachment.originalName || attachment.filename;
            const index = imageAttachments.findIndex(
              (image) => image.id === attachment.id
            );

            return (
              <button
                key={attachment.id}
                type="button"
                className="overflow-hidden rounded-lg border bg-muted p-0 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={(event) => {
                  event.stopPropagation();
                  setPreviewIndex(Math.max(index, 0));
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
      <ImagePreviewModal
        open={isPreviewOpen}
        onOpenChange={setIsPreviewOpen}
        title="Просмотр изображений"
      >
        {totalSlides > 1 ? (
          <div className="absolute left-4 top-4 z-20 rounded-md border border-border bg-background/80 px-2 py-1 text-xs font-medium text-foreground backdrop-blur-sm">
            {currentSlide} / {totalSlides}
          </div>
        ) : null}
        <Carousel
          setApi={setCarouselApi}
          opts={{
            startIndex: previewIndex,
          }}
          className="h-full w-full"
        >
          <CarouselContent className="h-full">
            {imageAttachments.map((attachment) => {
              const imageUrl = toAbsoluteUploadUrl(attachment.url);
              const alt = attachment.originalName || attachment.filename;

              return (
                <CarouselItem key={attachment.id} className="h-full">
                  <div className="flex h-[78dvh] items-center justify-center p-4 sm:h-[82dvh] sm:p-6">
                    <div className="flex h-full w-full max-w-5xl items-center justify-center overflow-hidden rounded-md border border-border/60 bg-muted/40">
                      <img
                        src={imageUrl}
                        alt={alt}
                        className="h-full w-full object-contain"
                      />
                    </div>
                  </div>
                </CarouselItem>
              );
            })}
          </CarouselContent>
          {imageAttachments.length > 1 ? (
            <div className="pointer-events-none absolute inset-0 z-10">
              <CarouselPrevious
                size="icon-lg"
                className="pointer-events-auto left-4 top-1/2 z-20 -translate-y-1/2 border-border bg-background/85 text-foreground shadow-sm transition-colors hover:bg-foreground/15 sm:left-6"
              />
              <CarouselNext
                size="icon-lg"
                className="pointer-events-auto right-4 top-1/2 z-20 -translate-y-1/2 border-border bg-background/85 text-foreground shadow-sm transition-colors hover:bg-foreground/15 sm:right-6"
              />
            </div>
          ) : null}
        </Carousel>
      </ImagePreviewModal>
    </>
  );
}
