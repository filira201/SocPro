const { prisma } = require("../prisma/prismaClient");
const { sanitizeUser } = require("./_utils");

const OBJECT_ID_REGEX = /^[a-f\d]{24}$/i;

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

const FollowController = {
  listFollowers: async (req, res) => {
    const { id } = req.params;
    const viewerId = req.user.userId;

    if (!OBJECT_ID_REGEX.test(id)) {
      return res.status(400).json({ error: "Некорректный id" });
    }

    try {
      const exists = await prisma.user.findUnique({
        where: { id },
        select: { id: true },
      });

      if (!exists) {
        return res.status(404).json({ error: "Пользователь не найден" });
      }

      const rows = await prisma.follows.findMany({
        where: { followingId: id },
        include: { follower: true },
      });

      const users = rows.map((r) => r.follower);
      const items = await mapUsersWithFollowingFlag(viewerId, users);

      res.json({ items });
    } catch (error) {
      console.error("Error in listFollowers", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  listFollowing: async (req, res) => {
    const { id } = req.params;
    const viewerId = req.user.userId;

    if (!OBJECT_ID_REGEX.test(id)) {
      return res.status(400).json({ error: "Некорректный id" });
    }

    try {
      const exists = await prisma.user.findUnique({
        where: { id },
        select: { id: true },
      });

      if (!exists) {
        return res.status(404).json({ error: "Пользователь не найден" });
      }

      const rows = await prisma.follows.findMany({
        where: { followerId: id },
        include: { following: true },
      });

      const users = rows.map((r) => r.following);
      const items = await mapUsersWithFollowingFlag(viewerId, users);

      res.json({ items });
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
