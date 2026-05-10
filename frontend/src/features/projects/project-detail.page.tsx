import { Link, useParams } from "react-router";

import { ROUTES } from "@/shared/model/routes";

const OBJECT_ID_REGEX = /^[a-f\d]{24}$/i;

function ProjectDetailPage() {
  const { id } = useParams();

  const invalidId = !id || !OBJECT_ID_REGEX.test(id);

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
      ) : (
        <>
          <h1 className="mt-4 text-xl font-semibold sm:text-2xl">Проект</h1>
          <p className="mt-4 rounded-xl border bg-card p-4 text-muted-foreground">
            Страница в разработке.
          </p>
        </>
      )}
    </section>
  );
}

export const Component = ProjectDetailPage;
