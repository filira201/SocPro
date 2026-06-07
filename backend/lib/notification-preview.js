const COMMENT_PREVIEW_MAX = 120;

function truncateCommentPreview(content) {
  const trimmed = String(content || "").trim();

  if (trimmed.length <= COMMENT_PREVIEW_MAX) {
    return trimmed;
  }

  return `${trimmed.slice(0, COMMENT_PREVIEW_MAX - 1)}…`;
}

module.exports = {
  COMMENT_PREVIEW_MAX,
  truncateCommentPreview,
};
