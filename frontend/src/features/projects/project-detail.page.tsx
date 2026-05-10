import { format, isValid, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import { href, Link, useParams } from "react-router";

import { useGetProjectByIdQuery } from "./api/projects.api";
import { projectStatusLabel } from "./lib/format-project-status";

import { displayPublicName } from "@/features/auth";
import { getApiErrorMessage, type ApiError } from "@/shared/lib/api-error";
import { ROUTES } from "@/shared/model/routes";
import { Badge } from "@/shared/ui/kit/badge";
import { Spinner } from "@/shared/ui/kit/spinner";

const OBJECT_ID_REGEX = /^[a-f\d]{24}$/i;

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

  const {
    data: project,
    isLoading,
    isError,
    error,
  } = useGetProjectByIdQuery(id ?? "", { skip: invalidId || !id });

  const globalError = getApiErrorMessage(error as ApiError | undefined);

  const ownerHref = project
    ? href(ROUTES.USER_DETAILS, { userId: project.owner.id })
    : "";

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

      {project ? (
        <article className="mt-6 grid gap-6 rounded-xl border bg-card p-4 sm:p-6">
          <header className="flex flex-col gap-2">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h1 className="text-xl font-semibold leading-tight sm:text-2xl">
                {project.title}
              </h1>
              <Badge
                variant="secondary"
                className="shrink-0 text-sm font-normal"
              >
                {projectStatusLabel(project.status)}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
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
          </header>

          <section className="grid gap-2 text-sm">
            <h2 className="font-medium text-foreground">Описание</h2>
            <p className="whitespace-pre-wrap text-muted-foreground">
              {project.description}
            </p>
          </section>

          <section className="grid gap-2 text-sm">
            <h2 className="font-medium text-foreground">Цели</h2>
            <p className="whitespace-pre-wrap text-muted-foreground">
              {project.goals}
            </p>
          </section>

          <section className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <h2 className="font-medium text-foreground">Статус обновлён</h2>
              <p className="text-muted-foreground">
                {formatStatusAt(project.statusUpdatedAt)}
              </p>
            </div>
            <div>
              <h2 className="font-medium text-foreground">Заявки</h2>
              <p className="text-muted-foreground">
                {project.acceptingApplications
                  ? "Принимаем новые заявки"
                  : "Новые заявки не принимаются"}
              </p>
            </div>
          </section>

          <section className="grid gap-2 text-sm">
            <h2 className="font-medium text-foreground">Требуемые навыки</h2>
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
        </article>
      ) : null}
    </section>
  );
}

export const Component = ProjectDetailPage;
