/** Значения ProjectStatus с бэка (Prisma). */
export const PROJECT_STATUS_VALUES = [
  "OPEN",
  "IN_PROGRESS",
  "PAUSED",
  "DONE",
  "CLOSED",
] as const;

export type ProjectStatusValue = (typeof PROJECT_STATUS_VALUES)[number];

export const PROJECT_STATUS_OPTIONS: {
  value: ProjectStatusValue;
  label: string;
}[] = [
  { value: "OPEN", label: "Открыт" },
  { value: "IN_PROGRESS", label: "В работе" },
  { value: "PAUSED", label: "На паузе" },
  { value: "DONE", label: "Выполнен" },
  { value: "CLOSED", label: "Закрыт" },
];

const PROJECT_STATUS_LABEL_BY_VALUE: Record<string, string> =
  Object.fromEntries(
    PROJECT_STATUS_OPTIONS.map(({ value, label }) => [value, label])
  );

/** Человекочитаемый статус для карточек и деталки (неизвестное значение — как пришло с API). */
export function projectStatusLabel(status: string) {
  return PROJECT_STATUS_LABEL_BY_VALUE[status] ?? status;
}

export function isTerminalProjectStatus(status: string) {
  return status === "DONE" || status === "CLOSED";
}
