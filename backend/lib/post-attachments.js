/** Синхронно с frontend: features/posts/lib/post-attachments.ts */
const MAX_POST_ATTACHMENTS = 10;

const POST_ATTACHMENTS_LIMIT_ERROR = "Можно прикрепить не более 10 файлов";

module.exports = {
  MAX_POST_ATTACHMENTS,
  POST_ATTACHMENTS_LIMIT_ERROR,
};
