import { Check, X } from "lucide-react";
import { useState } from "react";

import type { FuseChoiceState } from "../model/use-skill-ids-field";

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

export type FuseSkillContext = "profile" | "project";

const FUSE_CHOICE_INSTRUCTION: Record<FuseSkillContext, string> = {
  profile: "Выберите вариант для сохранения в профиль.",
  project: "Выберите вариант для добавления в требуемые навыки проекта.",
};

type FuseSkillConfirmDialogProps = {
  open: boolean;
  fuseChoice: FuseChoiceState | null;
  busy: boolean;
  disabled?: boolean;
  onOpenChange: (open: boolean) => void;
  onAccept: () => void;
  onOwn: () => void | Promise<void>;
  /** Куда попадёт выбранный навык — влияет на текст подсказки */
  context?: FuseSkillContext;
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
  context = "profile",
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

  const choiceInstruction = FUSE_CHOICE_INSTRUCTION[context];

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
                . {choiceInstruction}
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
