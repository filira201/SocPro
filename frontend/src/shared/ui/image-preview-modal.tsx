import { X } from "lucide-react";
import { type ReactNode, useEffect } from "react";
import { createPortal } from "react-dom";

import { cn } from "@/shared/lib/css";
import { Button } from "@/shared/ui/kit/button";

type ImagePreviewModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  className?: string;
  children: ReactNode;
};

export function ImagePreviewModal({
  open,
  onOpenChange,
  title = "Просмотр изображений",
  className,
  children,
}: ImagePreviewModalProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onOpenChange(false);
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

  if (!open || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/85 p-2 backdrop-blur-sm sm:p-4"
      onClick={() => onOpenChange(false)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "relative h-[84dvh] w-[90vw] max-w-[1200px] overflow-hidden rounded-lg border border-border bg-background text-foreground shadow-xl",
          className
        )}
        onClick={(event) => event.stopPropagation()}
      >
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-3 top-3 z-30 border border-border/80 bg-background/70 shadow-sm transition-colors hover:bg-foreground/15 focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => onOpenChange(false)}
          aria-label="Закрыть просмотр изображений"
        >
          <X className="size-5" />
        </Button>
        {children}
      </div>
    </div>,
    document.body
  );
}
