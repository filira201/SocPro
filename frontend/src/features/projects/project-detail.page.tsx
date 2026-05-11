import { format, isValid, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import { useState } from "react";
import { href, Link, useParams } from "react-router";

import { useGetProjectByIdQuery } from "./api/projects.api";
import { getProjectPermissions } from "./lib/project-permissions";
import { projectStatusLabel } from "./lib/project-status-options";
import { ProjectApplicationsBadge } from "./ui/project-applications-badge";
import { ProjectApplicationsPanel } from "./ui/project-applications-panel";
import { ProjectApplySection } from "./ui/project-apply-section";
import { ProjectDeleteSection } from "./ui/project-delete-section";
import { ProjectEditForm } from "./ui/project-edit-form";
import { ProjectMembersPanel } from "./ui/project-members-panel";

import { displayPublicName, selectCurrentUser } from "@/features/auth";
import { getApiErrorMessage, type ApiError } from "@/shared/lib/api-error";
import { useAppSelector } from "@/shared/lib/redux";
import { ROUTES } from "@/shared/model/routes";
import { Badge } from "@/shared/ui/kit/badge";
import { Button } from "@/shared/ui/kit/button";
import { Spinner } from "@/shared/ui/kit/spinner";

const OBJECT_ID_REGEX = /^[a-f\d]{24}$/i;

type DetailTab = "overview" | "applications" | "members" | "settings";

function formatStatusAt(iso: string | null | undefined) {
  if (!iso) {
    return "—";
  }

  const d = parseISO(iso);

  return isValid(d) ? format(d, "d MMMM yyyy, HH:mm", { locale: ru }) : iso;
}

function ProjectDetailPage() {
  const { id } = useParams();
  const invalidId = !id || !OBJECT_ID_REGEX.test(id);
  const currentUser = useAppSelector(selectCurrentUser);
  const [tab, setTab] = useState<DetailTab>("overview");

  const {
    data: project,
    isLoading,
    isError,
    error,
  } = useGetProjectByIdQuery(id ?? "", { skip: invalidId || !id });

  const globalError = getApiErrorMessage(error as ApiError | undefined);

  const perms = project
    ? getProjectPermissions(project, currentUser?.id)
    : null;

  const ownerHref = project
    ? href(ROUTES.USER_DETAILS, { userId: project.owner.id })
    : "";

  const applications = project?.applications ?? [];
  const pendingApplicationsCount = applications.filter(
    (a) => a.status === "PENDING"
  ).length;

  return (
    <section className="mx-auto w-full max-w-3xl px-3 py-4 sm:px-4 sm:py-6 lg:py-8">
      <Link
        to={ROUTES.PROJECTS}
        className="text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        Назад к проектам
      </Link>

      {invalidId ? (
        <p className="mt-4 text-muted-foreground">Некорректная ссылка</p>
      ) : null}

      {!invalidId && isLoading ? (
        <div className="mt-8 flex justify-center text-muted-foreground">
          <Spinner />
        </div>
      ) : null}

      {!invalidId && !isLoading && isError ? (
        <p className="mt-4 text-destructive" role="alert">
          {globalError || "Не удалось загрузить проект"}
        </p>
      ) : null}

      {!invalidId && !isLoading && !isError && !project ? (
        <p className="mt-4 rounded-xl border bg-card p-4 text-center text-muted-foreground">
          Проект не найден
        </p>
      ) : null}

      {project && perms ? (
        <div className="mt-6 grid gap-4">
          <header className="rounded-xl border bg-card p-4 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h1 className="text-xl font-semibold leading-tight sm:text-2xl">
                {project.title}
              </h1>
              <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                <ProjectApplicationsBadge
                  acceptingApplications={project.acceptingApplications}
                  className="text-sm font-normal"
                />
                <Badge variant="secondary" className="text-sm font-normal">
                  {projectStatusLabel(project.status)}
                </Badge>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span>
                Владелец:{" "}
                <Link
                  to={ownerHref}
                  className="text-foreground underline-offset-4 hover:underline"
                >
                  {displayPublicName(project.owner)}
                </Link>
              </span>
              <span>
                Участников:{" "}
                <span className="text-foreground">
                  {project.members?.length ?? 0}
                </span>
              </span>
            </div>

            <div
              className="mt-4 flex flex-wrap gap-2 border-t pt-4"
              role="tablist"
              aria-label="Разделы проекта"
            >
              <Button
                type="button"
                size="sm"
                variant={tab === "overview" ? "default" : "outline"}
                onClick={() => setTab("overview")}
              >
                Обзор
              </Button>
              {perms.canManageProject ? (
                <Button
                  type="button"
                  size="sm"
                  variant={tab === "applications" ? "default" : "outline"}
                  onClick={() => setTab("applications")}
                >
                  Заявки
                  {pendingApplicationsCount
                    ? ` (${pendingApplicationsCount})`
                    : null}
                </Button>
              ) : null}
              <Button
                type="button"
                size="sm"
                variant={tab === "members" ? "default" : "outline"}
                onClick={() => setTab("members")}
              >
                Участники
              </Button>
              {perms.canManageProject ? (
                <Button
                  type="button"
                  size="sm"
                  variant={tab === "settings" ? "default" : "outline"}
                  onClick={() => setTab("settings")}
                >
                  Настройки
                </Button>
              ) : null}
            </div>
          </header>

          <div className="rounded-xl border bg-card p-4 sm:p-6">
            {tab === "overview" ? (
              <div className="grid gap-6 text-sm">
                <section className="grid gap-2">
                  <h2 className="font-medium text-foreground">Описание</h2>
                  <p className="whitespace-pre-wrap text-muted-foreground">
                    {project.description}
                  </p>
                </section>

                <section className="grid gap-2">
                  <h2 className="font-medium text-foreground">Цели</h2>
                  <p className="whitespace-pre-wrap text-muted-foreground">
                    {project.goals}
                  </p>
                </section>

                <section className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <h2 className="font-medium text-foreground">
                      Статус обновлён
                    </h2>
                    <p className="text-muted-foreground">
                      {formatStatusAt(project.statusUpdatedAt)}
                    </p>
                  </div>
                  <div className="grid gap-2">
                    <h2 className="font-medium text-foreground">Заявки</h2>
                    <div className="flex flex-wrap items-center gap-2">
                      <ProjectApplicationsBadge
                        acceptingApplications={project.acceptingApplications}
                      />
                      <span className="text-muted-foreground">
                        {project.acceptingApplications
                          ? "Можно подать заявку на участие в проекте."
                          : "Новые заявки сейчас не принимаются."}
                      </span>
                    </div>
                  </div>
                </section>

                <section className="grid gap-2">
                  <h2 className="font-medium text-foreground">
                    Требуемые навыки
                  </h2>
                  {project.requiredSkills?.length ? (
                    <ul className="flex flex-wrap gap-2">
                      {project.requiredSkills.map((s) => (
                        <li key={s.id}>
                          <Badge variant="outline" className="font-normal">
                            {s.name}
                          </Badge>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-muted-foreground">Не указаны</p>
                  )}
                </section>

                {currentUser?.id ? (
                  <section className="grid gap-2 border-t pt-4">
                    <h2 className="font-medium text-foreground">Участие</h2>
                    <ProjectApplySection project={project} />
                  </section>
                ) : null}
              </div>
            ) : null}

            {tab === "applications" && perms.canManageProject ? (
              <div className="grid gap-2">
                <h2 className="text-base font-semibold">Заявки на участие</h2>
                <ProjectApplicationsPanel
                  projectId={project.id}
                  applications={applications}
                />
              </div>
            ) : null}

            {tab === "members" ? (
              <div className="grid gap-2">
                <h2 className="text-base font-semibold">Участники</h2>
                {currentUser?.id ? (
                  <ProjectMembersPanel
                    project={project}
                    currentUserId={currentUser.id}
                    canManageMembers={perms.canManageMembers}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Войдите, чтобы видеть действия с участниками.
                  </p>
                )}
              </div>
            ) : null}

            {tab === "settings" && perms.canManageProject ? (
              <div className="grid gap-8">
                <div>
                  <h2 className="mb-4 text-base font-semibold">
                    Редактирование проекта
                  </h2>
                  <ProjectEditForm project={project} />
                </div>
                {perms.isOwner ? (
                  <ProjectDeleteSection
                    projectId={project.id}
                    projectTitle={project.title}
                  />
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}

export const Component = ProjectDetailPage;
