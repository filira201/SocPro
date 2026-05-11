/** Синхронно с frontend: features/projects/lib/project-attachments.ts */
const MAX_PROJECT_ATTACHMENTS = 10;

const PROJECT_ATTACHMENTS_LIMIT_ERROR =
  "Можно прикрепить не более 10 документов";

module.exports = {
  MAX_PROJECT_ATTACHMENTS,
  PROJECT_ATTACHMENTS_LIMIT_ERROR,
};
