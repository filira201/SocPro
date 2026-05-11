import { format, isValid, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import { useState } from "react";
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

  const handleDecide = async (
    app: ProjectApplication,
    status: "ACCEPTED" | "REJECTED"
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
    } catch (err: unknown) {
      setError(
        getApiErrorMessage(err as ApiError, "Не удалось обработать заявку")
      );
    }
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
        {applications.map((app) => (
          <li key={app.id} className="rounded-lg border bg-card/50 p-4 text-sm">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="grid gap-1">
                <Link
                  to={href(ROUTES.USER_DETAILS, { userId: app.applicant.id })}
                  className="font-medium underline-offset-4 hover:underline"
                >
                  {displayPublicName(app.applicant)}
                </Link>
                <Badge
                  variant="outline"
                  className="w-fit px-2.5 py-3.5 text-sm font-normal"
                >
                  {applicationStatusLabel(app.status)}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Подана {formatAt(app.createdAt)}
                  {app.decidedAt ? ` · решение ${formatAt(app.decidedAt)}` : ""}
                </span>
              </div>
              {app.status === "PENDING" ? (
                <div className="flex flex-wrap gap-2">
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
            {app.message?.trim() ? (
              <p className="mt-2 whitespace-pre-wrap text-muted-foreground">
                {app.message}
              </p>
            ) : null}
          </li>
        ))}
      </ul>

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
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setRejectTarget(null)}
            >
              Назад
            </Button>
            <Button
              type="button"
              variant="destructive"
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
