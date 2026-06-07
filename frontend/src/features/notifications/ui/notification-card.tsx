import { format, isValid, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import { Eye } from "lucide-react";
import { useNavigate } from "react-router";

import { notificationTargetHref } from "../lib/notification-href";
import { notificationTitle } from "../lib/notification-text";
import type { Notification } from "../model/types";

import { NotificationDescription } from "./notification-description";

import { cn } from "@/shared/lib/css";
import { Button } from "@/shared/ui/kit/button";

function formatWhen(iso: string) {
  const d = parseISO(iso);

  if (!isValid(d)) {
    return "";
  }

  return format(d, "d MMM yyyy, HH:mm", { locale: ru });
}

export type NotificationCardProps = {
  notification: Notification;
  onMarkRead: (id: string) => void;
  isMarking?: boolean;
};

export function NotificationCard({
  notification: n,
  onMarkRead,
  isMarking,
}: NotificationCardProps) {
  const navigate = useNavigate();
  const target = notificationTargetHref(n);
  const when = formatWhen(n.createdAt);
  const title = notificationTitle(n);

  const handleCardActivate = () => {
    if (target) {
      navigate(target);
    }
  };

  const textBlock = (
    <div className="min-w-0 flex-1 space-y-1">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <span className="font-medium leading-snug">{title}</span>
        <span className="size-2 shrink-0 rounded-full bg-primary" aria-hidden />
      </div>
      <NotificationDescription notification={n} />
      {when ? <p className="text-xs text-muted-foreground">{when}</p> : null}
    </div>
  );

  const className = cn(
    "flex gap-3 rounded-xl border bg-card p-4 shadow-sm transition-colors",
    target &&
      "cursor-pointer outline-none ring-offset-background hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring",
    "border-primary/25 bg-primary/[0.03]"
  );

  return (
    <article
      className={className}
      tabIndex={target ? 0 : undefined}
      aria-label={target ? "Открыть связанную страницу" : undefined}
      onClick={target ? handleCardActivate : undefined}
      onKeyDown={
        target
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleCardActivate();
              }
            }
          : undefined
      }
    >
      <div className={cn("min-w-0 flex-1", target && "hover:text-foreground")}>
        {textBlock}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="shrink-0 self-start text-muted-foreground hover:text-foreground"
        aria-label="Отметить как прочитанное"
        disabled={isMarking}
        onClick={(e) => {
          e.stopPropagation();
          onMarkRead(n.id);
        }}
      >
        <Eye className="size-4" />
      </Button>
    </article>
  );
}
