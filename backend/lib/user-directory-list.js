const { prisma } = require("../prisma/prismaClient");
const { sanitizeUser } = require("../controllers/_utils");

const MAX_USER_FIO_SEARCH_Q = 200;

/**
 * Поиск по частям ФИО: слова через пробел — каждое слово должно встретиться
 * хотя бы в одном из полей (имя / фамилия / отчество).
 */
function buildUserFioSearchFilter(qRaw) {
  const q = String(qRaw ?? "")
    .trim()
    .slice(0, MAX_USER_FIO_SEARCH_Q);

  if (!q) {
    return null;
  }

  const tokens = q.split(/\s+/).filter(Boolean);

  if (!tokens.length) {
    return null;
  }

  const tokenClause = (t) => ({
    OR: [
      { firstName: { contains: t, mode: "insensitive" } },
      { lastName: { contains: t, mode: "insensitive" } },
      { patronymic: { contains: t, mode: "insensitive" } },
    ],
  });

  if (tokens.length === 1) {
    return tokenClause(tokens[0]);
  }

  return {
    AND: tokens.map(tokenClause),
  };
}

async function mapUsersWithFollowingFlag(viewerId, rawUsers) {
  if (!rawUsers.length) {
    return [];
  }

  const ids = rawUsers.map((u) => u.id);

  const links = await prisma.follows.findMany({
    where: {
      followerId: viewerId,
      followingId: { in: ids },
    },
    select: { followingId: true },
  });

  const followingSet = new Set(links.map((l) => l.followingId));

  return rawUsers.map((u) => ({
    ...sanitizeUser(u),
    isFollowing: followingSet.has(u.id),
  }));
}

module.exports = {
  MAX_USER_FIO_SEARCH_Q,
  buildUserFioSearchFilter,
  mapUsersWithFollowingFlag,
};
