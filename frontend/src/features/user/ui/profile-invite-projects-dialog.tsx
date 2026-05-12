import { SearchIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { href, Link } from "react-router";

import {
  useCancelApplicationMutation,
  useGetManagedProjectsListQuery,
  useInviteUserToProjectMutation,
} from "@/features/projects/api/projects.api";
import type { ManagedProjectListItem } from "@/features/projects/model/types";
import { ProjectCard } from "@/features/projects/ui/project-card";
import { getApiErrorMessage, type ApiError } from "@/shared/lib/api-error";
import { useDebouncedValue } from "@/shared/lib/react/use-debounced-value";
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
import { Input } from "@/shared/ui/kit/input";
import { Spinner } from "@/shared/ui/kit/spinner";
import { Textarea } from "@/shared/ui/kit/textarea";

const SEARCH_DEBOUNCE_MS = 400;
const MAX_Q = 200;

type ProfileInviteProjectsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inviteeId: string;
  inviteePublicTitle: string;
};

type ManagedListBlockProps = {
  inviteeId: string;
  debouncedQ: string;
  /** Не дергать RTK/store, пока диалог закрыт. */
  skipQuery: boolean;
  onInviteProject: (project: ManagedProjectListItem) => void;
  onWithdrawProject: (project: ManagedProjectListItem) => void;
  withdrawBusyId: string | null;
  onCloseMain: () => void;
};

function ManagedProjectsInviteListBlock({
  inviteeId,
  debouncedQ,
  skipQuery,
  onInviteProject,
  onWithdrawProject,
  withdrawBusyId,
  onCloseMain,
}: ManagedListBlockProps) {
  const [cursor, setCursor] = useState<string | null>(null);
  const requestedCursors = useRef(new Set<string | null>([null]));
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const queryArgs = useMemo(
    () => ({
      inviteeId,
      limit: 10,
      cursor,
      ...(debouncedQ.trim() ? { q: debouncedQ.trim() } : {}),
    }),
    [inviteeId, cursor, debouncedQ]
  );

  const { currentData, isFetching, isLoading, error } =
    useGetManagedProjectsListQuery(queryArgs, { skip: skipQuery });

  useEffect(() => {
    if (skipQuery) {
      return;
    }

    const sentinel = sentinelRef.current;

    if (!sentinel) {
      return;
    }

    const observer = new IntersectionObserver(([entry]) => {
      const nextCursor = currentData?.nextCursor ?? null;

      if (
        entry?.isIntersecting &&
        nextCursor &&
        !isFetching &&
        !requestedCursors.current.has(nextCursor)
      ) {
        requestedCursors.current.add(nextCursor);
        setCursor(nextCursor);
      }
    });

    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [skipQuery, currentData?.nextCursor, isFetching]);

  if (skipQuery) {
    return <div className="min-h-48 shrink-0" aria-hidden />;
  }

  const globalError = getApiErrorMessage(error);
  const items = currentData?.items ?? [];
  /** Первая загрузка или смена поиска: ещё нет данных именно для текущих аргументов (см. RTK Query `currentData`). */
  const isBlankLoading = (isLoading || isFetching) && currentData === undefined;
  /** Подгрузка следующей страницы при уже показанном списке. */
  const isAppending =
    isFetching && currentData !== undefined && cursor !== null;

  return (
    <div className="relative mt-1 min-h-0">
      {globalError ? (
        <p className="text-destructive" role="alert">
          {globalError}
        </p>
      ) : null}

      {!globalError && items.length > 0 ? (
        <ul
          className={`mt-4 grid gap-4 ${isFetching && !isBlankLoading ? "opacity-80 transition-opacity" : ""}`}
        >
          {items.map((project) => (
            <li key={project.id}>
              <ManagedProjectInviteRow
                project={project}
                onInvite={() => onInviteProject(project)}
                onWithdraw={() => onWithdrawProject(project)}
                withdrawBusy={withdrawBusyId === project.inviteeApplication?.id}
                onCloseMain={onCloseMain}
              />
            </li>
          ))}
        </ul>
      ) : null}

      {isBlankLoading ? (
        <div
          className="flex min-h-48 items-center justify-center py-8 text-muted-foreground"
          aria-busy
          aria-label="Загрузка списка проектов"
        >
          <Spinner />
        </div>
      ) : null}

      {!isBlankLoading && !globalError && items.length === 0 ? (
        <p className="mt-4 rounded-lg border bg-muted/30 p-4 text-center text-sm text-muted-foreground">
          {debouncedQ.trim()
            ? "По заданному названию проекты не найдены"
            : "Нет проектов, где вы автор или администратор"}
        </p>
      ) : null}

      {isAppending ? (
        <div className="flex justify-center py-3 text-muted-foreground">
          <Spinner className="size-5" aria-hidden />
        </div>
      ) : null}

      <div ref={sentinelRef} className="h-4" />

      {isFetching && !isBlankLoading && !isAppending && items.length > 0 ? (
        <div
          className="pointer-events-none absolute inset-x-0 top-0 flex justify-center pt-2"
          aria-hidden
        >
          <span className="rounded-full border bg-background/90 px-2 py-1 text-xs text-muted-foreground shadow-sm">
            Обновление…
          </span>
        </div>
      ) : null}
    </div>
  );
}

function ManagedProjectInviteRow({
  project,
  onInvite,
  onWithdraw,
  withdrawBusy,
  onCloseMain,
}: {
  project: ManagedProjectListItem;
  onInvite: () => void;
  onWithdraw: () => void;
  withdrawBusy: boolean;
  onCloseMain: () => void;
}) {
  const isMember = project.inviteeIsMember === true;
  const app = project.inviteeApplication;
  const accepting = project.acceptingApplications;
  const pendingIsOrganizerInvite = Boolean(
    app?.status === "PENDING" && (app.invitedById ?? "").length > 0
  );

  let action: ReactNode;

  if (isMember) {
    action = (
      <span className="text-center text-sm text-muted-foreground">
        Уже участник
      </span>
    );
  } else if (!accepting) {
    action = (
      <span className="text-center text-sm text-muted-foreground">
        Проект не принимает заявки
      </span>
    );
  } else if (app?.status === "PENDING" && pendingIsOrganizerInvite) {
    action = (
      <Button
        type="button"
        variant="ghost"
        className="h-auto min-h-10 whitespace-normal py-2 text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        disabled={withdrawBusy}
        onClick={onWithdraw}
      >
        {withdrawBusy ? "Отзыв…" : "Отозвать приглашение"}
      </Button>
    );
  } else if (app?.status === "PENDING") {
    const toProjectApplications = `${href(ROUTES.PROJECT_DETAILS, { id: project.id })}?tab=applications`;
    action = (
      <Button
        type="button"
        variant="ghost"
        className="h-auto min-h-0 whitespace-normal px-2 py-2 text-sm font-medium underline-offset-4 hover:underline"
        asChild
      >
        <Link to={toProjectApplications} onClick={() => onCloseMain()}>
          Заявка подана от пользователя открыть проект
        </Link>
      </Button>
    );
  } else if (app?.status === "ACCEPTED") {
    action = (
      <span className="text-center text-sm text-muted-foreground">
        Заявка принята
      </span>
    );
  } else {
    action = (
      <Button
        type="button"
        variant="ghost"
        className="h-auto min-h-10 whitespace-normal py-2 text-sm font-medium underline-offset-4 hover:underline"
        onClick={onInvite}
      >
        Пригласить
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch sm:gap-4">
      <div className="min-w-0 flex-1">
        <ProjectCard project={project} isOwnedByCurrentUser />
      </div>
      <div className="flex shrink-0 flex-col items-stretch justify-center border-t pt-3 sm:w-40 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-4">
        {action}
      </div>
    </div>
  );
}

export function ProfileInviteProjectsDialog({
  open,
  onOpenChange,
  inviteeId,
  inviteePublicTitle,
}: ProfileInviteProjectsDialogProps) {
  const [titleInput, setTitleInput] = useState("");
  const debouncedQ = useDebouncedValue(titleInput, SEARCH_DEBOUNCE_MS);

  const [inviteProject, setInviteProject] =
    useState<ManagedProjectListItem | null>(null);
  const [inviteMessage, setInviteMessage] = useState("");
  const [inviteError, setInviteError] = useState<string | null>(null);

  const [withdrawProject, setWithdrawProject] =
    useState<ManagedProjectListItem | null>(null);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);

  const [invite, { isLoading: inviting }] = useInviteUserToProjectMutation();
  const [cancel, { isLoading: cancelling }] = useCancelApplicationMutation();

  const withdrawBusyId =
    cancelling && withdrawProject?.inviteeApplication?.id
      ? withdrawProject.inviteeApplication.id
      : null;

  const resetDialogFormState = () => {
    setTitleInput("");
    setInviteProject(null);
    setInviteMessage("");
    setInviteError(null);
    setWithdrawProject(null);
    setWithdrawError(null);
  };

  const handleMainOpenChange = (next: boolean) => {
    if (!next) {
      resetDialogFormState();
    }

    onOpenChange(next);
  };

  const handleSendInvite = async () => {
    if (!inviteProject) {
      return;
    }

    setInviteError(null);

    try {
      await invite({
        projectId: inviteProject.id,
        inviteeId,
        body: { message: inviteMessage.trim() || undefined },
      }).unwrap();
      setInviteProject(null);
      setInviteMessage("");
    } catch (err: unknown) {
      setInviteError(
        getApiErrorMessage(err as ApiError, "Не удалось отправить приглашение")
      );
    }
  };

  const handleConfirmWithdraw = async () => {
    const app = withdrawProject?.inviteeApplication;

    if (!withdrawProject || !app?.id) {
      return;
    }

    setWithdrawError(null);

    try {
      await cancel({
        applicationId: app.id,
        projectId: withdrawProject.id,
        managedInviteeId: inviteeId,
      }).unwrap();
      setWithdrawProject(null);
    } catch (err: unknown) {
      setWithdrawError(
        getApiErrorMessage(err as ApiError, "Не удалось отозвать заявку")
      );
    }
  };

  const inviteBusy = inviting;
  const withdrawBusy = cancelling;

  return (
    <>
      <Dialog open={open} onOpenChange={handleMainOpenChange}>
        <DialogContent className="flex max-h-[90dvh] max-w-lg flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
          <DialogHeader className="shrink-0 border-b px-4 py-4 sm:px-6">
            <DialogTitle>Заявки</DialogTitle>
            <DialogDescription>
              Проекты, где вы автор или администратор. Приглашение для
              пользователя {inviteePublicTitle}: будет создана заявка на
              участие.
            </DialogDescription>
          </DialogHeader>

          <div className="flex min-h-0 flex-1 flex-col px-4 pb-4 sm:px-6">
            <div className="relative mt-4 w-full min-w-0 shrink-0">
              <SearchIcon
                className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                className="h-10 w-full pl-9"
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value.slice(0, MAX_Q))}
                placeholder="Поиск по названию проекта…"
                aria-label="Поиск ваших проектов по названию"
                maxLength={MAX_Q}
              />
            </div>

            <div className="mt-4 min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain pr-1">
              <ManagedProjectsInviteListBlock
                key={`${inviteeId}-${debouncedQ}`}
                inviteeId={inviteeId}
                debouncedQ={debouncedQ}
                skipQuery={!open}
                onInviteProject={setInviteProject}
                onWithdrawProject={setWithdrawProject}
                withdrawBusyId={withdrawBusyId}
                onCloseMain={() => handleMainOpenChange(false)}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(inviteProject)}
        onOpenChange={(next) => {
          if (!next) {
            setInviteProject(null);
            setInviteMessage("");
            setInviteError(null);
          }
        }}
      >
        <DialogContent className="max-w-md gap-4">
          <DialogHeader>
            <DialogTitle>Приглашение в проект</DialogTitle>
            <DialogDescription>
              {inviteProject ? (
                <>
                  Проект «{inviteProject.title}». Необязательно добавьте
                  сообщение для пользователя {inviteePublicTitle}.
                </>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          <div className="-mx-4 max-h-[50vh] overflow-y-auto overflow-x-hidden overscroll-contain px-4">
            <Textarea
              value={inviteMessage}
              onChange={(e) => setInviteMessage(e.target.value)}
              placeholder="Сообщение…"
              rows={4}
              className="min-h-24 max-h-[42vh] resize-y wrap-break-word"
              disabled={inviteBusy}
            />
            {inviteError ? (
              <p className="mt-2 text-sm text-destructive" role="alert">
                {inviteError}
              </p>
            ) : null}
          </div>
          <DialogFooter className="gap-3">
            <Button
              type="button"
              variant="outline"
              size="lg"
              disabled={inviteBusy}
              onClick={() => {
                setInviteProject(null);
                setInviteMessage("");
                setInviteError(null);
              }}
            >
              Отмена
            </Button>
            <Button
              type="button"
              size="lg"
              disabled={inviteBusy}
              onClick={() => void handleSendInvite()}
            >
              {inviteBusy ? "Отправка…" : "Отправить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(withdrawProject)}
        onOpenChange={(next) => {
          if (!next) {
            setWithdrawProject(null);
            setWithdrawError(null);
          }
        }}
      >
        <DialogContent className="max-w-md gap-4">
          <DialogHeader>
            <DialogTitle>Отозвать приглашение?</DialogTitle>
            <DialogDescription>
              {withdrawProject ? (
                <>
                  Приглашение на проект «{withdrawProject.title}» для{" "}
                  {inviteePublicTitle} будет снято. При необходимости можно
                  отправить приглашение снова.
                </>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          {withdrawError ? (
            <p className="text-sm text-destructive" role="alert">
              {withdrawError}
            </p>
          ) : null}
          <DialogFooter className="gap-3">
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => {
                setWithdrawProject(null);
                setWithdrawError(null);
              }}
              disabled={withdrawBusy}
            >
              Нет
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="lg"
              disabled={withdrawBusy}
              onClick={() => void handleConfirmWithdraw()}
            >
              {withdrawBusy ? "Отзыв…" : "Да, отозвать"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
