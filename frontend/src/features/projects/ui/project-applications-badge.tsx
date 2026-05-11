import { cn } from "@/shared/lib/css";
import { Badge } from "@/shared/ui/kit/badge";

type ProjectApplicationsBadgeProps = {
  acceptingApplications: boolean;
  /** На карточке списка — компактная подпись */
  compact?: boolean;
  className?: string;
};

/** Видно с первого взгляда: можно ли подать заявку на участие. */
export function ProjectApplicationsBadge({
  acceptingApplications,
  compact = false,
  className,
}: ProjectApplicationsBadgeProps) {
  if (acceptingApplications) {
    return (
      <Badge
        variant="default"
        className={cn("px-2.5 py-3.5 text-sm font-normal", className)}
        title="Можно подать заявку на участие — откройте карточку проекта"
      >
        {compact ? "Приём открыт" : "Принимаем заявки"}
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className={cn("px-2.5 py-3.5 text-sm font-normal", className)}
      title="Новые заявки не принимаются"
    >
      {compact ? "Приём закрыт" : "Заявки не принимаются"}
    </Badge>
  );
}
