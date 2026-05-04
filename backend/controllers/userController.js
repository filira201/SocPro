const { prisma } = require("../prisma/prismaClient");
const bcrypt = require("bcryptjs");
const jdenticon = require("jdenticon");
const path = require("path");
const fs = require("fs");
const jwt = require("jsonwebtoken");

const OBJECT_ID_REGEX = /^[a-f\d]{24}$/i;

const parseCsvIds = (value) => {
  if (!value) return [];
  return String(value)
    .split(",")
    .map((s) => s.trim())
    .filter((s) => OBJECT_ID_REGEX.test(s));
};

const UserController = {
  register: async (req, res) => {
    const { email, username, password, name } = req.body;

    if (!email || !username || !password) {
      return res
        .status(400)
        .json({ error: "Email, username и пароль обязательны" });
    }

    try {
      const existingUser = await prisma.user.findFirst({
        where: { OR: [{ email }, { username }] },
      });

      if (existingUser) {
        if (existingUser.email === email) {
          return res
            .status(400)
            .json({ error: "Пользователь с таким email уже существует" });
        }
        return res.status(400).json({ error: "Username уже занят" });
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
          name: name || username,
          avatarUrl: `/uploads/${avatarName}`,
        },
      });

      res.json(user);
    } catch (error) {
      console.error("Error in register", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  login: async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Все поля обязательны" });
    }

    try {
      const user = await prisma.user.findUnique({ where: { email } });

      if (!user) {
        return res.status(400).json({ error: "Неверный логин или пароль" });
      }

      const valid = await bcrypt.compare(password, user.password);

      if (!valid) {
        return res.status(400).json({ error: "Неверный логин или пароль" });
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

      res.json({ ...user, isFollowing: Boolean(isFollowing) });
    } catch (error) {
      console.error("Error in getUserById", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  updateUser: async (req, res) => {
    const { id } = req.params;
    const { email, username, name, dateOfBirth, bio, location } = req.body;

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
        const exisingUser = await prisma.user.findFirst({
          where: { email },
        });

        if (exisingUser && exisingUser.id !== id) {
          return res.status(400).json({ error: "Почта уже используется" });
        }
      }

      if (username) {
        const existingByUsername = await prisma.user.findFirst({
          where: { username },
        });

        if (existingByUsername && existingByUsername.id !== id) {
          return res.status(400).json({ error: "Username уже занят" });
        }
      }

      const user = await prisma.user.update({
        where: { id },
        data: {
          email: email || undefined,
          username: username || undefined,
          name: name || undefined,
          avatarUrl: filePath ? `/${filePath}` : undefined,
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
          bio: bio || undefined,
          location: location || undefined,
          ...(skillIds !== undefined ? { skillIds: { set: skillIds } } : {}),
        },
        include: { skills: true },
      });

      res.json(user);
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
          .json({ error: "Не удалось найти пользователся" });
      }

      res.json(user);
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
          OR: [
            { username: { contains: String(q), mode: "insensitive" } },
            { name: { contains: String(q), mode: "insensitive" } },
          ],
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

      const sanitized = items.map(({ password, ...rest }) => rest);

      res.json({ items: sanitized, total, take, skip });
    } catch (error) {
      console.error("Error in searchUsers", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
};

module.exports = UserController;
