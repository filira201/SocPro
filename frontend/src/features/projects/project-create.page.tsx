import { useNavigate } from "react-router";

import { ProjectCreateForm } from "./ui/project-create-form";

import { Button } from "@/shared/ui/kit/button";

function ProjectCreatePage() {
  const navigate = useNavigate();

  return (
    <section className="mx-auto w-full max-w-3xl px-3 py-4 sm:px-4 sm:py-6 lg:py-8">
      <Button
        type="button"
        variant="ghost"
        className="text-muted-foreground"
        onClick={() => navigate(-1)}
      >
        Назад
      </Button>
      <h1 className="mt-4 text-xl font-semibold sm:text-2xl">
        Создание проекта
      </h1>

      <ProjectCreateForm onCancel={() => navigate(-1)} />
    </section>
  );
}

export const Component = ProjectCreatePage;
