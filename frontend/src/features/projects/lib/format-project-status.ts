const PROJECT_STATUS_LABELS: Record<string, string> = {
  OPEN: "Открыт",
  IN_PROGRESS: "В работе",
  PAUSED: "На паузе",
  DONE: "Выполнен",
  CLOSED: "Закрыт",
};

export function projectStatusLabel(status: string) {
  return PROJECT_STATUS_LABELS[status] ?? status;
}
