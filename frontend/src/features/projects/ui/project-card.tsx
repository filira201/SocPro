import { href, Link } from "react-router";

import { displayPublicName } from "@/features/auth";
import { projectStatusLabel } from "@/features/projects/lib/format-project-status";
import type { ProjectListItem } from "@/features/projects/model/types";
import { ROUTES } from "@/shared/model/routes";
import { Badge } from "@/shared/ui/kit/badge";
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
  return (
    <Card className="transition-colors hover:bg-muted/40">
      <CardHeader className="gap-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <CardTitle className="text-lg leading-snug">
            <Link
              to={href(ROUTES.PROJECT_DETAILS, { id: project.id })}
              className="rounded-sm underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {project.title}
            </Link>
          </CardTitle>
          <Badge variant="secondary" className="shrink-0 font-normal">
            {projectStatusLabel(project.status)}
          </Badge>
        </div>
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
