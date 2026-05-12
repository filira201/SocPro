import { FileText } from "lucide-react";
import { href, Link } from "react-router";

import { displayPublicName } from "@/features/auth";
import { projectStatusLabel } from "@/features/projects/lib/project-status-options";
import type { ProjectListItem } from "@/features/projects/model/types";
import { ProjectApplicationsBadge } from "@/features/projects/ui/project-applications-badge";
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
  isOwnedByCurrentUser?: boolean;
  /** Показать бейдж «Автор», если владелец проекта — этот пользователь (страница чужого/своего профиля). */
  authorBadgeForUserId?: string;
};

function excerpt(text: string, maxLen: number) {
  const t = text.trim();

  if (t.length <= maxLen) {
    return t;
  }

  return `${t.slice(0, maxLen).trim()}…`;
}

export function ProjectCard({
  project,
  isOwnedByCurrentUser = false,
  authorBadgeForUserId,
}: ProjectCardProps) {
  const attachmentCount = project._count.attachments ?? 0;
  const showAuthorBadge =
    Boolean(authorBadgeForUserId) &&
    project.owner.id === authorBadgeForUserId &&
    !isOwnedByCurrentUser;

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
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
            {isOwnedByCurrentUser ? (
              <Badge
                variant="ghost"
                className="px-2.5 py-3.5 text-sm font-normal"
              >
                Мой проект
              </Badge>
            ) : null}
            {showAuthorBadge ? (
              <Badge
                variant="ghost"
                className="px-2.5 py-3.5 text-sm font-normal"
              >
                Автор
              </Badge>
            ) : null}
            <ProjectApplicationsBadge
              acceptingApplications={project.acceptingApplications}
              compact
              className="px-2.5 py-3.5 text-sm font-normal"
            />
            <Badge
              variant="secondary"
              className="px-2.5 py-3.5 text-sm font-normal"
            >
              {projectStatusLabel(project.status)}
            </Badge>
            {attachmentCount > 0 ? (
              <Badge
                variant="outline"
                className="gap-1 px-2.5 py-3.5 text-sm font-normal"
              >
                <FileText className="size-3.5 shrink-0" aria-hidden />
                {attachmentCount}
              </Badge>
            ) : null}
          </div>
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
