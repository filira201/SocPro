import { format, isValid, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import { ChevronRight } from "lucide-react";
import { useState, type KeyboardEvent, type MouseEvent } from "react";
import { href, Link } from "react-router";

import {
  projectsApi,
  useAcceptProjectInvitationMutation,
  useApplyToProjectMutation,
  useCancelApplicationMutation,
} from "../api/projects.api";
import { projectApplicationMessageSchema } from "../model/project-application-message-schema";
import { PROJECT_APPLICATION_MESSAGE_MAX } from "../model/project-field-limits";
import type { ProjectDetail } from "../model/types";

import { displayPublicName } from "@/features/auth";
import { getApiErrorMessage, type ApiError } from "@/shared/lib/api-error";
import { useAppDispatch } from "@/shared/lib/redux";
import { ROUTES } from "@/shared/model/routes";
import { Badge } from "@/shared/ui/kit/badge";
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

function formatAt(iso: string | undefined) {
  if (!iso) {
    return "—";
  }

  const d = parseISO(iso);

  return isValid(d) ? format(d, "d MMM yyyy, HH:mm", { locale: ru }) : iso;
}

function isInsideInteractiveTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) {
    return false;
  }

  return Boolean(target.closest("a, button"));
}

function ApplyToProjectDialog({
  open,
  onOpenChange,
  message,
  onMessageChange,
  error,
  busy,
  applying,
  onApply,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  message: string;
  onMessageChange: (value: string) => void;
  error: string | null;
  busy: boolean;
  applying: boolean;
  onApply: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-4">
        <DialogHeader>
          <DialogTitle>Заявка на участие</DialogTitle>
          <DialogDescription>
            По желанию кратко расскажите, чем можете быть полезны проекту (до{" "}
            {PROJECT_APPLICATION_MESSAGE_MAX} символов; можно отправить без
            текста).
          </DialogDescription>
        </DialogHeader>
        <div className="-mx-4 max-h-[50vh] overflow-y-auto overflow-x-hidden overscroll-contain px-4">
          <Textarea
            value={message}
            onChange={(e) => onMessageChange(e.target.value)}
            placeholder="Сообщение для организаторов…"
            rows={4}
            maxLength={PROJECT_APPLICATION_MESSAGE_MAX}
            className="min-h-24 max-h-[42vh] resize-y wrap-break-word"
          />
          {error ? (
            <p className="mt-2 text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
        </div>
        <DialogFooter className="gap-3">
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            Отмена
          </Button>
          <Button
            type="button"
            size="lg"
            disabled={busy}
            onClick={() => onApply()}
          >
            {applying ? "Отправка…" : "Отправить"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type ProjectApplySectionProps = {
  project: ProjectDetail;
};

export function ProjectApplySection({ project }: ProjectApplySectionProps) {
  const dispatch = useAppDispatch();
  const [apply, { isLoading: applying }] = useApplyToProjectMutation();
  const [cancel, { isLoading: cancelling }] = useCancelApplicationMutation();
  const [acceptInvite, { isLoading: acceptingInvite }] =
    useAcceptProjectInvitationMutation();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [declineInviteOpen, setDeclineInviteOpen] = useState(false);
  const [inviteDetailOpen, setInviteDetailOpen] = useState(false);

  const busy = applying || cancelling || acceptingInvite;

  const handleApply = async () => {
    setError(null);

    const parsed = projectApplicationMessageSchema.safeParse(message);

    if (!parsed.success) {
      setError(
        parsed.error.issues[0]?.message ?? "Некорректное сообщение для заявки"
      );

      return;
    }

    try {
      await apply({
        projectId: project.id,
        body: { message: parsed.data || undefined },
      }).unwrap();
      setOpen(false);
      setMessage("");
      void dispatch(
        projectsApi.endpoints.getProjectById.initiate(project.id, {
          subscribe: false,
          forceRefetch: true,
        })
      );
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

  const handleDeclineInvite = async () => {
    const id = project.myApplication?.id;

    if (!id) {
      return;
    }

    setError(null);

    try {
      await cancel({ applicationId: id, projectId: project.id }).unwrap();
      setDeclineInviteOpen(false);
      setInviteDetailOpen(false);
      void dispatch(
        projectsApi.endpoints.getProjectById.initiate(project.id, {
          subscribe: false,
          forceRefetch: true,
        })
      );
    } catch (err: unknown) {
      setError(
        getApiErrorMessage(err as ApiError, "Не удалось отклонить приглашение")
      );
    }
  };

  const handleAcceptInvite = async () => {
    const id = project.myApplication?.id;

    if (!id) {
      return;
    }

    setError(null);

    try {
      await acceptInvite({
        applicationId: id,
        projectId: project.id,
      }).unwrap();
      setInviteDetailOpen(false);
      void dispatch(
        projectsApi.endpoints.getProjectById.initiate(project.id, {
          subscribe: false,
          forceRefetch: true,
        })
      );
    } catch (err: unknown) {
      setError(
        getApiErrorMessage(err as ApiError, "Не удалось принять приглашение")
      );
    }
  };

  const openInviteDetail = () => {
    setError(null);
    setInviteDetailOpen(true);
  };

  const handleInviteCardClick = (e: MouseEvent<HTMLDivElement>) => {
    if (isInsideInteractiveTarget(e.target)) {
      return;
    }

    openInviteDetail();
  };

  const handleInviteCardKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Enter" && e.key !== " ") {
      return;
    }

    if (isInsideInteractiveTarget(e.target)) {
      return;
    }

    e.preventDefault();
    openInviteDetail();
  };

  const my = project.myApplication;
  const isPendingInvitation = Boolean(
    my?.status === "PENDING" && (my.invitedById ?? my.invitedBy)
  );

  if (project.isMember) {
    return null;
  }

  if (my && my.status === "REJECTED") {
    return (
      <>
        <div className="rounded-lg border border-destructive/25 bg-destructive/5 p-4 text-sm">
          <p className="font-medium text-foreground">Заявка отклонена</p>
          {my.decidedBy ? (
            <p className="mt-1 text-muted-foreground">
              <span>Отклонил(а): </span>
              <Link
                to={href(ROUTES.USER_DETAILS, { userId: my.decidedBy.id })}
                className="font-medium text-foreground underline-offset-4 hover:underline"
              >
                {displayPublicName(my.decidedBy)}
              </Link>
            </p>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">
              Для этой записи не сохранено, кто принял решение.
            </p>
          )}
          {my.decidedAt ? (
            <p className="mt-1 text-xs text-muted-foreground">
              {formatAt(my.decidedAt)}
            </p>
          ) : null}
          {project.acceptingApplications ? (
            <>
              <p className="mt-2 text-xs text-muted-foreground">
                При необходимости вы можете подать заявку ещё раз.
              </p>
              <Button
                type="button"
                className="mt-3"
                onClick={() => {
                  setError(null);
                  setOpen(true);
                }}
              >
                Подать заявку снова
              </Button>
            </>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">
              Проект сейчас не принимает новые заявки.
            </p>
          )}
        </div>
        <ApplyToProjectDialog
          open={open}
          onOpenChange={setOpen}
          message={message}
          onMessageChange={setMessage}
          error={error}
          busy={busy}
          applying={applying}
          onApply={() => void handleApply()}
        />
      </>
    );
  }

  if (isPendingInvitation && my) {
    return (
      <div className="rounded-lg border bg-muted/40 p-4 text-sm">
        <div
          role="button"
          tabIndex={0}
          aria-label="Открыть приглашение в проект"
          className="group cursor-pointer rounded-md outline-offset-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          onClick={handleInviteCardClick}
          onKeyDown={handleInviteCardKeyDown}
        >
          <Badge
            variant="secondary"
            className="mb-2 w-fit px-2.5 py-1 text-xs font-normal"
          >
            Приглашение
          </Badge>
          <p className="font-medium">Вам отправлено приглашение</p>
          <p className="mt-1 text-muted-foreground">
            {my.invitedBy ? (
              <>
                <Link
                  to={href(ROUTES.USER_DETAILS, { userId: my.invitedBy.id })}
                  className="font-medium text-foreground underline-offset-4 hover:underline"
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                >
                  {displayPublicName(my.invitedBy)}
                </Link>
                {" пригласил(а) вас участвовать в проекте."}
              </>
            ) : (
              "Организаторы проекта пригласили вас участвовать."
            )}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Пока действует это приглашение, подать заявку на участие
            самостоятельно нельзя.
          </p>
          <div className="mt-3 flex items-center justify-between gap-2 text-xs font-medium text-muted-foreground group-hover:text-foreground">
            <span>Подробнее</span>
            <ChevronRight
              className="size-4 shrink-0 opacity-70 transition-transform group-hover:translate-x-0.5"
              aria-hidden
            />
          </div>
        </div>

        <Dialog
          open={inviteDetailOpen}
          onOpenChange={(next) => {
            setInviteDetailOpen(next);

            if (!next) {
              setError(null);
            }
          }}
        >
          <DialogContent className="max-w-md gap-4">
            <DialogHeader>
              <DialogTitle>Приглашение в проект</DialogTitle>
              <DialogDescription className="sr-only">
                Сообщение от пригласившего и действия принять или отклонить
              </DialogDescription>
            </DialogHeader>
            <div className="-mx-4 max-h-[50vh] overflow-y-auto overflow-x-hidden overscroll-contain px-4">
              <div className="grid gap-4 text-sm">
                <p className="text-lg font-semibold leading-snug">
                  {my.invitedBy ? (
                    <Link
                      to={href(ROUTES.USER_DETAILS, {
                        userId: my.invitedBy.id,
                      })}
                      className="underline-offset-4 hover:underline"
                    >
                      {displayPublicName(my.invitedBy)}
                    </Link>
                  ) : (
                    <span>Организатор проекта</span>
                  )}
                  <span className="block pt-1 text-base font-normal text-muted-foreground">
                    приглашает вас в проект «{project.title}».
                  </span>
                </p>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-sm text-muted-foreground">
                    Отправлено {formatAt(my.createdAt)}
                  </span>
                  <Badge
                    variant="outline"
                    className="shrink-0 px-2.5 py-1 text-xs font-normal sm:text-sm"
                  >
                    Ожидает ответа
                  </Badge>
                </div>
                {my.message?.trim() ? (
                  <div className="rounded-lg border bg-muted/40 p-3">
                    <p className="text-xs font-medium text-muted-foreground">
                      Сообщение к вам
                    </p>
                    <p className="mt-2 whitespace-pre-wrap wrap-break-word text-sm leading-normal text-foreground">
                      {my.message}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Сообщение не указано.
                  </p>
                )}
              </div>
            </div>
            {error ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
            <DialogFooter className="gap-3 border-t border-border/60 pt-4 sm:justify-end">
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="min-w-28"
                disabled={busy}
                onClick={() => {
                  setInviteDetailOpen(false);
                  setDeclineInviteOpen(true);
                }}
              >
                Отклонить
              </Button>
              <Button
                type="button"
                size="lg"
                className="min-w-28"
                disabled={busy}
                onClick={() => void handleAcceptInvite()}
              >
                {acceptingInvite ? "Принятие…" : "Принять"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={declineInviteOpen} onOpenChange={setDeclineInviteOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Отклонить приглашение?</DialogTitle>
              <DialogDescription>
                Приглашение будет снято. При необходимости вы сможете подать
                заявку сами, пока проект принимает участников.
              </DialogDescription>
            </DialogHeader>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <DialogFooter className="gap-3">
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => setDeclineInviteOpen(false)}
                disabled={busy}
              >
                Нет
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="lg"
                disabled={busy}
                onClick={() => void handleDeclineInvite()}
              >
                {cancelling ? "Отклонение…" : "Да, отклонить"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  if (!project.acceptingApplications) {
    return (
      <p className="text-sm text-muted-foreground">
        Проект сейчас не принимает заявки на участие.
      </p>
    );
  }

  if (my?.status === "PENDING" && !isPendingInvitation) {
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

      <ApplyToProjectDialog
        open={open}
        onOpenChange={setOpen}
        message={message}
        onMessageChange={setMessage}
        error={error}
        busy={busy}
        applying={applying}
        onApply={() => void handleApply()}
      />
    </div>
  );
}
