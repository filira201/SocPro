import { Link } from "react-router";

import { ROUTES } from "@/shared/model/routes";

function ProjectCreatePage() {
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
      <p className="mt-4 rounded-xl border bg-card p-4 text-muted-foreground">
        Страница в разработке.
      </p>
    </section>
  );
}

export const Component = ProjectCreatePage;
