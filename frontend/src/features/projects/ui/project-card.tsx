import { Link } from "react-router";

import { displayPublicName } from "@/features/auth";
import type { ProjectListItem } from "@/features/projects/model/types";
import { ROUTES } from "@/shared/model/routes";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/kit/card";

type ProjectCardProps = {
  project: ProjectListItem;
};

function excerpt(text: string, maxLen: number) {
  const t = text.trim();

  if (t.length <= maxLen) {
    return t;
  }

  return `${t.slice(0, maxLen).trim()}…`;
}

export function ProjectCard({ project }: ProjectCardProps) {
  const href = ROUTES.PROJECT_DETAILS.replace(":id", project.id);

  return (
    <Card className="transition-colors hover:bg-muted/40">
      <CardHeader className="gap-2">
        <CardTitle className="text-lg leading-snug">
          <Link
            to={href}
            className="rounded-sm underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {project.title}
          </Link>
        </CardTitle>
        <CardDescription className="line-clamp-3 text-sm">
          {excerpt(project.description, 220)}
        </CardDescription>
        <p className="text-xs text-muted-foreground">
          {displayPublicName(project.owner)} · участников:{" "}
          {project._count.members}
        </p>
      </CardHeader>
    </Card>
  );
}
