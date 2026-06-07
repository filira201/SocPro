const { sanitizeUser, displayPublicName } = require("../controllers/_utils");

const COMMENT_SORT = {
  NEW: "new",
  OLD: "old",
  TOP: "top",
};

function normalizeCommentSort(value) {
  if (value === COMMENT_SORT.OLD || value === COMMENT_SORT.TOP) {
    return value;
  }

  return COMMENT_SORT.NEW;
}

function getCommentOrderBy(sort) {
  if (sort === COMMENT_SORT.OLD) {
    return [{ createdAt: "asc" }];
  }

  if (sort === COMMENT_SORT.TOP) {
    return [
      { likes: { _count: "desc" } },
      { replies: { _count: "desc" } },
      { createdAt: "desc" },
    ];
  }

  return [{ createdAt: "desc" }];
}

function compareTopComments(a, b) {
  const aLikes = a._count?.likes ?? 0;
  const bLikes = b._count?.likes ?? 0;
  const aReplies = a._count?.replies ?? 0;
  const bReplies = b._count?.replies ?? 0;
  const aScore = aLikes + aReplies;
  const bScore = bLikes + bReplies;

  if (aScore !== bScore) {
    return bScore - aScore;
  }

  if (aLikes !== bLikes) {
    return bLikes - aLikes;
  }

  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

function mapPost(post, userId) {
  const sanitized = sanitizeUser(post);
  const likeCount = post.likes?.length ?? 0;
  const commentCount = post.comments?.length ?? 0;
  const isEdited =
    post.updatedAt &&
    post.createdAt &&
    new Date(post.updatedAt).getTime() !== new Date(post.createdAt).getTime();

  return {
    ...sanitized,
    likeCount,
    commentCount,
    likedByUser: post.likes?.some((like) => like.userId === userId) ?? false,
    isOwner: post.authorId === userId,
    isEdited,
  };
}

function mapComment(comment, userId) {
  const sanitized = sanitizeUser(comment);
  const isEdited =
    comment.updatedAt &&
    comment.createdAt &&
    new Date(comment.updatedAt).getTime() !==
      new Date(comment.createdAt).getTime();

  return {
    ...sanitized,
    likeCount: comment._count?.likes ?? 0,
    replyCount: comment._count?.replies ?? 0,
    likedByUser: (comment.likes?.length ?? 0) > 0,
    replyToUserId: comment.parent?.userId ?? null,
    replyToDisplayName: comment.parent?.user
      ? displayPublicName(comment.parent.user) || null
      : null,
    isReply: Boolean(comment.parentId),
    isOwner: comment.userId === userId,
    isEdited,
  };
}

function collectCommentLevelsByPost(comments) {
  if (!comments.length) {
    return [];
  }

  const ids = new Set(comments.map((comment) => comment.id));
  const childrenByParent = new Map();

  comments.forEach((comment) => {
    const parentId =
      comment.parentId && ids.has(comment.parentId) ? comment.parentId : null;
    const bucket = childrenByParent.get(parentId) || [];
    bucket.push(comment.id);
    childrenByParent.set(parentId, bucket);
  });

  const levels = [];
  const visited = new Set();
  let currentLevel = childrenByParent.get(null) || [];

  while (currentLevel.length) {
    const nextLevel = [];
    const normalizedLevel = [];

    currentLevel.forEach((id) => {
      if (visited.has(id)) {
        return;
      }

      visited.add(id);
      normalizedLevel.push(id);
      nextLevel.push(...(childrenByParent.get(id) || []));
    });

    if (normalizedLevel.length) {
      levels.push(normalizedLevel);
    }

    currentLevel = nextLevel;
  }

  const remaining = comments
    .map((comment) => comment.id)
    .filter((id) => !visited.has(id));

  if (remaining.length) {
    levels.push(remaining);
  }

  return levels;
}

module.exports = {
  COMMENT_SORT,
  normalizeCommentSort,
  getCommentOrderBy,
  compareTopComments,
  mapPost,
  mapComment,
  collectCommentLevelsByPost,
};
