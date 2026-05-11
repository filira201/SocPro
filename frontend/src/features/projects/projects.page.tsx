import { SearchIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";

import { useGetProjectsListQuery } from "./api/projects.api";
import { useProjectsFeedUrl } from "./lib/use-projects-feed-url";
import type { ProjectsListQuery, ProjectsListSort } from "./model/types";
import { ProjectCard } from "./ui/project-card";
import { ProjectsFeedSkillsFilter } from "./ui/projects-feed-skills-filter";

import { selectCurrentUser } from "@/features/auth";
import { getApiErrorMessage } from "@/shared/lib/api-error";
import { useAppSelector } from "@/shared/lib/redux";
import { ROUTES } from "@/shared/model/routes";
import { Button } from "@/shared/ui/kit/button";
import { Checkbox } from "@/shared/ui/kit/checkbox";
import { Input } from "@/shared/ui/kit/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/kit/select";
import { Spinner } from "@/shared/ui/kit/spinner";

type ProjectsListBlockProps = {
  apiFilters: Pick<
    ProjectsListQuery,
    "q" | "member" | "acceptingApplications" | "sort" | "skillIds"
  >;
  emptyMessage: string;
};

function ProjectsListBlock({
  apiFilters,
  emptyMessage,
}: ProjectsListBlockProps) {
  const [cursor, setCursor] = useState<string | null>(null);
  const requestedCursors = useRef(new Set<string | null>([null]));
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const currentUser = useAppSelector(selectCurrentUser);

  const queryArgs = useMemo(
    () => ({
      ...apiFilters,
      cursor,
      limit: 10,
    }),
    [apiFilters, cursor]
  );

  const { data, isFetching, isLoading, error } =
    useGetProjectsListQuery(queryArgs);

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
        <ul className="grid gap-4">
          {items.map((project) => (
            <li key={project.id}>
              <ProjectCard
                project={project}
                isOwnedByCurrentUser={currentUser?.id === project.owner.id}
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
        <p className="rounded-xl border bg-card p-4 text-center text-muted-foreground">
          {emptyMessage}
        </p>
      ) : null}

      <div ref={sentinelRef} className="h-4" />
    </>
  );
}

function ProjectsPage() {
  const {
    feedFromUrl,
    titleInput,
    setTitleInput,
    setMember,
    setAcceptingApplications,
    setSort,
    setSkillIds,
    apiFilters,
    feedResetKey,
  } = useProjectsFeedUrl();

  const hasTextFilters =
    Boolean(feedFromUrl.q.trim()) ||
    feedFromUrl.member ||
    feedFromUrl.acceptingApplications ||
    feedFromUrl.skillIds.length > 0;

  const emptyMessage = hasTextFilters
    ? "По заданным условиям проекты не найдены"
    : "Пока нет проектов";

  return (
    <section className="mx-auto w-full max-w-3xl px-3 py-4 sm:px-4 sm:py-6 lg:py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <h1 className="text-xl font-semibold sm:text-2xl">Проекты</h1>
        <Button asChild className="shrink-0 self-start">
          <Link to={ROUTES.PROJECT_CREATE}>Создать проект</Link>
        </Button>
      </div>

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
              placeholder="Поиск по названию проекта…"
              aria-label="Поиск проектов по названию"
              maxLength={200}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex w-fit max-w-full items-center gap-2">
              <Checkbox
                id="projects-feed-member"
                checked={feedFromUrl.member}
                onCheckedChange={(checked) => setMember(checked === true)}
              />
              <label
                className="cursor-pointer text-sm leading-none whitespace-nowrap select-none"
                htmlFor="projects-feed-member"
              >
                Только проекты, где я участник
              </label>
            </div>

            <div className="flex w-fit max-w-full items-center gap-2">
              <Checkbox
                id="projects-feed-accepting"
                checked={feedFromUrl.acceptingApplications}
                onCheckedChange={(checked) =>
                  setAcceptingApplications(checked === true)
                }
              />
              <label
                className="cursor-pointer text-sm leading-none whitespace-nowrap select-none"
                htmlFor="projects-feed-accepting"
              >
                Только с открытыми заявками
              </label>
            </div>

            <span className="sr-only" id="projects-feed-sort-label">
              Порядок
            </span>
            <Select
              value={feedFromUrl.sort}
              onValueChange={(value) => setSort(value as ProjectsListSort)}
            >
              <SelectTrigger
                aria-labelledby="projects-feed-sort-label"
                className="h-10 min-w-44 sm:w-52"
                size="default"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper">
                <SelectItem value="new">Сначала новые</SelectItem>
                <SelectItem value="old">Сначала старые</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <ProjectsFeedSkillsFilter
            skillIds={feedFromUrl.skillIds}
            onSkillIdsChange={setSkillIds}
          />
        </div>
      </div>

      <div className="mt-6">
        <ProjectsListBlock
          key={feedResetKey}
          apiFilters={apiFilters}
          emptyMessage={emptyMessage}
        />
      </div>
    </section>
  );
}

export const Component = ProjectsPage;
