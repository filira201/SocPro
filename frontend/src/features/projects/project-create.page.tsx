import { Link, useNavigate } from "react-router";

import { ProjectCreateForm } from "./ui/project-create-form";

import { ROUTES } from "@/shared/model/routes";

function ProjectCreatePage() {
  const navigate = useNavigate();

  return (
    <section className="mx-auto w-full max-w-3xl px-3 py-4 sm:px-4 sm:py-6 lg:py-8">
      <Link
        to={ROUTES.PROJECTS}
        className="text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        Назад к проектам
      </Link>
      <h1 className="mt-4 text-xl font-semibold sm:text-2xl">
        Создание проекта
      </h1>

      <ProjectCreateForm onCancel={() => navigate(ROUTES.PROJECTS)} />
    </section>
  );
}

export const Component = ProjectCreatePage;
