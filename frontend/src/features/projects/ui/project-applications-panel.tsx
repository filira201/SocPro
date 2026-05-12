import { format, isValid, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import { ChevronRight } from "lucide-react";
import { useState, type KeyboardEvent, type MouseEvent } from "react";
import { href, Link } from "react-router";

import {
  useCancelApplicationMutation,
  useDecideApplicationMutation,
} from "../api/projects.api";
import type { ProjectApplication } from "../model/types";

import { displayPublicName } from "@/features/auth";
import { getApiErrorMessage, type ApiError } from "@/shared/lib/api-error";
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

function applicationStatusLabel(status: string) {
  switch (status) {
    case "PENDING":
      return "Ожидает";
    case "ACCEPTED":
      return "Принята";
    case "REJECTED":
      return "Отклонена";

    default:
      return status;
  }
}

/** Заявка создана владельцем/админом как приглашение (не самоподача соискателя). */
function isOrganizerInvitation(app: ProjectApplication): boolean {
  return Boolean(app.invitedById ?? app.invitedBy);
}

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

type ProjectApplicationsPanelProps = {
  projectId: string;
  applications: ProjectApplication[];
};

export function ProjectApplicationsPanel({
  projectId,
  applications,
}: ProjectApplicationsPanelProps) {
  const [decide, { isLoading: deciding }] = useDecideApplicationMutation();
  const [cancel, { isLoading: cancellingInvite }] =
    useCancelApplicationMutation();
  const [error, setError] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<ProjectApplication | null>(
    null
  );
  const [withdrawInviteTarget, setWithdrawInviteTarget] =
    useState<ProjectApplication | null>(null);
  const [detailApp, setDetailApp] = useState<ProjectApplication | null>(null);

  const busy = deciding || cancellingInvite;

  const handleDecide = async (
    app: ProjectApplication,
    status: "ACCEPTED" | "REJECTED",
    options?: { onSuccess?: () => void }
  ) => {
    setError(null);

    try {
      await decide({
        applicationId: app.id,
        projectId,
        status,
      }).unwrap();

      if (status === "REJECTED") {
        setRejectTarget(null);
      }

      if (detailApp?.id === app.id) {
        setDetailApp(null);
      }

      options?.onSuccess?.();
    } catch (err: unknown) {
      setError(
        getApiErrorMessage(err as ApiError, "Не удалось обработать заявку")
      );
    }
  };

  const handleWithdrawInvite = async (app: ProjectApplication) => {
    setError(null);

    try {
      await cancel({
        applicationId: app.id,
        projectId,
      }).unwrap();

      setWithdrawInviteTarget(null);

      if (detailApp?.id === app.id) {
        setDetailApp(null);
      }
    } catch (err: unknown) {
      setError(
        getApiErrorMessage(err as ApiError, "Не удалось отозвать приглашение")
      );
    }
  };

  const openApplicationDetail = (app: ProjectApplication) => {
    setDetailApp(app);
  };

  const handleCardClick = (
    app: ProjectApplication,
    e: MouseEvent<HTMLLIElement>
  ) => {
    if (isInsideInteractiveTarget(e.target)) {
      return;
    }

    openApplicationDetail(app);
  };

  const handleCardKeyDown = (
    app: ProjectApplication,
    e: KeyboardEvent<HTMLLIElement>
  ) => {
    if (e.key !== "Enter" && e.key !== " ") {
      return;
    }

    if (isInsideInteractiveTarget(e.target)) {
      return;
    }

    e.preventDefault();
    openApplicationDetail(app);
  };

  if (!applications.length) {
    return <p className="text-sm text-muted-foreground">Заявок пока нет.</p>;
  }

  return (
    <div className="grid gap-4">
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <ul className="grid gap-3">
        {applications.map((app) => {
          const isPending = app.status === "PENDING";
          const invitation = isOrganizerInvitation(app);
          const inviterName = app.invitedBy
            ? displayPublicName(app.invitedBy)
            : "Организатор проекта";
          const ariaLabel = invitation
            ? `Открыть приглашение: ${inviterName} — ${displayPublicName(app.applicant)}`
            : `Открыть заявку: ${displayPublicName(app.applicant)}`;

          return (
            <li
              key={app.id}
              role="button"
              tabIndex={0}
              aria-label={ariaLabel}
              className="group cursor-pointer rounded-lg border border-border bg-card/50 p-4 shadow-sm transition-colors duration-150 hover:border-primary/35 hover:bg-muted/45 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:bg-muted/60"
              onClick={(e) => handleCardClick(app, e)}
              onKeyDown={(e) => handleCardKeyDown(app, e)}
            >
              <div className="grid gap-3 text-sm">
                {invitation ? (
                  <>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 space-y-2">
                        <Badge
                          variant="secondary"
                          className="px-2.5 py-1 text-xs font-normal"
                        >
                          Приглашение
                        </Badge>
                        <p className="text-base font-semibold leading-snug sm:text-lg">
                          {app.invitedBy ? (
                            <Link
                              to={href(ROUTES.USER_DETAILS, {
                                userId: app.invitedBy.id,
                              })}
                              className="underline-offset-4 hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {displayPublicName(app.invitedBy)}
                            </Link>
                          ) : (
                            <span>{inviterName}</span>
                          )}
                          <span className="text-muted-foreground"> → </span>
                          <Link
                            to={href(ROUTES.USER_DETAILS, {
                              userId: app.applicant.id,
                            })}
                            className="underline-offset-4 hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {displayPublicName(app.applicant)}
                          </Link>
                        </p>
                      </div>
                      {!isPending ? (
                        <Badge
                          variant="outline"
                          className="shrink-0 px-2.5 py-1 text-xs font-normal sm:text-sm"
                        >
                          {applicationStatusLabel(app.status)}
                        </Badge>
                      ) : null}
                    </div>
                  </>
                ) : (
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <Link
                      to={href(ROUTES.USER_DETAILS, {
                        userId: app.applicant.id,
                      })}
                      className="min-w-0 text-base font-semibold leading-tight underline-offset-4 hover:underline sm:text-lg"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {displayPublicName(app.applicant)}
                    </Link>
                    {!isPending ? (
                      <Badge
                        variant="outline"
                        className="shrink-0 px-2.5 py-1 text-xs font-normal sm:text-sm"
                      >
                        {applicationStatusLabel(app.status)}
                      </Badge>
                    ) : null}
                  </div>
                )}

                {isPending ? (
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="text-sm text-muted-foreground">
                      {invitation ? "Отправлено" : "Подана"}{" "}
                      {formatAt(app.createdAt)}
                    </span>
                    <Badge
                      variant="outline"
                      className="shrink-0 px-2.5 py-1 text-xs font-normal sm:text-sm"
                    >
                      {invitation
                        ? "Ожидает ответа"
                        : applicationStatusLabel(app.status)}
                    </Badge>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">
                      {invitation ? "Отправлено" : "Подана"}{" "}
                      {formatAt(app.createdAt)}
                    </p>
                    {app.decidedAt ? (
                      <p className="text-base font-medium text-foreground">
                        Решение {formatAt(app.decidedAt)}
                      </p>
                    ) : null}
                  </>
                )}

                <div className="flex items-center justify-end gap-1 text-xs text-muted-foreground transition-colors group-hover:text-foreground">
                  <span>Подробнее</span>
                  <ChevronRight
                    className="size-3.5 shrink-0 opacity-70 transition-opacity group-hover:opacity-100"
                    aria-hidden
                  />
                </div>

                {isPending ? (
                  invitation ? (
                    <div className="flex flex-wrap gap-2 border-t border-border/60 pt-3">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={(e) => {
                          e.stopPropagation();
                          setWithdrawInviteTarget(app);
                        }}
                      >
                        Отозвать
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2 border-t border-border/60 pt-3">
                      <Button
                        type="button"
                        size="sm"
                        disabled={busy}
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleDecide(app, "ACCEPTED");
                        }}
                      >
                        Принять
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={(e) => {
                          e.stopPropagation();
                          setRejectTarget(app);
                        }}
                      >
                        Отклонить
                      </Button>
                    </div>
                  )
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>

      <Dialog
        open={detailApp !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDetailApp(null);
          }
        }}
      >
        <DialogContent className="max-w-md gap-4">
          {detailApp
            ? (() => {
                const detailInvitation = isOrganizerInvitation(detailApp);
                const detailInviterName = detailApp.invitedBy
                  ? displayPublicName(detailApp.invitedBy)
                  : "Организатор проекта";

                return (
                  <>
                    <DialogHeader>
                      <DialogTitle>
                        {detailInvitation ? "Приглашение" : "Заявка"}
                      </DialogTitle>
                      <DialogDescription className="sr-only">
                        {detailInvitation
                          ? "Кто пригласил и сообщение к приглашённому"
                          : "Подробности заявки и сообщение заявителя"}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="-mx-4 max-h-[50vh] overflow-y-auto overflow-x-hidden overscroll-contain px-4">
                      <div className="grid gap-4 text-sm">
                        {detailInvitation ? (
                          <>
                            <Badge
                              variant="secondary"
                              className="w-fit px-2.5 py-1 text-xs font-normal"
                            >
                              Приглашение
                            </Badge>
                            <p className="text-lg font-semibold leading-snug">
                              {detailApp.invitedBy ? (
                                <Link
                                  to={href(ROUTES.USER_DETAILS, {
                                    userId: detailApp.invitedBy.id,
                                  })}
                                  className="underline-offset-4 hover:underline"
                                >
                                  {displayPublicName(detailApp.invitedBy)}
                                </Link>
                              ) : (
                                <span>{detailInviterName}</span>
                              )}
                              <span className="text-muted-foreground"> → </span>
                              <Link
                                to={href(ROUTES.USER_DETAILS, {
                                  userId: detailApp.applicant.id,
                                })}
                                className="underline-offset-4 hover:underline"
                              >
                                {displayPublicName(detailApp.applicant)}
                              </Link>
                            </p>
                            {detailApp.status !== "PENDING" ? (
                              <Badge
                                variant="outline"
                                className="w-fit px-2.5 py-1 text-xs font-normal sm:text-sm"
                              >
                                {applicationStatusLabel(detailApp.status)}
                              </Badge>
                            ) : null}
                          </>
                        ) : (
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <p className="text-lg font-semibold leading-tight">
                              {displayPublicName(detailApp.applicant)}
                            </p>
                            {detailApp.status !== "PENDING" ? (
                              <Badge
                                variant="outline"
                                className="shrink-0 px-2.5 py-1 text-xs font-normal sm:text-sm"
                              >
                                {applicationStatusLabel(detailApp.status)}
                              </Badge>
                            ) : null}
                          </div>
                        )}

                        {detailApp.status === "PENDING" ? (
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <span className="text-sm text-muted-foreground">
                              {detailInvitation ? "Отправлено" : "Подана"}{" "}
                              {formatAt(detailApp.createdAt)}
                            </span>
                            <Badge
                              variant="outline"
                              className="shrink-0 px-2.5 py-1 text-xs font-normal sm:text-sm"
                            >
                              {detailInvitation
                                ? "Ожидает ответа"
                                : applicationStatusLabel(detailApp.status)}
                            </Badge>
                          </div>
                        ) : (
                          <>
                            <p className="text-sm text-muted-foreground">
                              {detailInvitation ? "Отправлено" : "Подана"}{" "}
                              {formatAt(detailApp.createdAt)}
                            </p>
                            {detailApp.decidedAt ? (
                              <p className="text-base font-medium text-foreground">
                                Решение {formatAt(detailApp.decidedAt)}
                              </p>
                            ) : null}
                          </>
                        )}

                        {detailApp.message?.trim() ? (
                          <div className="rounded-lg border bg-muted/40 p-3">
                            <p className="text-xs font-medium text-muted-foreground">
                              {detailInvitation
                                ? "Сообщение к приглашённому"
                                : "Сообщение заявителя"}
                            </p>
                            <p className="mt-2 whitespace-pre-wrap wrap-break-word text-sm leading-normal text-foreground">
                              {detailApp.message}
                            </p>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            Сообщение не указано.
                          </p>
                        )}
                      </div>
                    </div>

                    {detailApp.status === "PENDING" ? (
                      <DialogFooter className="gap-3 border-t border-border/60 pt-4 sm:justify-end">
                        {detailInvitation ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="lg"
                            className="min-w-28"
                            disabled={busy}
                            onClick={() => {
                              setWithdrawInviteTarget(detailApp);
                              setDetailApp(null);
                            }}
                          >
                            Отозвать
                          </Button>
                        ) : (
                          <>
                            <Button
                              type="button"
                              variant="outline"
                              size="lg"
                              className="min-w-28"
                              disabled={busy}
                              onClick={() => {
                                setRejectTarget(detailApp);
                                setDetailApp(null);
                              }}
                            >
                              Отклонить
                            </Button>
                            <Button
                              type="button"
                              size="lg"
                              className="min-w-28"
                              disabled={busy}
                              onClick={() =>
                                void handleDecide(detailApp, "ACCEPTED", {
                                  onSuccess: () => setDetailApp(null),
                                })
                              }
                            >
                              Принять
                            </Button>
                          </>
                        )}
                      </DialogFooter>
                    ) : null}
                  </>
                );
              })()
            : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={withdrawInviteTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setWithdrawInviteTarget(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Отозвать приглашение?</DialogTitle>
            <DialogDescription>
              {withdrawInviteTarget ? (
                <>
                  Приглашение для{" "}
                  {displayPublicName(withdrawInviteTarget.applicant)} будет
                  удалено. При необходимости можно отправить снова.
                </>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-3">
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="min-w-28"
              onClick={() => setWithdrawInviteTarget(null)}
            >
              Назад
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="lg"
              className="min-w-28"
              disabled={busy || !withdrawInviteTarget}
              onClick={() => {
                if (withdrawInviteTarget) {
                  void handleWithdrawInvite(withdrawInviteTarget);
                }
              }}
            >
              {cancellingInvite ? "Отзыв…" : "Отозвать"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={rejectTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setRejectTarget(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Отклонить заявку?</DialogTitle>
            <DialogDescription>
              {rejectTarget
                ? `Заявка от ${displayPublicName(rejectTarget.applicant)} будет отклонена.`
                : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-3">
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="min-w-28"
              onClick={() => setRejectTarget(null)}
            >
              Назад
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="lg"
              className="min-w-28"
              disabled={busy || !rejectTarget}
              onClick={() => {
                if (rejectTarget) {
                  void handleDecide(rejectTarget, "REJECTED");
                }
              }}
            >
              Отклонить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
