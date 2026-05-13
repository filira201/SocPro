import type { ReactNode } from "react";
import { href, Link } from "react-router";

import { getNotificationDescriptionParts } from "../lib/notification-text";
import type { Notification } from "../model/types";

import { ROUTES } from "@/shared/model/routes";

function UserProfileLink({
  userId,
  children,
}: {
  userId: string;
  children: ReactNode;
}) {
  return (
    <Link
      to={href(ROUTES.USER_DETAILS, { userId })}
      className="font-medium text-foreground underline-offset-2 hover:underline"
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </Link>
  );
}

export function NotificationDescription({
  notification,
}: {
  notification: Notification;
}) {
  const parts = getNotificationDescriptionParts(notification);

  if (parts.kind === "plain") {
    if (!parts.text) {
      return null;
    }

    return (
      <p className="text-sm leading-relaxed text-muted-foreground">
        {parts.text}
      </p>
    );
  }

  if (parts.kind === "staff-invite-sent") {
    return (
      <p className="text-sm leading-relaxed text-muted-foreground">
        <UserProfileLink userId={parts.actorUserId}>
          {parts.actorLabel}
        </UserProfileLink>
        {" отправил(а) приглашение пользователю "}
        <UserProfileLink userId={parts.subjectUserId}>
          {parts.subjectLabel}
        </UserProfileLink>
        .
      </p>
    );
  }

  if (parts.kind === "actor-inline") {
    return (
      <p className="text-sm leading-relaxed text-muted-foreground">
        {parts.before}
        <UserProfileLink userId={parts.profileUserId}>
          {parts.actorLabel}
        </UserProfileLink>
        {parts.after}
      </p>
    );
  }

  return (
    <p className="text-sm leading-relaxed text-muted-foreground">
      <UserProfileLink userId={parts.profileUserId}>
        {parts.actorLabel}
      </UserProfileLink>
      {parts.afterActor}
    </p>
  );
}
