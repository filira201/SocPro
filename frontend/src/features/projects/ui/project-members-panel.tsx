import { useState } from "react";
import { href, Link } from "react-router";

import {
  useRemoveProjectMemberMutation,
  useUpdateProjectMemberRoleMutation,
} from "../api/projects.api";
import type { ProjectDetail, ProjectMemberRow } from "../model/types";

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

function memberRoleLabel(role: string) {
  switch (role) {
    case "OWNER":
      return "Владелец";
    case "ADMIN":
      return "Администратор";
    case "MEMBER":
      return "Участник";

    default:
      return role;
  }
}

type ProjectMembersPanelProps = {
  project: ProjectDetail;
  currentUserId: string;
  canManageMembers: boolean;
};

export function ProjectMembersPanel({
  project,
  currentUserId,
  canManageMembers,
}: ProjectMembersPanelProps) {
  const [removeMember, { isLoading: removing }] =
    useRemoveProjectMemberMutation();
  const [updateRole, { isLoading: roleUpdating }] =
    useUpdateProjectMemberRoleMutation();
  const [error, setError] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<ProjectMemberRow | null>(
    null
  );
  const [leaveSelfOpen, setLeaveSelfOpen] = useState(false);

  const members = project.members ?? [];

  const runRemove = async (userId: string) => {
    setError(null);

    try {
      await removeMember({ projectId: project.id, userId }).unwrap();
      setRemoveTarget(null);
    } catch (err: unknown) {
      setError(
        getApiErrorMessage(err as ApiError, "Не удалось удалить участника")
      );
    }
  };

  const runRole = async (userId: string, role: "MEMBER" | "ADMIN") => {
    setError(null);

    try {
      await updateRole({ projectId: project.id, userId, role }).unwrap();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err as ApiError, "Не удалось изменить роль"));
    }
  };

  const busy = removing || roleUpdating;

  return (
    <div className="grid gap-4">
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <ul className="grid gap-3">
        {members.map((m) => {
          const isSelf = m.userId === currentUserId;
          const isOwnerRow = m.role === "OWNER";
          const profileHref = href(ROUTES.USER_DETAILS, { userId: m.userId });
          const canRemoveOther = canManageMembers && !isOwnerRow && !isSelf;
          const canLeaveSelf = isSelf && !isOwnerRow;
          const canRemoveThis = canRemoveOther || canLeaveSelf;
          const canToggleAdmin =
            canManageMembers && !isOwnerRow && m.role !== "OWNER";

          return (
            <li
              key={m.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card/50 p-3"
            >
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <Link
                  to={profileHref}
                  className="truncate font-medium underline-offset-4 hover:underline"
                >
                  {displayPublicName(m.user)}
                </Link>
                <Badge
                  variant="secondary"
                  className="shrink-0 px-2.5 py-3.5 text-sm font-normal"
                >
                  {memberRoleLabel(m.role)}
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {canToggleAdmin && m.role === "MEMBER" ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => void runRole(m.userId, "ADMIN")}
                  >
                    Сделать админом
                  </Button>
                ) : null}
                {canToggleAdmin && m.role === "ADMIN" ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => void runRole(m.userId, "MEMBER")}
                  >
                    Снять админа
                  </Button>
                ) : null}
                {canRemoveThis ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    disabled={busy}
                    onClick={() => {
                      if (canLeaveSelf) {
                        setLeaveSelfOpen(true);
                      } else {
                        setRemoveTarget(m);
                      }
                    }}
                  >
                    {canLeaveSelf ? "Покинуть проект" : "Исключить"}
                  </Button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>

      <Dialog
        open={leaveSelfOpen}
        onOpenChange={(open) => {
          if (!open) {
            setLeaveSelfOpen(false);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Покинуть проект?</DialogTitle>
            <DialogDescription>
              Вы выйдете из состава участников. При необходимости сможете снова
              подать заявку, если проект принимает заявки.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-3">
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="min-w-28"
              onClick={() => setLeaveSelfOpen(false)}
            >
              Отмена
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="lg"
              className="min-w-28"
              disabled={busy}
              onClick={() => {
                void runRemove(currentUserId);
                setLeaveSelfOpen(false);
              }}
            >
              Покинуть
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={removeTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setRemoveTarget(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Исключить участника?</DialogTitle>
            <DialogDescription>
              {removeTarget
                ? `${displayPublicName(removeTarget.user)} будет удалён из проекта.`
                : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-3">
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => setRemoveTarget(null)}
            >
              Отмена
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="lg"
              disabled={busy || !removeTarget}
              onClick={() => {
                if (removeTarget) {
                  void runRemove(removeTarget.userId);
                }
              }}
            >
              Исключить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
