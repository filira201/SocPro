import { Check, X } from "lucide-react";

import { Button } from "@/shared/ui/kit/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/kit/dialog";
import { Spinner } from "@/shared/ui/kit/spinner";

type NotificationReadConfirmMode = "one" | "all";

const DESCRIPTIONS: Record<NotificationReadConfirmMode, string> = {
  one: "Уведомление будет прочитано и удалено без возможности восстановления.",
  all: "Все непрочитанные уведомления будут прочитаны и удалены без возможности восстановления.",
};

type NotificationReadConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: NotificationReadConfirmMode;
  onConfirm: () => void;
  isLoading: boolean;
};

export function NotificationReadConfirmDialog({
  open,
  onOpenChange,
  mode,
  onConfirm,
  isLoading,
}: NotificationReadConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        aria-busy={isLoading}
        showCloseButton={!isLoading}
        className="max-w-md"
      >
        <DialogHeader>
          <DialogTitle className="text-lg">Вы уверены?</DialogTitle>
          <DialogDescription className="text-base">
            {DESCRIPTIONS[mode]}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button
            size="lg"
            type="button"
            variant="default"
            className="w-full text-base"
            disabled={isLoading}
            onClick={() => onConfirm()}
          >
            {isLoading ? (
              <>
                <Spinner data-icon="inline-start" className="size-4" />
                Удаление…
              </>
            ) : (
              <>
                <Check
                  data-icon="inline-start"
                  className="size-4"
                  aria-hidden
                />
                Да
              </>
            )}
          </Button>
          <Button
            size="lg"
            type="button"
            variant="outline"
            className="w-full text-base"
            disabled={isLoading}
            onClick={() => onOpenChange(false)}
          >
            <X data-icon="inline-start" className="size-4" aria-hidden />
            Нет
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
