import { z } from "zod";

import { PROJECT_APPLICATION_MESSAGE_MAX } from "./project-field-limits";

/** Сообщение заявки или приглашения: может быть пустым после trim, не более 1000 символов. */
export const projectApplicationMessageSchema = z
  .string()
  .trim()
  .max(
    PROJECT_APPLICATION_MESSAGE_MAX,
    `Не более ${PROJECT_APPLICATION_MESSAGE_MAX} символов`
  );
