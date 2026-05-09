const { prisma } = require("../prisma/prismaClient");
const bcrypt = require("bcryptjs");
const jdenticon = require("jdenticon");
const path = require("path");
const fs = require("fs");
const jwt = require("jsonwebtoken");

const {
  USERNAME_REGEX,
  validateRegister,
  validateLogin,
  sanitizeUser,
  decodeUploadOriginalName,
} = require("./_utils");

const OBJECT_ID_REGEX = /^[a-f\d]{24}$/i;

function unlinkUploadByPublicUrl(urlPath) {
  if (
    !urlPath ||
    typeof urlPath !== "string" ||
    !urlPath.startsWith("/uploads/")
  ) {
    return;
  }

  const base = path.basename(urlPath);

  if (!base || base === "." || base === "..") {
    return;
  }

  const full = path.join(__dirname, "../uploads", base);
  fs.unlink(full, () => {});
}

function optionalTrimmedString(body, key) {
  if (body[key] === undefined) {
    return undefined;
  }

  const s = String(body[key]).trim();
  return s === "" ? null : s;
}

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
      const avatarName = `avatar_${Date.now()}.png`;
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
    const { username, dateOfBirth } = req.body;

    if (id !== req.user.userId) {
      return res.status(403).json({ error: "Нет доступа" });
    }

    const avatarFile = req.files?.avatar?.[0];
    const resumeFile = req.files?.resume?.[0];
    const removeResume =
      req.body.removeResume === "true" || req.body.removeResume === true;

    if (!username || !USERNAME_REGEX.test(String(username))) {
      return res.status(400).json({
        error: "Имя пользователя обязательно: 3–32 символа, буквы/цифры/_-",
      });
    }

    try {
      const existing = await prisma.user.findUnique({ where: { id } });

      if (!existing) {
        return res.status(404).json({ error: "Пользователь не найден" });
      }

      const usernameStr = String(username).trim();
      const existingByUsername = await prisma.user.findFirst({
        where: { username: usernameStr },
      });

      if (existingByUsername && existingByUsername.id !== id) {
        return res.status(400).json({ error: "Имя пользователя уже занято" });
      }

      let skillIds;
      if (req.body.skillIds !== undefined) {
        const raw = req.body.skillIds;
        const arr = Array.isArray(raw) ? raw : parseCsvIds(raw);
        skillIds = arr.filter((sid) => OBJECT_ID_REGEX.test(sid));
      }

      let contactsUpdate;
      if (req.body.contacts !== undefined) {
        try {
          const parsed = JSON.parse(req.body.contacts);

          if (!Array.isArray(parsed)) {
            throw new Error("invalid");
          }

          contactsUpdate = parsed.map((x) => String(x).trim()).filter(Boolean);
        } catch {
          return res.status(400).json({ error: "Некорректные контакты" });
        }
      }

      let dateOfBirthUpdate;
      if (dateOfBirth !== undefined) {
        if (dateOfBirth === "" || dateOfBirth === null) {
          dateOfBirthUpdate = null;
        } else {
          const d = new Date(dateOfBirth);

          if (Number.isNaN(d.getTime())) {
            return res.status(400).json({ error: "Некорректная дата рождения" });
          }

          const endToday = new Date();
          endToday.setHours(23, 59, 59, 999);

          if (d > endToday) {
            return res.status(400).json({
              error: "Дата рождения не может быть в будущем",
            });
          }

          dateOfBirthUpdate = d;
        }
      }

      const data = {
        username: usernameStr,
      };

      if (req.body.bio !== undefined) {
        data.bio = optionalTrimmedString(req.body, "bio");
      }

      if (req.body.location !== undefined) {
        data.location = optionalTrimmedString(req.body, "location");
      }

      if (req.body.university !== undefined) {
        data.university = optionalTrimmedString(req.body, "university");
      }

      if (req.body.course !== undefined) {
        data.course = optionalTrimmedString(req.body, "course");
      }

      if (req.body.faculty !== undefined) {
        data.faculty = optionalTrimmedString(req.body, "faculty");
      }

      if (req.body.country !== undefined) {
        data.country = optionalTrimmedString(req.body, "country");
      }

      if (req.body.city !== undefined) {
        data.city = optionalTrimmedString(req.body, "city");
      }

      if (dateOfBirthUpdate !== undefined) {
        data.dateOfBirth = dateOfBirthUpdate;
      }

      if (contactsUpdate !== undefined) {
        data.contacts = { set: contactsUpdate };
      }

      if (skillIds !== undefined) {
        data.skillIds = { set: skillIds };
      }

      if (avatarFile) {
        unlinkUploadByPublicUrl(existing.avatarUrl);
        data.avatarUrl = `/uploads/${avatarFile.filename}`;
      }

      if (resumeFile) {
        unlinkUploadByPublicUrl(existing.resumeUrl);
        data.resumeUrl = `/uploads/${resumeFile.filename}`;
        data.resumeOriginalName = decodeUploadOriginalName(
          resumeFile.originalname
        );
        data.resumeMimeType = resumeFile.mimetype;
        data.resumeSize = resumeFile.size;
      } else if (removeResume) {
        unlinkUploadByPublicUrl(existing.resumeUrl);
        data.resumeUrl = null;
        data.resumeOriginalName = null;
        data.resumeMimeType = null;
        data.resumeSize = null;
      }

      const user = await prisma.user.update({
        where: { id },
        data,
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
