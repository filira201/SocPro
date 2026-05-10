import { Check, X } from "lucide-react";
import { useState } from "react";

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

type Step = "pick" | "confirm";

export function FuseSkillConfirmDialog({
  open,
  fuseChoice,
  busy,
  disabled,
  onOpenChange,
  onAccept,
  onOwn,
}: FuseSkillConfirmDialogProps) {
  const [step, setStep] = useState<Step>("pick");
  const [pendingAction, setPendingAction] = useState<"accept" | "own" | null>(
    null
  );

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setStep("pick");
      setPendingAction(null);
    }

    onOpenChange(nextOpen);
  };

  const handleConfirmYes = () => {
    if (pendingAction === "accept") {
      onAccept();
    } else if (pendingAction === "own") {
      void onOwn();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        aria-busy={busy}
        showCloseButton={!busy}
        className="max-w-md"
      >
        {fuseChoice && step === "pick" ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-lg">Уточните навык</DialogTitle>
              <DialogDescription className="text-base">
                Сервер предполагает, что вы могли иметь в виду{" "}
                <span className="font-medium text-foreground">
                  «{fuseChoice.suggestion.name}»
                </span>
                . Вы ввели{" "}
                <span className="font-medium text-foreground">
                  «{fuseChoice.userInput}»
                </span>
                . Выберите вариант для сохранения в профиле
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex-col gap-2 sm:flex-col">
              <Button
                size="lg"
                type="button"
                variant="default"
                className="w-full text-base"
                disabled={disabled || busy}
                onClick={() => {
                  setPendingAction("accept");
                  setStep("confirm");
                }}
              >
                «{fuseChoice.suggestion.name}» (как предложено)
              </Button>
              <Button
                size="lg"
                type="button"
                variant="outline"
                className="w-full text-base"
                disabled={disabled || busy}
                onClick={() => {
                  setPendingAction("own");
                  setStep("confirm");
                }}
              >
                «{fuseChoice.userInput}» (как вводили)
              </Button>
            </DialogFooter>
          </>
        ) : null}

        {fuseChoice && step === "confirm" ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-lg">Вы уверены?</DialogTitle>
              <DialogDescription className="text-base">
                {pendingAction === "accept" ? (
                  <>
                    Будет сохранён навык{" "}
                    <span className="font-medium text-foreground">
                      «{fuseChoice.suggestion.name}»
                    </span>{" "}
                    из каталога.
                  </>
                ) : (
                  <>
                    Будет создан и добавлен ваш вариант{" "}
                    <span className="font-medium text-foreground">
                      «{fuseChoice.userInput}»
                    </span>
                    .
                  </>
                )}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex-col gap-2 sm:flex-col">
              <Button
                size="lg"
                type="button"
                variant="default"
                className="w-full text-base"
                disabled={disabled || busy}
                onClick={handleConfirmYes}
              >
                {busy && pendingAction === "own" ? (
                  <>
                    <Spinner data-icon="inline-start" className="size-4" />
                    Создание…
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
                disabled={disabled || busy}
                onClick={() => {
                  setStep("pick");
                  setPendingAction(null);
                }}
              >
                <X data-icon="inline-start" className="size-4" aria-hidden />
                Нет
              </Button>
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
