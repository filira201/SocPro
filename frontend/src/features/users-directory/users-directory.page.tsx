import { SearchIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  useGetUsersDirectoryQuery,
  type UsersDirectoryQueryArgs,
} from "./api/users-directory.api";
import { useUsersDirectoryUrl } from "./lib/use-users-directory-url";
import { UsersDirectorySkillsFilter } from "./ui/users-directory-skills-filter";

import { FollowUserCard } from "@/features/follow/ui/follow-user-card";
import { getApiErrorMessage } from "@/shared/lib/api-error";
import { Input } from "@/shared/ui/kit/input";
import { Spinner } from "@/shared/ui/kit/spinner";

type UsersDirectoryListBlockProps = {
  apiFilters: Pick<UsersDirectoryQueryArgs, "q" | "skillIds">;
  emptyMessage: string;
};

function UsersDirectoryListBlock({
  apiFilters,
  emptyMessage,
}: UsersDirectoryListBlockProps) {
  const [cursor, setCursor] = useState<string | null>(null);
  const requestedCursors = useRef(new Set<string | null>([null]));
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const queryArgs = useMemo(
    () => ({
      ...apiFilters,
      cursor,
      limit: 10,
    }),
    [apiFilters, cursor]
  );

  const { data, isFetching, isLoading, error } =
    useGetUsersDirectoryQuery(queryArgs);

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

  const globalError = getApiErrorMessage(error);
  const list = data?.items ?? [];

  return (
    <>
      {globalError ? (
        <p className="mt-4 text-destructive" role="alert">
          {globalError}
        </p>
      ) : null}

      {!globalError && list.length > 0 ? (
        <ul className="mt-6 grid gap-3">
          {list.map((item) => (
            <li key={item.id}>
              <FollowUserCard user={item} isFollowing={item.isFollowing} />
            </li>
          ))}
        </ul>
      ) : null}

      {isLoading || isFetching ? (
        <div className="mt-8 flex justify-center text-muted-foreground">
          <Spinner />
        </div>
      ) : null}

      {!isLoading && !globalError && list.length === 0 ? (
        <p className="mt-4 text-muted-foreground">{emptyMessage}</p>
      ) : null}

      <div ref={sentinelRef} className="h-4" />
    </>
  );
}

function UsersDirectoryPage() {
  const {
    feedFromUrl,
    titleInput,
    setTitleInput,
    setSkillIds,
    apiFilters,
    feedResetKey,
  } = useUsersDirectoryUrl();

  const hasFilters =
    Boolean(feedFromUrl.q.trim()) || feedFromUrl.skillIds.length > 0;

  const emptyMessage = hasFilters
    ? "По заданным условиям пользователи не найдены"
    : "Пока нет зарегистрированных пользователей";

  return (
    <section className="mx-auto w-full max-w-3xl px-3 py-6 sm:px-4">
      <h1 className="text-xl font-semibold sm:text-2xl">Пользователи</h1>

      <div className="mt-4 rounded-xl border bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-4">
          <div className="relative w-full min-w-0">
            <SearchIcon
              className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              className="h-10 w-full pl-9"
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              placeholder="Поиск по имени, фамилии или отчеству…"
              aria-label="Поиск пользователей по ФИО"
              maxLength={200}
            />
          </div>

          <UsersDirectorySkillsFilter
            skillIds={feedFromUrl.skillIds}
            onSkillIdsChange={setSkillIds}
          />
        </div>
      </div>

      <div className="mt-6">
        <UsersDirectoryListBlock
          key={feedResetKey}
          apiFilters={apiFilters}
          emptyMessage={emptyMessage}
        />
      </div>
    </section>
  );
}

export const Component = UsersDirectoryPage;
