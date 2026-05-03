const { prisma } = require("../prisma/prismaClient");

const FollowController = {
  followUser: async (req, res) => {
    const { followingId } = req.body;
    const userId = req.user.userId;

    if (!followingId) {
      return res.status(400).json({ error: "Все поля обязательны" });
    }

    if (followingId === userId) {
      return res
        .status(500)
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
      console.error("Error in followUser", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  unfollowUser: async (req, res) => {
    const { id } = req.params;
    const userId = req.user.userId;

    if (!id) {
      return res.status(400).json({ error: "Все поля обязательны" });
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
