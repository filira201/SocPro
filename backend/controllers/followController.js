const { prisma } = require("../prisma/prismaClient");
const { createNotification } = require("../lib/notifications");
const {
  MAX_USER_FIO_SEARCH_Q,
  buildUserFioSearchFilter,
  mapUsersWithFollowingFlag,
} = require("../lib/user-directory-list");

const { ID_REGEX } = require("../lib/id");
const OBJECT_ID_REGEX = ID_REGEX;
const DEFAULT_FOLLOW_LIST_LIMIT = 10;
const MAX_FOLLOW_LIST_LIMIT = 50;

function normalizeFollowListLimit(value) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_FOLLOW_LIST_LIMIT;
  }

  return Math.min(parsed, MAX_FOLLOW_LIST_LIMIT);
}

const FollowController = {
  listFollowers: async (req, res) => {
    const { id } = req.params;
    const viewerId = req.user.userId;
    const { cursor, q } = req.query;
    const limit = normalizeFollowListLimit(req.query.limit);
    const qRaw = q !== undefined ? String(q) : "";

    if (!OBJECT_ID_REGEX.test(id)) {
      return res.status(400).json({ error: "Некорректный id" });
    }

    if (qRaw.length > MAX_USER_FIO_SEARCH_Q) {
      return res.status(400).json({ error: "Слишком длинная строка поиска" });
    }

    if (cursor && !OBJECT_ID_REGEX.test(String(cursor))) {
      return res.status(400).json({ error: "Некорректный cursor" });
    }

    try {
      const exists = await prisma.user.findUnique({
        where: { id },
        select: { id: true },
      });

      if (!exists) {
        return res.status(404).json({ error: "Пользователь не найден" });
      }

      const userFilter = buildUserFioSearchFilter(qRaw);
      const where = {
        followingId: id,
        ...(userFilter ? { follower: userFilter } : {}),
      };

      const rows = await prisma.follows.findMany({
        where,
        ...(cursor
          ? {
              cursor: { id: String(cursor) },
              skip: 1,
            }
          : {}),
        take: limit + 1,
        include: { follower: true },
        orderBy: { id: "desc" },
      });

      const hasNextPage = rows.length > limit;
      const pageRows = hasNextPage ? rows.slice(0, limit) : rows;
      const users = pageRows.map((r) => r.follower);
      const items = await mapUsersWithFollowingFlag(viewerId, users);
      const nextCursor = hasNextPage ? pageRows[pageRows.length - 1]?.id : null;

      res.json({ items, nextCursor });
    } catch (error) {
      console.error("Error in listFollowers", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  listFollowing: async (req, res) => {
    const { id } = req.params;
    const viewerId = req.user.userId;
    const { cursor, q } = req.query;
    const limit = normalizeFollowListLimit(req.query.limit);
    const qRaw = q !== undefined ? String(q) : "";

    if (!OBJECT_ID_REGEX.test(id)) {
      return res.status(400).json({ error: "Некорректный id" });
    }

    if (qRaw.length > MAX_USER_FIO_SEARCH_Q) {
      return res.status(400).json({ error: "Слишком длинная строка поиска" });
    }

    if (cursor && !OBJECT_ID_REGEX.test(String(cursor))) {
      return res.status(400).json({ error: "Некорректный cursor" });
    }

    try {
      const exists = await prisma.user.findUnique({
        where: { id },
        select: { id: true },
      });

      if (!exists) {
        return res.status(404).json({ error: "Пользователь не найден" });
      }

      const userFilter = buildUserFioSearchFilter(qRaw);
      const where = {
        followerId: id,
        ...(userFilter ? { following: userFilter } : {}),
      };

      const rows = await prisma.follows.findMany({
        where,
        ...(cursor
          ? {
              cursor: { id: String(cursor) },
              skip: 1,
            }
          : {}),
        take: limit + 1,
        include: { following: true },
        orderBy: { id: "desc" },
      });

      const hasNextPage = rows.length > limit;
      const pageRows = hasNextPage ? rows.slice(0, limit) : rows;
      const users = pageRows.map((r) => r.following);
      const items = await mapUsersWithFollowingFlag(viewerId, users);
      const nextCursor = hasNextPage ? pageRows[pageRows.length - 1]?.id : null;

      res.json({ items, nextCursor });
    } catch (error) {
      console.error("Error in listFollowing", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  followUser: async (req, res) => {
    const { followingId } = req.body;
    const userId = req.user.userId;

    if (!followingId || !OBJECT_ID_REGEX.test(String(followingId))) {
      return res.status(400).json({ error: "Некорректный id" });
    }

    if (followingId === userId) {
      return res
        .status(400)
        .json({ error: "Вы не можете подписаться на самого себя" });
    }

    try {
      const existingFollow = await prisma.follows.findFirst({
        where: {
          AND: [{ followerId: userId }, { followingId }],
        },
      });

      if (existingFollow) {
        return res.status(400).json({ error: "Подписка уже существует" });
      }

      await prisma.follows.create({
        data: {
          follower: { connect: { id: userId } },
          following: { connect: { id: followingId } },
        },
      });

      await createNotification(prisma, {
        receiverId: followingId,
        actorId: userId,
        type: "USER_FOLLOWED",
      });

      res.status(201).json({ message: "Подписка успешно создана" });
    } catch (error) {
      if (error.code === "P2002") {
        return res.status(400).json({ error: "Подписка уже существует" });
      }

      console.error("Error in followUser", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  unfollowUser: async (req, res) => {
    const { id } = req.params;
    const userId = req.user.userId;

    if (!id || !OBJECT_ID_REGEX.test(String(id))) {
      return res.status(400).json({ error: "Некорректный id" });
    }

    try {
      const follows = await prisma.follows.findFirst({
        where: { AND: [{ followerId: userId }, { followingId: id }] },
      });

      if (!follows) {
        return res
          .status(404)
          .json({ error: "Вы не подписаны на этого пользователя" });
      }

      await prisma.follows.delete({
        where: { id: follows.id },
      });

      res.status(201).json({ message: "Вы отписались" });
    } catch (error) {
      console.error("Error in unfollowUser", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
};

module.exports = FollowController;
