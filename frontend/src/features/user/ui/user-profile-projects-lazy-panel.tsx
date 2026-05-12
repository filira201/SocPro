import { SearchIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { useGetUserProfileProjectsQuery } from "../api/user-profile-projects.api";
import type { UserProfileProjectsQueryArgs } from "../api/user-profile-projects.api";
import { useUserProfileProjectsUrl } from "../lib/use-user-profile-projects-url";

import type { ProjectsListQuery } from "@/features/projects/model/types";
import { ProjectCard } from "@/features/projects/ui/project-card";
import { getApiErrorMessage } from "@/shared/lib/api-error";
import { Checkbox } from "@/shared/ui/kit/checkbox";
import { Input } from "@/shared/ui/kit/input";
import { Spinner } from "@/shared/ui/kit/spinner";

type UserProfileProjectsListBlockProps = {
  profileUserId: string;
  viewerId: string | undefined;
  apiFilters: Pick<ProjectsListQuery, "q" | "authorOnly">;
  emptyMessage: string;
};

function UserProfileProjectsListBlock({
  profileUserId,
  viewerId,
  apiFilters,
  emptyMessage,
}: UserProfileProjectsListBlockProps) {
  const [cursor, setCursor] = useState<string | null>(null);
  const requestedCursors = useRef(new Set<string | null>([null]));
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const queryArgs: UserProfileProjectsQueryArgs = useMemo(
    () => ({
      userId: profileUserId,
      limit: 10,
      cursor,
      ...(apiFilters.q ? { q: apiFilters.q } : {}),
      ...(apiFilters.authorOnly ? { authorOnly: true } : {}),
    }),
    [profileUserId, cursor, apiFilters.q, apiFilters.authorOnly]
  );

  const { data, isFetching, isLoading, error } =
    useGetUserProfileProjectsQuery(queryArgs);

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
  const items = data?.items ?? [];

  return (
    <>
      {globalError ? (
        <p className="text-destructive" role="alert">
          {globalError}
        </p>
      ) : null}

      {!globalError && items.length > 0 ? (
        <ul className="mt-4 grid gap-3">
          {items.map((project) => (
            <li key={project.id}>
              <ProjectCard
                project={project}
                isOwnedByCurrentUser={viewerId === project.owner.id}
                authorBadgeForUserId={profileUserId}
              />
            </li>
          ))}
        </ul>
      ) : null}

      {isLoading || isFetching ? (
        <div className="flex justify-center py-6 text-muted-foreground">
          <Spinner />
        </div>
      ) : null}

      {!isLoading && !globalError && items.length === 0 ? (
        <p className="mt-4 rounded-xl border bg-card p-4 text-center text-muted-foreground">
          {emptyMessage}
        </p>
      ) : null}

      <div ref={sentinelRef} className="h-4" />
    </>
  );
}

export type UserProfileProjectsLazyPanelProps = {
  profileUserId: string;
  viewerId: string | undefined;
};

/** Подгружается лениво вместе с чанком: запросы к API идут только после монтирования. */
export default function UserProfileProjectsLazyPanel({
  profileUserId,
  viewerId,
}: UserProfileProjectsLazyPanelProps) {
  const {
    feedFromUrl,
    titleInput,
    setTitleInput,
    setAuthorOnly,
    apiFilters,
    listResetKey,
  } = useUserProfileProjectsUrl();

  const hasFilters = Boolean(feedFromUrl.q.trim()) || feedFromUrl.authorOnly;

  const emptyMessage = hasFilters
    ? "По заданным условиям проекты не найдены"
    : "Пользователь не состоит ни в одном проекте";

  return (
    <div className="mt-4 rounded-xl border bg-card p-4 shadow-sm">
      <h2 className="text-base font-semibold">Проекты в участии</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Проекты, где пользователь указан как владелец или участник.
      </p>

      <div className="mt-4 flex flex-col gap-4">
        <div className="relative w-full min-w-0">
          <SearchIcon
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            className="h-10 w-full pl-9"
            value={titleInput}
            onChange={(e) => setTitleInput(e.target.value)}
            placeholder="Поиск по названию проекта…"
            aria-label="Поиск проектов пользователя по названию"
            maxLength={200}
          />
        </div>

        <div className="flex w-fit max-w-full items-center gap-2">
          <Checkbox
            id="profile-projects-author-only"
            checked={feedFromUrl.authorOnly}
            onCheckedChange={(checked) => setAuthorOnly(checked === true)}
          />
          <label
            className="cursor-pointer text-sm leading-none select-none"
            htmlFor="profile-projects-author-only"
          >
            Только проекты, где пользователь — автор
          </label>
        </div>
      </div>

      <div className="mt-4">
        <UserProfileProjectsListBlock
          key={`${profileUserId}-${listResetKey}`}
          profileUserId={profileUserId}
          viewerId={viewerId}
          apiFilters={apiFilters}
          emptyMessage={emptyMessage}
        />
      </div>
    </div>
  );
}
