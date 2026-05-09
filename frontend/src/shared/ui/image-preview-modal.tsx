import { ChevronLeftIcon, ChevronRightIcon, X } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { cn } from "@/shared/lib/css";
import { Button } from "@/shared/ui/kit/button";

export type ImagePreviewSource = { src: string; alt: string };

type ImagePreviewModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  className?: string;
  /** Несколько кадров: стрелки на экране и клавиши ←/→, A/D */
  sources?: ImagePreviewSource[];
  /** С какого кадра открыть окно */
  initialIndex?: number;
  children?: ReactNode;
};

function GallerySlide({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center p-3 sm:p-6">
      <div className="flex max-h-full min-h-0 w-full max-w-5xl items-center justify-center overflow-hidden rounded-md border border-border/60 bg-muted/40">
        <img
          src={src}
          alt={alt}
          className="max-h-full min-h-0 w-full object-contain"
          decoding="async"
        />
      </div>
    </div>
  );
}

export function ImagePreviewModal({
  open,
  onOpenChange,
  title = "Просмотр изображений",
  className,
  sources,
  initialIndex = 0,
  children,
}: ImagePreviewModalProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const wasOpenRef = useRef(false);
  const sourcesRef = useRef(sources);

  useEffect(() => {
    sourcesRef.current = sources;
  }, [sources]);

  const slideCount = sources?.length ?? 0;
  const hasGallery = slideCount > 0;
  const canNavigate = slideCount > 1;

  useEffect(() => {
    if (open) {
      if (!wasOpenRef.current && hasGallery) {
        const max = slideCount - 1;
        setActiveIndex(Math.min(Math.max(0, initialIndex), max));
      }

      wasOpenRef.current = true;
    } else {
      wasOpenRef.current = false;
    }
  }, [open, initialIndex, hasGallery, slideCount]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onOpenChange(false);

        return;
      }

      const list = sourcesRef.current;

      if (!list || list.length <= 1) {
        return;
      }

      const n = list.length;
      const prev =
        event.key === "ArrowLeft" || event.key === "a" || event.key === "A";
      const next =
        event.key === "ArrowRight" || event.key === "d" || event.key === "D";

      if (prev) {
        event.preventDefault();
        setActiveIndex((i) => (i - 1 + n) % n);

        return;
      }

      if (next) {
        event.preventDefault();
        setActiveIndex((i) => (i + 1) % n);
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onOpenChange]);

  const goPrev = () => {
    const list = sourcesRef.current;

    if (!list?.length) {
      return;
    }

    const n = list.length;
    setActiveIndex((i) => (i - 1 + n) % n);
  };

  const goNext = () => {
    const list = sourcesRef.current;

    if (!list?.length) {
      return;
    }

    const n = list.length;
    setActiveIndex((i) => (i + 1) % n);
  };

  if (!open || typeof document === "undefined") {
    return null;
  }

  const safeIndex =
    hasGallery && slideCount > 0
      ? Math.min(Math.max(0, activeIndex), slideCount - 1)
      : 0;
  const current = hasGallery && sources ? sources[safeIndex] : null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/85 p-2 backdrop-blur-[2px] sm:p-4"
      onClick={() => onOpenChange(false)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "relative flex h-[min(84dvh,100vh-2rem)] w-[90vw] max-w-[1200px] flex-col overflow-hidden rounded-lg border border-border bg-background text-foreground shadow-xl",
          className
        )}
        onClick={(event) => event.stopPropagation()}
      >
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-3 top-3 z-40 border border-border/80 bg-background/70 shadow-sm transition-colors hover:bg-foreground/15 focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => onOpenChange(false)}
          aria-label="Закрыть просмотр изображений"
        >
          <X className="size-5" />
        </Button>

        {hasGallery && current ? (
          <>
            {canNavigate ? (
              <div className="pointer-events-none absolute left-4 top-4 z-30 rounded-md border border-border bg-background/80 px-2 py-1 text-xs font-medium text-foreground backdrop-blur-sm">
                {safeIndex + 1} / {slideCount}
              </div>
            ) : null}
            <div className="flex min-h-0 flex-1 flex-row items-stretch pt-12">
              {canNavigate ? (
                <div className="relative z-30 flex w-13 shrink-0 items-center justify-center sm:w-14">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-lg"
                    className="shrink-0 touch-manipulation rounded-full border-border bg-background/90 text-foreground shadow-md hover:bg-foreground/15 focus-visible:ring-2 focus-visible:ring-ring active:bg-foreground/20 sm:size-11"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      goPrev();
                    }}
                    aria-label="Предыдущее изображение"
                  >
                    <ChevronLeftIcon className="size-5" />
                  </Button>
                </div>
              ) : null}
              <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                <GallerySlide src={current.src} alt={current.alt} />
              </div>
              {canNavigate ? (
                <div className="relative z-30 flex w-13 shrink-0 items-center justify-center sm:w-14">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-lg"
                    className="shrink-0 touch-manipulation rounded-full border-border bg-background/90 text-foreground shadow-md hover:bg-foreground/15 focus-visible:ring-2 focus-visible:ring-ring active:bg-foreground/20 sm:size-11"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      goNext();
                    }}
                    aria-label="Следующее изображение"
                  >
                    <ChevronRightIcon className="size-5" />
                  </Button>
                </div>
              ) : null}
            </div>
          </>
        ) : (
          children
        )}
      </div>
    </div>,
    document.body
  );
}
