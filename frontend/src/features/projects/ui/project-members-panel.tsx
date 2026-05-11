import { Search } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { href, Link } from "react-router";

import {
  useGetProjectMembersQuery,
  useRemoveProjectMemberMutation,
  useUpdateProjectMemberRoleMutation,
} from "../api/projects.api";
import type { ProjectDetail, ProjectMemberRow } from "../model/types";

import { displayPublicName } from "@/features/auth";
import { getApiErrorMessage, type ApiError } from "@/shared/lib/api-error";
import { useDebouncedValue } from "@/shared/lib/react/use-debounced-value";
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
import { Input } from "@/shared/ui/kit/input";
import { Spinner } from "@/shared/ui/kit/spinner";

const MEMBERS_PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 320;

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

type ProjectMembersPagedListProps = {
  projectId: string;
  q: string;
  listEpoch: number;
  currentUserId: string;
  canManageMembers: boolean;
  busy: boolean;
  onRoleChange: (userId: string, role: "MEMBER" | "ADMIN") => void;
  onRemoveMemberClick: (member: ProjectMemberRow) => void;
  onLeaveProjectClick: () => void;
};

function ProjectMembersPagedList({
  projectId,
  q,
  listEpoch,
  currentUserId,
  canManageMembers,
  busy,
  onRoleChange,
  onRemoveMemberClick,
  onLeaveProjectClick,
}: ProjectMembersPagedListProps) {
  const [skip, setSkip] = useState(0);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const loadSnapshotRef = useRef({
    rowsLen: 0,
    total: 0,
    isFetching: false,
  });

  const {
    data,
    error: membersQueryError,
    isLoading,
    isFetching,
    refetch,
  } = useGetProjectMembersQuery({
    projectId,
    skip,
    take: MEMBERS_PAGE_SIZE,
    q,
    listEpoch,
  });

  const rows = data?.items ?? [];
  const total = data?.total ?? 0;

  useLayoutEffect(() => {
    loadSnapshotRef.current = {
      rowsLen: rows.length,
      total,
      isFetching,
    };
  }, [rows.length, total, isFetching]);

  useEffect(() => {
    const sentinel = sentinelRef.current;

    if (!sentinel) {
      return;
    }

    const observer = new IntersectionObserver(([entry]) => {
      const snap = loadSnapshotRef.current;

      if (
        entry?.isIntersecting &&
        snap.total > 0 &&
        snap.rowsLen < snap.total &&
        !snap.isFetching
      ) {
        setSkip(snap.rowsLen);
      }
    });

    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [projectId, q, listEpoch]);

  const showInitialSpinner = isLoading && rows.length === 0;
  const showLoadMoreSpinner = isFetching && rows.length > 0;

  return (
    <>
      {membersQueryError && !data ? (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
          <span className="text-destructive">
            Не удалось загрузить список участников.
          </span>
          <Button type="button" size="sm" variant="outline" onClick={refetch}>
            Повторить
          </Button>
        </div>
      ) : null}

      {total > 0 ? (
        <p className="text-sm text-muted-foreground">
          Показано {rows.length} из {total}
        </p>
      ) : null}

      {showInitialSpinner ? (
        <div className="flex justify-center py-8 text-muted-foreground">
          <Spinner />
        </div>
      ) : (
        <ul className="grid gap-3">
          {rows.map((m) => {
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
                      onClick={() => onRoleChange(m.userId, "ADMIN")}
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
                      onClick={() => onRoleChange(m.userId, "MEMBER")}
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
                          onLeaveProjectClick();
                        } else {
                          onRemoveMemberClick(m);
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
      )}

      {showLoadMoreSpinner ? (
        <div className="flex justify-center py-3 text-muted-foreground">
          <Spinner className="size-5" />
        </div>
      ) : null}

      {!showInitialSpinner &&
      !isFetching &&
      rows.length === 0 &&
      !membersQueryError ? (
        <p className="rounded-xl border bg-card p-4 text-center text-muted-foreground">
          {q.trim().length > 0
            ? "Никого не найдено по запросу"
            : "В проекте пока нет участников"}
        </p>
      ) : null}

      <div ref={sentinelRef} className="h-4" />
    </>
  );
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
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, SEARCH_DEBOUNCE_MS);
  const [membersListEpoch, setMembersListEpoch] = useState(0);

  const [removeMember, { isLoading: removing }] =
    useRemoveProjectMemberMutation();
  const [updateRole, { isLoading: roleUpdating }] =
    useUpdateProjectMemberRoleMutation();
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<ProjectMemberRow | null>(
    null
  );
  const [leaveSelfOpen, setLeaveSelfOpen] = useState(false);

  const bumpMembersList = () => {
    setMembersListEpoch((n) => n + 1);
  };

  const runRemove = async (userId: string) => {
    setMutationError(null);

    try {
      await removeMember({ projectId: project.id, userId }).unwrap();
      bumpMembersList();
      setRemoveTarget(null);
    } catch (err: unknown) {
      setMutationError(
        getApiErrorMessage(err as ApiError, "Не удалось удалить участника")
      );
    }
  };

  const runRole = async (userId: string, role: "MEMBER" | "ADMIN") => {
    setMutationError(null);

    try {
      await updateRole({ projectId: project.id, userId, role }).unwrap();
      bumpMembersList();
    } catch (err: unknown) {
      setMutationError(
        getApiErrorMessage(err as ApiError, "Не удалось изменить роль")
      );
    }
  };

  const busy = removing || roleUpdating;

  const listKey = `${project.id}\u0000${debouncedSearch}\u0000${membersListEpoch}`;

  return (
    <div className="grid gap-4">
      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск по фамилии, имени или отчеству…"
          className="h-9 pl-9"
          autoComplete="off"
          spellCheck={false}
        />
      </div>

      {mutationError ? (
        <p className="text-sm text-destructive" role="alert">
          {mutationError}
        </p>
      ) : null}

      <ProjectMembersPagedList
        key={listKey}
        projectId={project.id}
        q={debouncedSearch}
        listEpoch={membersListEpoch}
        currentUserId={currentUserId}
        canManageMembers={canManageMembers}
        busy={busy}
        onRoleChange={(userId, role) => {
          void runRole(userId, role);
        }}
        onRemoveMemberClick={(m) => {
          setRemoveTarget(m);
        }}
        onLeaveProjectClick={() => {
          setLeaveSelfOpen(true);
        }}
      />

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
