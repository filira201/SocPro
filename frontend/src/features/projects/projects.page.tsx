import { Link } from "react-router";

import { useGetProjectsListQuery } from "./api/projects.api";
import { ProjectCard } from "./ui/project-card";

import { getApiErrorMessage } from "@/shared/lib/api-error";
import { ROUTES } from "@/shared/model/routes";
import { Button } from "@/shared/ui/kit/button";
import { Spinner } from "@/shared/ui/kit/spinner";

function ProjectsPage() {
  const { data, isLoading, error } = useGetProjectsListQuery();

  const items = data?.items ?? [];
  const globalError = getApiErrorMessage(error);

  return (
    <section className="mx-auto w-full max-w-3xl px-3 py-4 sm:px-4 sm:py-6 lg:py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <h1 className="text-xl font-semibold sm:text-2xl">Проекты</h1>
        <Button asChild className="shrink-0 self-start">
          <Link to={ROUTES.PROJECT_CREATE}>Создать проект</Link>
        </Button>
      </div>

      {globalError ? (
        <p className="mt-4 text-destructive" role="alert">
          {globalError}
        </p>
      ) : null}

      {isLoading ? (
        <div className="mt-8 flex justify-center text-muted-foreground">
          <Spinner />
        </div>
      ) : null}

      {!isLoading && !globalError && items.length === 0 ? (
        <p className="mt-6 rounded-xl border bg-card p-4 text-center text-muted-foreground">
          Пока нет проектов
        </p>
      ) : null}

      {!isLoading && items.length > 0 ? (
        <ul className="mt-6 grid gap-4">
          {items.map((project) => (
            <li key={project.id}>
              <ProjectCard project={project} />
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

export const Component = ProjectsPage;
