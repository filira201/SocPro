import { useEffect, useMemo, useRef, useState } from "react";

import {
  useGetNotificationsQuery,
  useGetUnreadNotificationCountQuery,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
} from "./api/notifications.api";
import { NotificationCard } from "./ui/notification-card";
import { NotificationReadConfirmDialog } from "./ui/notification-read-confirm-dialog";

import { getApiErrorMessage } from "@/shared/lib/api-error";
import { Button } from "@/shared/ui/kit/button";
import { Spinner } from "@/shared/ui/kit/spinner";

function NotificationsPage() {
  const [confirmOneId, setConfirmOneId] = useState<string | null>(null);
  const [confirmAllOpen, setConfirmAllOpen] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const requestedCursors = useRef(new Set<string | null>([null]));
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const { data: unreadData } = useGetUnreadNotificationCountQuery();

  const queryArgs = useMemo(
    () => ({
      cursor,
      limit: 10,
    }),
    [cursor]
  );

  const { data, isFetching, isLoading, isError, error, refetch } =
    useGetNotificationsQuery(queryArgs);

  const [markRead, { isLoading: isMarkingOne }] =
    useMarkNotificationReadMutation();
  const [markAllRead, { isLoading: isMarkingAll }] =
    useMarkAllNotificationsReadMutation();

  const unreadTotal = unreadData?.count ?? 0;

  useEffect(() => {
    const sentinel = sentinelRef.current;

    if (!sentinel) {
      return;
    }

    const observer = new IntersectionObserver(([entry]) => {
      const nextCursor = data?.nextCursor ?? null;

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
  }, [data?.nextCursor, isFetching]);

  const globalError = isError ? getApiErrorMessage(error) : "";

  const handleConfirmMarkOne = async () => {
    if (!confirmOneId) {
      return;
    }

    try {
      await markRead(confirmOneId).unwrap();
      setConfirmOneId(null);
    } catch {
      /* диалог остаётся открытым */
    }
  };

  const handleConfirmMarkAll = async () => {
    try {
      await markAllRead().unwrap();
      setConfirmAllOpen(false);
    } catch {
      /* диалог остаётся открытым */
    }
  };

  return (
    <section className="mx-auto w-full max-w-3xl px-3 py-6 sm:px-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold sm:text-2xl">Уведомления</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Непрочитанных:{" "}
            <span
              data-testid="notifications-unread-total"
              className="font-medium text-foreground"
            >
              {unreadTotal}
            </span>
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          data-testid="notifications-mark-all"
          className="shrink-0 self-start sm:self-auto"
          disabled={unreadTotal === 0 || isMarkingAll}
          onClick={() => setConfirmAllOpen(true)}
        >
          {isMarkingAll ? (
            <>
              <Spinner data-icon="inline-start" />
              Удаление…
            </>
          ) : (
            "Прочитать все"
          )}
        </Button>
      </div>

      {globalError ? (
        <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {globalError}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-2 h-auto px-2 py-1"
            onClick={() => refetch()}
          >
            Повторить
          </Button>
        </div>
      ) : null}

      <div className="mt-6 grid gap-3">
        {data?.items.map((n) => (
          <NotificationCard
            key={n.id}
            notification={n}
            onMarkRead={(id) => setConfirmOneId(id)}
            isMarking={isMarkingOne}
          />
        ))}

        <NotificationReadConfirmDialog
          open={confirmOneId !== null}
          onOpenChange={(open) => {
            if (!open) {
              setConfirmOneId(null);
            }
          }}
          mode="one"
          onConfirm={handleConfirmMarkOne}
          isLoading={isMarkingOne}
        />

        <NotificationReadConfirmDialog
          open={confirmAllOpen}
          onOpenChange={setConfirmAllOpen}
          mode="all"
          onConfirm={handleConfirmMarkAll}
          isLoading={isMarkingAll}
        />

        {isLoading || isFetching ? (
          <div className="flex justify-center py-6 text-muted-foreground">
            <Spinner />
          </div>
        ) : null}

        {!isLoading && !data?.items.length && !globalError ? (
          <p className="rounded-xl border bg-card p-6 text-center text-muted-foreground">
            Пока нет уведомлений
          </p>
        ) : null}

        <div ref={sentinelRef} className="h-4" aria-hidden />
      </div>
    </section>
  );
}

export const Component = NotificationsPage;
