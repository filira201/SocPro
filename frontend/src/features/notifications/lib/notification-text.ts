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
