import { useState } from "react";

import {
  useApplyToProjectMutation,
  useCancelApplicationMutation,
} from "../api/projects.api";
import type { ProjectDetail } from "../model/types";

import { getApiErrorMessage, type ApiError } from "@/shared/lib/api-error";
import { Button } from "@/shared/ui/kit/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/kit/dialog";
import { Textarea } from "@/shared/ui/kit/textarea";

type ProjectApplySectionProps = {
  project: ProjectDetail;
};

export function ProjectApplySection({ project }: ProjectApplySectionProps) {
  const [apply, { isLoading: applying }] = useApplyToProjectMutation();
  const [cancel, { isLoading: cancelling }] = useCancelApplicationMutation();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);

  const busy = applying || cancelling;

  const handleApply = async () => {
    setError(null);

    try {
      await apply({
        projectId: project.id,
        body: { message: message.trim() || undefined },
      }).unwrap();
      setOpen(false);
      setMessage("");
    } catch (err: unknown) {
      setError(
        getApiErrorMessage(err as ApiError, "Не удалось отправить заявку")
      );
    }
  };

  const handleCancel = async () => {
    const id = project.myApplication?.id;

    if (!id) {
      return;
    }

    setError(null);

    try {
      await cancel({ applicationId: id, projectId: project.id }).unwrap();
      setCancelOpen(false);
    } catch (err: unknown) {
      setError(
        getApiErrorMessage(err as ApiError, "Не удалось отменить заявку")
      );
    }
  };

  const my = project.myApplication;

  if (project.isMember) {
    return null;
  }

  if (!project.acceptingApplications) {
    return (
      <p className="text-sm text-muted-foreground">
        Проект сейчас не принимает заявки на участие.
      </p>
    );
  }

  if (my?.status === "PENDING") {
    return (
      <div className="rounded-lg border bg-muted/40 p-4 text-sm">
        <p className="font-medium">Ваша заявка на рассмотрении</p>
        <p className="mt-1 text-muted-foreground">
          Владелец или администратор проекта ответит на заявку позже.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={() => setCancelOpen(true)}
        >
          Отозвать заявку
        </Button>

        <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Отозвать заявку?</DialogTitle>
              <DialogDescription>
                Заявку можно подать снова, пока проект принимает участников.
              </DialogDescription>
            </DialogHeader>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <DialogFooter className="gap-3">
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => setCancelOpen(false)}
                disabled={busy}
              >
                Нет
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="lg"
                disabled={busy}
                onClick={() => void handleCancel()}
              >
                {cancelling ? "Отзыв…" : "Да, отозвать"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  if (my?.status === "ACCEPTED") {
    return (
      <p className="text-sm text-muted-foreground">
        Заявка была принята. Обновите страницу, если вы уже в составе проекта.
      </p>
    );
  }

  return (
    <div className="rounded-lg border bg-muted/30 p-4">
      <p className="text-sm font-medium">Хотите участвовать в проекте?</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Подайте заявку — организаторы рассмотрят её и примут решение.
      </p>
      <Button
        type="button"
        className="mt-3"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
      >
        Подать заявку
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Заявка на участие</DialogTitle>
            <DialogDescription>
              Необязательно кратко расскажите, чем можете быть полезны проекту.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Сообщение для организаторов…"
            rows={4}
            className="resize-y"
          />
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <DialogFooter className="gap-3">
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => setOpen(false)}
              disabled={busy}
            >
              Отмена
            </Button>
            <Button
              type="button"
              size="lg"
              disabled={busy}
              onClick={() => void handleApply()}
            >
              {applying ? "Отправка…" : "Отправить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
