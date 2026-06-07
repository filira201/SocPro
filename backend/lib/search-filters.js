const MAX_POST_SEARCH_Q = 200;

function buildPostSearchFilter(qRaw) {
  const q = String(qRaw ?? "")
    .trim()
    .slice(0, MAX_POST_SEARCH_Q);

  if (!q) {
    return null;
  }

  const tokens = q.split(/\s+/).filter(Boolean);

  if (!tokens.length) {
    return null;
  }

  const tokenClause = (t) => ({
    OR: [
      { content: { contains: t, mode: "insensitive" } },
      { author: { firstName: { contains: t, mode: "insensitive" } } },
      { author: { lastName: { contains: t, mode: "insensitive" } } },
      { author: { patronymic: { contains: t, mode: "insensitive" } } },
    ],
  });

  if (tokens.length === 1) {
    return tokenClause(tokens[0]);
  }

  return {
    AND: tokens.map(tokenClause),
  };
}

module.exports = {
  MAX_POST_SEARCH_Q,
  buildPostSearchFilter,
};
