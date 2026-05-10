import type { FuseChoiceState } from "../model/use-profile-skills-field";

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

type FuseSkillConfirmDialogProps = {
  open: boolean;
  fuseChoice: FuseChoiceState | null;
  busy: boolean;
  disabled?: boolean;
  onOpenChange: (open: boolean) => void;
  onAccept: () => void;
  onOwn: () => void | Promise<void>;
};

export function FuseSkillConfirmDialog({
  open,
  fuseChoice,
  busy,
  disabled,
  onOpenChange,
  onAccept,
  onOwn,
}: FuseSkillConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        aria-busy={busy}
        showCloseButton={!busy}
        className="max-w-md"
      >
        {fuseChoice ? (
          <>
            <DialogHeader>
              <DialogTitle>Уточните навык</DialogTitle>
              <DialogDescription>
                Сервер предполагает, что вы могли иметь в виду «
                {fuseChoice.suggestion.name}». Вы ввели «{fuseChoice.userInput}
                ». Выберите вариант для сохранения в профиле.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex-col gap-2 sm:flex-col">
              <Button
                type="button"
                variant="default"
                className="w-full"
                disabled={disabled || busy}
                onClick={onAccept}
              >
                «{fuseChoice.suggestion.name}» (как предложено)
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                disabled={disabled || busy}
                onClick={() => void onOwn()}
              >
                {busy ? (
                  <>
                    <Spinner data-icon="inline-start" className="size-4" />
                    Создание…
                  </>
                ) : (
                  `«${fuseChoice.userInput}» (как вводили)`
                )}
              </Button>
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
