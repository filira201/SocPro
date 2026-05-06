const { prisma } = require("../prisma/prismaClient");

const OBJECT_ID_REGEX = /^[a-f\d]{24}$/i;

async function getLikeState(postId, userId) {
  const [likeCount, likedByUser] = await Promise.all([
    prisma.like.count({ where: { postId } }),
    prisma.like.findFirst({ where: { postId, userId } }),
  ]);

  return {
    likeCount,
    likedByUser: Boolean(likedByUser),
  };
}

const LikeController = {
  likePost: async (req, res) => {
    const { postId } = req.body;
    const userId = req.user.userId;

    if (!postId || !OBJECT_ID_REGEX.test(postId)) {
      return res.status(400).json({ error: "Все поля обязательны" });
    }

    try {
      const existingLike = await prisma.like.findFirst({
        where: { postId, userId },
      });

      if (existingLike) {
        return res.status(400).json({ error: "Вы уже поставили лайк" });
      }

      const like = await prisma.like.create({
        data: { postId, userId },
      });

      const state = await getLikeState(postId, userId);

      res.json({ ...like, ...state });
    } catch (error) {
      console.error("Error in likePost", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  unlikePost: async (req, res) => {
    const { id } = req.params;
    const userId = req.user.userId;

    if (!id || !OBJECT_ID_REGEX.test(id)) {
      return res.status(400).json({ error: "Вы уже поставили дизлайк" });
    }

    try {
      const existingLike = await prisma.like.findFirst({
        where: { postId: id, userId },
      });

      if (!existingLike) {
        return res.status(400).json({ error: "Нельзя поставить дизлайк" });
      }

      const like = await prisma.like.deleteMany({
        where: { postId: id, userId },
      });

      const state = await getLikeState(id, userId);

      res.json({ ...like, ...state });
    } catch (error) {
      console.error("Error in unlikePost", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
};

module.exports = LikeController;
