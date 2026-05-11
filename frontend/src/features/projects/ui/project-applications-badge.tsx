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
  const base = "px-2.5 py-3.5 text-sm font-normal";

  if (acceptingApplications) {
    return (
      <Badge
        variant="outline"
        className={cn(
          base,
          "border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:border-emerald-500/35 dark:bg-emerald-500/15 dark:text-emerald-300",
          className
        )}
        title="Можно подать заявку на участие — откройте карточку проекта"
      >
        {compact ? "Приём открыт" : "Принимаем заявки"}
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        base,
        "border-destructive/50 bg-destructive/10 text-destructive dark:border-destructive/50 dark:bg-destructive/15 dark:text-destructive",
        className
      )}
      title="Новые заявки не принимаются"
    >
      {compact ? "Приём закрыт" : "Заявки не принимаются"}
    </Badge>
  );
}
