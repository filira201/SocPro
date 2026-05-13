import { format, isValid, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import { Eye } from "lucide-react";
import { Link } from "react-router";

import { notificationTargetHref } from "../lib/notification-href";
import {
  notificationDescription,
  notificationTitle,
} from "../lib/notification-text";
import type { Notification } from "../model/types";

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
  const target = notificationTargetHref(n);
  const when = formatWhen(n.createdAt);
  const title = notificationTitle(n);
  const description = notificationDescription(n);

  const textBlock = (
    <div className="min-w-0 flex-1 space-y-1">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <span className="font-medium leading-snug">{title}</span>
        {!n.isRead ? (
          <span
            className="size-2 shrink-0 rounded-full bg-primary"
            aria-hidden
          />
        ) : null}
      </div>
      {description ? (
        <p className="text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      ) : null}
      {when ? <p className="text-xs text-muted-foreground">{when}</p> : null}
    </div>
  );

  const className = cn(
    "flex gap-3 rounded-xl border bg-card p-4 shadow-sm transition-colors",
    target && "hover:bg-muted/40",
    !n.isRead && "border-primary/25 bg-primary/[0.03]"
  );

  const mainContent = target ? (
    <Link
      to={target}
      className={cn(
        "min-w-0 flex-1 rounded-lg no-underline outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring",
        target && "hover:text-foreground"
      )}
    >
      {textBlock}
    </Link>
  ) : (
    <div className="min-w-0 flex-1">{textBlock}</div>
  );

  return (
    <article className={className}>
      {mainContent}
      {!n.isRead ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="shrink-0 self-start text-muted-foreground hover:text-foreground"
          aria-label="Отметить как прочитанное"
          disabled={isMarking}
          onClick={() => onMarkRead(n.id)}
        >
          <Eye className="size-4" />
        </Button>
      ) : null}
    </article>
  );
}
