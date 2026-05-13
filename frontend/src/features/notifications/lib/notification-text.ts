import type { Notification, NotificationType } from "../model/types";

import { displayPublicName } from "@/features/auth";

function actorName(n: Pick<Notification, "actor">): string {
  return n.actor
    ? displayPublicName(n.actor) || "Пользователь"
    : "Пользователь";
}

function subjectName(n: Pick<Notification, "subjectUser">): string {
  return n.subjectUser
    ? displayPublicName(n.subjectUser) || "Пользователь"
    : "Пользователь";
}

const TITLES: Record<NotificationType, (n: Notification) => string> = {
  POST_LIKED: () => "Лайк публикации",
  COMMENT_LIKED: () => "Лайк комментария",
  POST_COMMENTED: () => "Комментарий к публикации",
  COMMENT_REPLIED: () => "Ответ на комментарий",
  USER_FOLLOWED: () => "Новая подписка",
  PROJECT_APPLICATION_SUBMITTED_SELF: () => "Заявка отправлена",
  PROJECT_APPLICATION_WITHDRAWN_SELF: () => "Заявка отозвана",
  PROJECT_INVITE_DECLINED_SELF: () => "Приглашение отклонено",
  PROJECT_APPLICATION_ACCEPTED: () => "Заявка принята",
  PROJECT_APPLICATION_REJECTED: () => "Заявка отклонена",
  PROJECT_INVITE_RECEIVED: () => "Приглашение в проект",
  PROJECT_MEMBER_PROMOTED_ADMIN: () => "Назначение администратором",
  PROJECT_MEMBER_DEMOTED_FROM_ADMIN: () => "Снятие роли администратора",
  PROJECT_MEMBER_REMOVED: () => "Исключение из проекта",
  PROJECT_DELETED: () => "Проект удалён",
  STAFF_NEW_APPLICATION: () => "Новая заявка в проект",
  STAFF_APPLICATION_WITHDRAWN: () => "Заявка отозвана",
  STAFF_INVITE_DECLINED_BY_INVITEE: () => "Приглашение отклонено",
  STAFF_INVITE_SENT: () => "Приглашение в проект",
  STAFF_INVITE_ACCEPTED: () => "Приглашение принято",
};

const DESCRIPTIONS: Record<NotificationType, (n: Notification) => string> = {
  POST_LIKED: (n) => `${actorName(n)} оценил(а) вашу публикацию.`,
  COMMENT_LIKED: (n) => `${actorName(n)} оценил(а) ваш комментарий.`,
  POST_COMMENTED: (n) =>
    `${actorName(n)} оставил(а) комментарий к вашей публикации.`,
  COMMENT_REPLIED: (n) => `${actorName(n)} ответил(а) на ваш комментарий.`,
  USER_FOLLOWED: (n) => `${actorName(n)} подписался(ась) на вас.`,
  PROJECT_APPLICATION_SUBMITTED_SELF: () =>
    "Вы подали заявку на участие в проекте.",
  PROJECT_APPLICATION_WITHDRAWN_SELF: () =>
    "Вы отозвали заявку на участие в проекте.",
  PROJECT_INVITE_DECLINED_SELF: () => "Вы отклонили приглашение в проект.",
  PROJECT_APPLICATION_ACCEPTED: (n) =>
    n.actor
      ? `Заявку одобрил(а) ${actorName(n)}. Вы в составе проекта.`
      : "Вас приняли в проект.",
  PROJECT_APPLICATION_REJECTED: (n) =>
    `${actorName(n)} отклонил(а) вашу заявку на участие.`,
  PROJECT_INVITE_RECEIVED: (n) => `${actorName(n)} пригласил(а) вас в проект.`,
  PROJECT_MEMBER_PROMOTED_ADMIN: (n) =>
    `${actorName(n)} назначил(а) вас администратором проекта.`,
  PROJECT_MEMBER_DEMOTED_FROM_ADMIN: (n) =>
    `${actorName(n)} снял(а) с вас роль администратора проекта.`,
  PROJECT_MEMBER_REMOVED: (n) => `${actorName(n)} исключил(а) вас из проекта.`,
  PROJECT_DELETED: (n) => {
    const title = n.projectTitleSnapshot?.trim() || "Проект";

    return `${actorName(n)} удалил(а) проект «${title}».`;
  },
  STAFF_NEW_APPLICATION: (n) =>
    `${actorName(n)} подал(а) заявку на участие в проекте.`,
  STAFF_APPLICATION_WITHDRAWN: (n) =>
    `${actorName(n)} отозвал(а) заявку на участие в проекте.`,
  STAFF_INVITE_DECLINED_BY_INVITEE: (n) =>
    `${actorName(n)} отклонил(а) приглашение в проект.`,
  STAFF_INVITE_SENT: (n) =>
    `${actorName(n)} отправил(а) приглашение пользователю ${subjectName(n)}.`,
  STAFF_INVITE_ACCEPTED: (n) =>
    `${actorName(n)} принял(а) приглашение в проект.`,
};

export function notificationTitle(n: Notification): string {
  return TITLES[n.type]?.(n) ?? "Уведомление";
}

export function notificationDescription(n: Notification): string {
  return DESCRIPTIONS[n.type]?.(n) ?? "";
}

/** Типы, где описание начинается с имени `actor` (можно вести на профиль). */
const ACTOR_LEAD_DESCRIPTION_TYPES = new Set<NotificationType>([
  "POST_LIKED",
  "COMMENT_LIKED",
  "POST_COMMENTED",
  "COMMENT_REPLIED",
  "USER_FOLLOWED",
  "PROJECT_APPLICATION_REJECTED",
  "PROJECT_INVITE_RECEIVED",
  "PROJECT_MEMBER_PROMOTED_ADMIN",
  "PROJECT_MEMBER_DEMOTED_FROM_ADMIN",
  "PROJECT_MEMBER_REMOVED",
  "PROJECT_DELETED",
  "STAFF_NEW_APPLICATION",
  "STAFF_APPLICATION_WITHDRAWN",
  "STAFF_INVITE_DECLINED_BY_INVITEE",
  "STAFF_INVITE_SENT",
  "STAFF_INVITE_ACCEPTED",
]);

export type NotificationDescriptionParts =
  | { kind: "plain"; text: string }
  | {
      kind: "actor-lead";
      profileUserId: string;
      actorLabel: string;
      afterActor: string;
    }
  | {
      kind: "actor-inline";
      before: string;
      profileUserId: string;
      actorLabel: string;
      after: string;
    }
  | {
      kind: "staff-invite-sent";
      actorUserId: string;
      actorLabel: string;
      subjectUserId: string;
      subjectLabel: string;
    };

const APPLICATION_ACCEPTED_PREFIX = "Заявку одобрил(а) ";
const APPLICATION_ACCEPTED_SUFFIX = ". Вы в составе проекта.";

const STAFF_INVITE_SENT_MIDDLE = " отправил(а) приглашение пользователю ";
const STAFF_INVITE_SENT_END = ".";

export function getNotificationDescriptionParts(
  n: Notification
): NotificationDescriptionParts {
  const text = notificationDescription(n);

  if (!text) {
    return { kind: "plain", text: "" };
  }

  if (
    n.type === "PROJECT_APPLICATION_ACCEPTED" &&
    n.actor?.id &&
    text.startsWith(APPLICATION_ACCEPTED_PREFIX) &&
    text.endsWith(APPLICATION_ACCEPTED_SUFFIX)
  ) {
    const label = actorName(n);
    const middle = text.slice(
      APPLICATION_ACCEPTED_PREFIX.length,
      text.length - APPLICATION_ACCEPTED_SUFFIX.length
    );

    if (middle === label) {
      return {
        kind: "actor-inline",
        before: APPLICATION_ACCEPTED_PREFIX,
        profileUserId: n.actor.id,
        actorLabel: label,
        after: APPLICATION_ACCEPTED_SUFFIX,
      };
    }
  }

  if (n.type === "STAFF_INVITE_SENT" && n.actor?.id && n.subjectUser?.id) {
    const aLabel = actorName(n);
    const sLabel = subjectName(n);
    const expected = `${aLabel}${STAFF_INVITE_SENT_MIDDLE}${sLabel}${STAFF_INVITE_SENT_END}`;

    if (text === expected) {
      return {
        kind: "staff-invite-sent",
        actorUserId: n.actor.id,
        actorLabel: aLabel,
        subjectUserId: n.subjectUser.id,
        subjectLabel: sLabel,
      };
    }
  }

  if (!n.actor?.id || !ACTOR_LEAD_DESCRIPTION_TYPES.has(n.type)) {
    return { kind: "plain", text };
  }

  const label = actorName(n);

  if (!text.startsWith(label)) {
    return { kind: "plain", text };
  }

  return {
    kind: "actor-lead",
    profileUserId: n.actor.id,
    actorLabel: label,
    afterActor: text.slice(label.length),
  };
}
