import { useState } from "react";
import { useNavigate } from "react-router";

import { useDeleteProjectMutation } from "../api/projects.api";

import { getApiErrorMessage, type ApiError } from "@/shared/lib/api-error";
import { ROUTES } from "@/shared/model/routes";
import { Button } from "@/shared/ui/kit/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/kit/dialog";

type ProjectDeleteSectionProps = {
  projectId: string;
  projectTitle: string;
};

export function ProjectDeleteSection({
  projectId,
  projectTitle,
}: ProjectDeleteSectionProps) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [deleteProject, { isLoading }] = useDeleteProjectMutation();
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setError(null);

    try {
      await deleteProject(projectId).unwrap();
      setOpen(false);
      navigate(ROUTES.PROJECTS);
    } catch (err: unknown) {
      setError(
        getApiErrorMessage(err as ApiError, "Не удалось удалить проект")
      );
    }
  };

  return (
    <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4">
      <h3 className="text-sm font-medium text-destructive">Опасная зона</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Удаление проекта необратимо: исчезнут заявки и состав участников.
      </p>
      <Button
        type="button"
        variant="destructive"
        className="mt-3"
        onClick={() => setOpen(true)}
      >
        Удалить проект
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Удалить проект?</DialogTitle>
            <DialogDescription>
              Проект «{projectTitle}» будет удалён без возможности
              восстановления.
            </DialogDescription>
          </DialogHeader>
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              Отмена
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isLoading}
              onClick={() => void handleDelete()}
            >
              {isLoading ? "Удаление…" : "Удалить навсегда"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
