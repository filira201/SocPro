import { format, isValid, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import { useState, type MouseEvent } from "react";
import { href, Link } from "react-router";

import { useDecideApplicationMutation } from "../api/projects.api";
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
  const [decide, { isLoading }] = useDecideApplicationMutation();
  const [error, setError] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<ProjectApplication | null>(
    null
  );
  const [detailApp, setDetailApp] = useState<ProjectApplication | null>(null);

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

      options?.onSuccess?.();
    } catch (err: unknown) {
      setError(
        getApiErrorMessage(err as ApiError, "Не удалось обработать заявку")
      );
    }
  };

  const handleCardClick = (
    app: ProjectApplication,
    e: MouseEvent<HTMLLIElement>
  ) => {
    if (isInsideInteractiveTarget(e.target)) {
      return;
    }

    setDetailApp(app);
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

          return (
            <li
              key={app.id}
              role="presentation"
              className="cursor-pointer rounded-lg border bg-card/50 p-4"
              onClick={(e) => handleCardClick(app, e)}
            >
              <div className="grid gap-3 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <Link
                    to={href(ROUTES.USER_DETAILS, { userId: app.applicant.id })}
                    className="min-w-0 text-base font-semibold leading-tight underline-offset-4 hover:underline sm:text-lg"
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

                {isPending ? (
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="text-sm text-muted-foreground">
                      Подана {formatAt(app.createdAt)}
                    </span>
                    <Badge
                      variant="outline"
                      className="shrink-0 px-2.5 py-1 text-xs font-normal sm:text-sm"
                    >
                      {applicationStatusLabel(app.status)}
                    </Badge>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Подана {formatAt(app.createdAt)}
                    </p>
                    {app.decidedAt ? (
                      <p className="text-base font-medium text-foreground">
                        Решение {formatAt(app.decidedAt)}
                      </p>
                    ) : null}
                  </>
                )}

                {isPending ? (
                  <div className="flex flex-wrap gap-2 border-t border-border/60 pt-3">
                    <Button
                      type="button"
                      size="sm"
                      disabled={isLoading}
                      onClick={() => void handleDecide(app, "ACCEPTED")}
                    >
                      Принять
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={isLoading}
                      onClick={() => setRejectTarget(app)}
                    >
                      Отклонить
                    </Button>
                  </div>
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
          <DialogHeader>
            <DialogTitle>Заявка</DialogTitle>
            <DialogDescription className="sr-only">
              Подробности заявки и сообщение заявителя
            </DialogDescription>
          </DialogHeader>
          {detailApp ? (
            <>
              <div className="-mx-4 max-h-[50vh] overflow-y-auto overflow-x-hidden overscroll-contain px-4">
                <div className="grid gap-4 text-sm">
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

                  {detailApp.status === "PENDING" ? (
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span className="text-sm text-muted-foreground">
                        Подана {formatAt(detailApp.createdAt)}
                      </span>
                      <Badge
                        variant="outline"
                        className="shrink-0 px-2.5 py-1 text-xs font-normal sm:text-sm"
                      >
                        {applicationStatusLabel(detailApp.status)}
                      </Badge>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm text-muted-foreground">
                        Подана {formatAt(detailApp.createdAt)}
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
                        Сообщение заявителя
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
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    className="min-w-28"
                    disabled={isLoading}
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
                    disabled={isLoading}
                    onClick={() =>
                      void handleDecide(detailApp, "ACCEPTED", {
                        onSuccess: () => setDetailApp(null),
                      })
                    }
                  >
                    Принять
                  </Button>
                </DialogFooter>
              ) : null}
            </>
          ) : null}
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
              disabled={isLoading || !rejectTarget}
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
