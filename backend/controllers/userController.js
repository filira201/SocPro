const { prisma } = require("../prisma/prismaClient");
const bcrypt = require("bcryptjs");
const jdenticon = require("jdenticon");
const path = require("path");
const fs = require("fs");
const jwt = require("jsonwebtoken");

const {
  validateRegister,
  validateLogin,
  sanitizeUser,
} = require("./_utils");

const OBJECT_ID_REGEX = /^[a-f\d]{24}$/i;

const parseCsvIds = (value) => {
  if (!value) {
    return [];
  }

  return String(value)
    .split(",")
    .map((s) => s.trim())
    .filter((s) => OBJECT_ID_REGEX.test(s));
};

const UserController = {
  register: async (req, res) => {
    const { email, username, password } = req.body;

    const validationError = validateRegister({ email, username, password });
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    try {
      const existingUser = await prisma.user.findFirst({
        where: { OR: [{ email }, { username }] },
      });

      if (existingUser) {
        if (existingUser.email === email) {
          return res
            .status(400)
            .json({ error: "Пользователь с такой почтой уже существует" });
        }

        return res
          .status(400)
          .json({ error: "Имя пользователя уже занято" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const png = jdenticon.toPng(`${username}${Date.now()}`, 200);
      const avatarName = `${username}_${Date.now()}.png`;
      const avatarPath = path.join(__dirname, "/../uploads", avatarName);
      fs.writeFileSync(avatarPath, png);

      const user = await prisma.user.create({
        data: {
          email,
          username,
          password: hashedPassword,
          avatarUrl: `/uploads/${avatarName}`,
        },
      });

      res.json(sanitizeUser(user));
    } catch (error) {
      console.error("Error in register", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  login: async (req, res) => {
    const { email, password } = req.body;

    const validationError = validateLogin({ email, password });
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    try {
      const user = await prisma.user.findUnique({ where: { email } });

      if (!user) {
        return res.status(400).json({ error: "Неверная почта или пароль" });
      }

      const valid = await bcrypt.compare(password, user.password);

      if (!valid) {
        return res.status(400).json({ error: "Неверная почта или пароль" });
      }

      const token = jwt.sign({ userId: user.id }, process.env.SECRET_KEY);

      res.json({ token });
    } catch (error) {
      console.error("Error in login", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  getUserById: async (req, res) => {
    const { id } = req.params;
    const userId = req.user.userId;

    if (!OBJECT_ID_REGEX.test(id)) {
      return res.status(400).json({ error: "Некорректный id" });
    }

    try {
      const user = await prisma.user.findUnique({
        where: { id },
        include: {
          followers: true,
          following: true,
          skills: true,
        },
      });

      if (!user) {
        return res.status(404).json({ error: "Пользователь не найден" });
      }

      const isFollowing = await prisma.follows.findFirst({
        where: { AND: [{ followerId: userId }, { followingId: id }] },
      });

      res.json({
        ...sanitizeUser(user),
        isFollowing: Boolean(isFollowing),
      });
    } catch (error) {
      console.error("Error in getUserById", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  updateUser: async (req, res) => {
    const { id } = req.params;
    const { email, username, dateOfBirth, bio, location } = req.body;

    let filePath;

    if (req.file && req.file.path) {
      filePath = req.file.path;
    }

    if (id !== req.user.userId) {
      return res.status(403).json({ error: "Нет доступа" });
    }

    let skillIds;
    if (req.body.skillIds !== undefined) {
      const raw = req.body.skillIds;
      const arr = Array.isArray(raw) ? raw : parseCsvIds(raw);
      skillIds = arr.filter((sid) => OBJECT_ID_REGEX.test(sid));
    }

    try {
      if (email) {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) {
          return res.status(400).json({ error: "Некорректная почта" });
        }

        const exisingUser = await prisma.user.findFirst({
          where: { email },
        });

        if (exisingUser && exisingUser.id !== id) {
          return res.status(400).json({ error: "Почта уже используется" });
        }
      }

      if (username) {
        if (!/^[a-zA-Z0-9_-]{3,32}$/.test(String(username))) {
          return res
            .status(400)
            .json({ error: "Имя пользователя: 3-32 символа, латиница/цифры/_-" });
        }

        const existingByUsername = await prisma.user.findFirst({
          where: { username },
        });

        if (existingByUsername && existingByUsername.id !== id) {
          return res.status(400).json({ error: "Имя пользователя уже занято" });
        }
      }

      const user = await prisma.user.update({
        where: { id },
        data: {
          email: email || undefined,
          username: username || undefined,
          avatarUrl: filePath ? `/${filePath}` : undefined,
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
          bio: bio || undefined,
          location: location || undefined,
          ...(skillIds !== undefined ? { skillIds: { set: skillIds } } : {}),
        },
        include: { skills: true },
      });

      res.json(sanitizeUser(user));
    } catch (error) {
      console.error("Error in updateUser", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  current: async (req, res) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user.userId },
        include: {
          followers: {
            include: {
              follower: true,
            },
          },
          following: {
            include: {
              following: true,
            },
          },
          skills: true,
        },
      });

      if (!user) {
        return res
          .status(400)
          .json({ error: "Не удалось найти пользователя" });
      }

      res.json(sanitizeUser(user));
    } catch (error) {
      console.error("Error in get current", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  searchUsers: async (req, res) => {
    const { q, skills, skillNames } = req.query;
    const take = Math.min(parseInt(req.query.take, 10) || 20, 100);
    const skip = Math.max(parseInt(req.query.skip, 10) || 0, 0);

    try {
      const skillIds = parseCsvIds(skills);

      let resolvedSkillIds = skillIds;
      if (skillNames) {
        const names = String(skillNames)
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);

        if (names.length) {
          const matched = await prisma.skill.findMany({
            where: { name: { in: names, mode: "insensitive" } },
            select: { id: true },
          });
          resolvedSkillIds = [
            ...new Set([...resolvedSkillIds, ...matched.map((s) => s.id)]),
          ];
        }
      }

      const where = { AND: [] };

      if (q) {
        where.AND.push({
          username: { contains: String(q), mode: "insensitive" },
        });
      }

      if (resolvedSkillIds.length) {
        where.AND.push({
          skills: { some: { id: { in: resolvedSkillIds } } },
        });
      }

      const finalWhere = where.AND.length ? where : {};

      const [items, total] = await Promise.all([
        prisma.user.findMany({
          where: finalWhere,
          include: { skills: true },
          orderBy: { createdAt: "desc" },
          take,
          skip,
        }),
        prisma.user.count({ where: finalWhere }),
      ]);

      res.json({ items: sanitizeUser(items), total, take, skip });
    } catch (error) {
      console.error("Error in searchUsers", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
};

module.exports = UserController;
