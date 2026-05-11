/**
 * Демо-наполнение: 50 пользователей, подписки (0–20 на пользователя), посты, комментарии,
 * ответы, лайки, 5 проектов.
 *
 * Почта: `<транслит-имени><NN>@mail.ru` (например anna01@mail.ru), пароль у всех: `123123`.
 * Аватар — jdenticon + файл в `uploads/`, как при регистрации.
 *
 * Запускать ПОСЛЕ `npm run seed:skills` (навыки только из БД после seed-skill-aliases.js).
 * Повторный запуск удаляет тех же пользователей по списку email и связанные сущности
 * (без длинных транзакций Mongo — операции по шагам и пачкам).
 *
 *   cd backend && npm run seed:demo
 */
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const jdenticon = require("jdenticon");
const { prisma } = require("./prismaClient");

const PASSWORD = "123123";
const BCRYPT_ROUNDS = 10;

/** Простая транслитерация для локальной части почты (имяNN@mail.ru) */
const TR = {
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  д: "d",
  е: "e",
  ё: "e",
  ж: "zh",
  з: "z",
  и: "i",
  й: "y",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ф: "f",
  х: "h",
  ц: "ts",
  ч: "ch",
  ш: "sh",
  щ: "sch",
  ъ: "",
  ы: "y",
  ь: "",
  э: "e",
  ю: "yu",
  я: "ya",
};

function translit(s) {
  return (
    [...String(s).toLowerCase()]
      .map((c) => TR[c] ?? (c.match(/[a-z0-9]/i) ? c.toLowerCase() : ""))
      .join("")
      .replace(/[^a-z0-9]+/g, "")
      .slice(0, 20) || "u"
  );
}

function rndInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function shuffle(array) {
  const a = [...array];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickDistinct(from, n, exclude = new Set()) {
  const pool = shuffle(from.filter((x) => !exclude.has(x)));
  return pool.slice(0, Math.min(n, pool.length));
}

function writeAvatar(firstName, lastName) {
  const uploadsDir = path.join(__dirname, "../uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const salt = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const png = jdenticon.toPng(`${firstName}${lastName ?? ""}${salt}`, 200);
  const avatarName = `seed_avatar_${salt}.png`;
  const avatarPath = path.join(uploadsDir, avatarName);
  fs.writeFileSync(avatarPath, png);
  return `/uploads/${avatarName}`;
}

const FIRST_NAMES = [
  "Анна",
  "Борис",
  "Вера",
  "Григорий",
  "Дарья",
  "Егор",
  "Жанна",
  "Захар",
  "Ирина",
  "Кирилл",
  "Лариса",
  "Михаил",
  "Наталья",
  "Олег",
  "Полина",
  "Роман",
  "Светлана",
  "Тимур",
  "Ульяна",
  "Фёдор",
  "Харитон",
  "Элина",
  "Юлия",
  "Ярослав",
  "Артём",
  "Владимир",
  "Галина",
  "Дмитрий",
  "Екатерина",
  "Иван",
  "Ксения",
  "Лев",
  "Мария",
  "Никита",
  "Оксана",
  "Павел",
  "Раиса",
  "Сергей",
  "Татьяна",
  "Филипп",
  "Алёна",
  "Виктор",
  "Георгий",
  "Денис",
  "Елена",
  "Игорь",
  "Константин",
  "Людмила",
  "Максим",
  "Нина",
];

const LAST_NAMES = [
  "Иванов",
  "Петров",
  "Сидоров",
  "Смирнов",
  "Кузнецов",
  "Попов",
  "Соколов",
  "Лебедев",
  "Козлов",
  "Новиков",
  "Морозов",
  "Волков",
  "Алексеев",
  "Лебедева",
  "Егорова",
  "Павлова",
  "Семёнов",
  "Голубев",
  "Виноградов",
  "Богданов",
  "Воробьёв",
  "Фёдоров",
  "Михайлов",
  "Белов",
  "Тарасов",
  "Беляев",
  "Комаров",
  "Орлов",
  "Киселёв",
  "Макаров",
  "Андреев",
  "Ковалёв",
  "Ильин",
  "Гусев",
  "Титов",
  "Кузьмин",
  "Кудрявцев",
  "Баранов",
  "Куликов",
  "Алексеева",
  "Медведев",
  "Антонов",
  "Тимофеев",
  "Фомин",
  "Чернов",
  "Абрамов",
  "Мартынов",
  "Ефимов",
  "Фролов",
  "Давыдов",
];

const PATRONYMICS = [
  "Александрович",
  "Александровна",
  "Иванович",
  "Ивановна",
  "Петрович",
  "Петровна",
  "Сергеевич",
  "Сергеевна",
  "Дмитриевич",
  "Дмитриевна",
  "Николаевич",
  "Николаевна",
  "Владимирович",
  "Владимировна",
  "Олегович",
  "Олеговна",
  "Игоревич",
  "Игоревна",
  "Андреевич",
  "Андреевна",
  "Павлович",
  "Павловна",
  "Романович",
  "Романовна",
  "Егорович",
  "Егоровна",
  "Михайлович",
  "Михайловна",
  "Борисович",
  "Борисовна",
  "Викторович",
  "Викторовна",
  "Юрьевич",
  "Юрьевна",
  "Анатольевич",
  "Анатольевна",
  "Геннадьевич",
  "Геннадьевна",
  "Васильевич",
  "Васильевна",
  "Фёдорович",
  "Фёдоровна",
  "Семёнович",
  "Семёновна",
  "Тимофеевич",
  "Тимофеевна",
  "Денисович",
  "Денисовна",
  "Константинович",
  "Константиновна",
];

const POST_SNIPPETS = [
  "Сегодня хороший день для кода.",
  "Делюсь мыслями о учёбе и проектах.",
  "Кто хочет вместе поучиться?",
  "Сдал зачёт, можно выдохнуть.",
  "Ищу команду для pet-проекта.",
  "Заметка о стажировке и первых задачах.",
  "Полезная ссылка на материалы — в комментариях.",
  "Вопрос по курсовой: как лучше структурировать?",
  "Небольшой опыт с React и Redux.",
  "Про важность code review.",
];

const COMMENT_SNIPPETS = [
  "Согласен.",
  "Интересно, расскажи подробнее.",
  "У меня был похожий случай.",
  "Поддерживаю.",
  "Можно в личку?",
  "Спасибо за пост!",
  "Есть идея получше.",
  "Полезно, сохранил.",
  "А как насчёт тестов?",
  "Удачи с проектом!",
];

/** Как в postController.deletePost: уровни от корня к листьям */
async function purgeCommentLikesForUserIds(ids) {
  const take = 800;
  for (;;) {
    const rows = await prisma.commentLike.findMany({
      where: { userId: { in: ids } },
      take,
      select: { id: true },
    });
    if (!rows.length) {
      break;
    }
    await prisma.commentLike.deleteMany({
      where: { id: { in: rows.map((r) => r.id) } },
    });
  }
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

async function wipeSeedByEmails(emails) {
  const users = await prisma.user.findMany({
    where: { email: { in: emails } },
    select: { id: true },
  });
  const userIds = users.map((u) => u.id);
  if (!userIds.length) {
    return;
  }

  const posts = await prisma.post.findMany({
    where: { authorId: { in: userIds } },
    select: { id: true },
  });
  const postIds = posts.map((p) => p.id);

  if (postIds.length) {
    const comments = await prisma.comment.findMany({
      where: { postId: { in: postIds } },
      select: { id: true, parentId: true },
    });
    const commentIds = comments.map((c) => c.id);
    const levels = collectCommentLevelsByPost(comments);

    if (commentIds.length) {
      const chunk = 400;
      for (let i = 0; i < commentIds.length; i += chunk) {
        const part = commentIds.slice(i, i + chunk);
        await prisma.commentAttachment.deleteMany({
          where: { commentId: { in: part } },
        });
        await prisma.commentLike.deleteMany({
          where: { commentId: { in: part } },
        });
      }
      for (const levelIds of [...levels].reverse()) {
        const delChunk = 400;
        for (let j = 0; j < levelIds.length; j += delChunk) {
          const part = levelIds.slice(j, j + delChunk);
          await prisma.comment.deleteMany({ where: { id: { in: part } } });
        }
      }
    }
    await prisma.like.deleteMany({ where: { postId: { in: postIds } } });
    await prisma.postAttachment.deleteMany({
      where: { postId: { in: postIds } },
    });
    await prisma.post.deleteMany({ where: { id: { in: postIds } } });
  }

  await prisma.like.deleteMany({ where: { userId: { in: userIds } } });
  await purgeCommentLikesForUserIds(userIds);

  const orphanComments = await prisma.comment.findMany({
    where: { userId: { in: userIds } },
    select: { id: true, parentId: true },
  });
  const orphanIds = orphanComments.map((c) => c.id);
  if (orphanIds.length) {
    const oLevels = collectCommentLevelsByPost(orphanComments);
    const och = 400;
    for (let i = 0; i < orphanIds.length; i += och) {
      const part = orphanIds.slice(i, i + och);
      await prisma.commentLike.deleteMany({
        where: { commentId: { in: part } },
      });
      await prisma.commentAttachment.deleteMany({
        where: { commentId: { in: part } },
      });
    }
    for (const levelIds of [...oLevels].reverse()) {
      const delChunk = 400;
      for (let j = 0; j < levelIds.length; j += delChunk) {
        const part = levelIds.slice(j, j + delChunk);
        await prisma.comment.deleteMany({ where: { id: { in: part } } });
      }
    }
  }

  const ownedProjects = await prisma.project.findMany({
    where: { ownerId: { in: userIds } },
    select: { id: true },
  });
  const ownedIds = ownedProjects.map((p) => p.id);

  await prisma.projectMember.deleteMany({
    where: { userId: { in: userIds } },
  });
  await prisma.projectApplication.deleteMany({
    where: { applicantId: { in: userIds } },
  });

  if (ownedIds.length) {
    await prisma.projectMember.deleteMany({
      where: { projectId: { in: ownedIds } },
    });
    await prisma.projectApplication.deleteMany({
      where: { projectId: { in: ownedIds } },
    });
    await prisma.projectAttachment.deleteMany({
      where: { projectId: { in: ownedIds } },
    });
    await prisma.project.deleteMany({ where: { id: { in: ownedIds } } });
  }

  await prisma.follows.deleteMany({
    where: {
      OR: [{ followerId: { in: userIds } }, { followingId: { in: userIds } }],
    },
  });

  const tailComments = await prisma.comment.findMany({
    where: {
      OR: [
        { userId: { in: userIds } },
        { post: { authorId: { in: userIds } } },
      ],
    },
    select: { id: true, parentId: true },
  });
  const tailMap = new Map(tailComments.map((c) => [c.id, c]));
  const tailList = [...tailMap.values()];
  if (tailList.length) {
    const tids = tailList.map((c) => c.id);
    const tch = 400;
    for (let i = 0; i < tids.length; i += tch) {
      const part = tids.slice(i, i + tch);
      await prisma.commentAttachment.deleteMany({
        where: { commentId: { in: part } },
      });
      await prisma.commentLike.deleteMany({
        where: { commentId: { in: part } },
      });
    }
    const tLevels = collectCommentLevelsByPost(tailList);
    for (const levelIds of [...tLevels].reverse()) {
      const delChunk = 400;
      for (let j = 0; j < levelIds.length; j += delChunk) {
        const part = levelIds.slice(j, j + delChunk);
        await prisma.comment.deleteMany({ where: { id: { in: part } } });
      }
    }
  }

  await prisma.like.deleteMany({ where: { userId: { in: userIds } } });
  await purgeCommentLikesForUserIds(userIds);

  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
}

function buildEmails() {
  const emails = [];
  const used = new Set();
  for (let i = 0; i < 50; i++) {
    const base = translit(FIRST_NAMES[i]);
    let local = `${base}${String(i + 1).padStart(2, "0")}`;
    let email = `${local}@mail.ru`;
    let n = 0;
    while (used.has(email)) {
      n += 1;
      local = `${base}${String(i + 1).padStart(2, "0")}x${n}`;
      email = `${local}@mail.ru`;
    }
    used.add(email);
    emails.push(email);
  }
  return emails;
}

async function main() {
  const allSkills = await prisma.skill.findMany({
    select: { id: true, name: true },
  });
  if (!allSkills.length) {
    console.error("В базе нет навыков. Сначала выполните: npm run seed:skills");
    process.exit(1);
  }

  const skillIds = allSkills.map((s) => s.id);
  const emails = buildEmails();
  await wipeSeedByEmails(emails);

  const hashedPassword = await bcrypt.hash(PASSWORD, BCRYPT_ROUNDS);

  const order = shuffle([...Array(50).keys()]);
  const fullFio = new Set(order.slice(0, 25));
  const firstPat = new Set(order.slice(25, 37));
  const firstOnly = new Set(order.slice(37, 50));

  const fullProfile = new Set(shuffle([...Array(50).keys()]).slice(0, 25));
  const withSkills = new Set(shuffle([...Array(50).keys()]).slice(0, 37));

  const usersData = [];
  for (let i = 0; i < 50; i++) {
    const fn = FIRST_NAMES[i];
    let ln = null;
    let pt = null;
    if (fullFio.has(i)) {
      ln = LAST_NAMES[i % LAST_NAMES.length];
      pt = PATRONYMICS[i % PATRONYMICS.length];
    } else if (firstPat.has(i)) {
      pt = PATRONYMICS[(i + 3) % PATRONYMICS.length];
    } else {
      /* firstOnly.has(i) — только имя */
    }

    const avatarUrl = writeAvatar(fn, ln);

    const fields = {
      bio: null,
      dateOfBirth: null,
      university: null,
      faculty: null,
      course: null,
      contacts: [],
    };

    if (fullProfile.has(i)) {
      fields.bio =
        "Студент, интересуюсь разработкой и командными проектами. Открыт к общению.";
      fields.dateOfBirth = new Date(
        `${1985 + (i % 15)}-${String((i % 12) + 1).padStart(2, "0")}-${String((i % 27) + 1).padStart(2, "0")}`,
      );
      fields.university = "Московский политехнический университет";
      fields.faculty = ["Информатика", "Прикладная математика", "Экономика"][
        i % 3
      ];
      fields.course = String((i % 4) + 1);
      const nContacts = rndInt(1, 3);
      fields.contacts = [];
      for (let c = 0; c < nContacts; c++) {
        fields.contacts.push(
          `tg: @user_${i}_${c} / tel: +79${String(100000000 + i * 10 + c).slice(0, 9)}`,
        );
      }
    } else {
      const opts = [
        "bio",
        "dateOfBirth",
        "university",
        "faculty",
        "course",
        "contacts",
      ];
      const k = rndInt(0, 3);
      const chosen = shuffle(opts).slice(0, k);
      if (chosen.includes("bio")) {
        fields.bio = "Коротко о себе.";
      }
      if (chosen.includes("dateOfBirth")) {
        fields.dateOfBirth = new Date(1998, i % 12, (i % 25) + 1);
      }
      if (chosen.includes("university")) {
        fields.university = "Университет";
      }
      if (chosen.includes("faculty")) {
        fields.faculty = "Факультет";
      }
      if (chosen.includes("course")) {
        fields.course = "2";
      }
      if (chosen.includes("contacts")) {
        fields.contacts = [`email: contact${i}@example.com`];
      }
    }

    let userSkillIds = [];
    if (withSkills.has(i)) {
      const nk = rndInt(2, 10);
      userSkillIds = pickDistinct(skillIds, nk);
    }

    usersData.push({
      email: emails[i],
      firstName: fn,
      lastName: ln,
      patronymic: pt,
      password: hashedPassword,
      avatarUrl,
      ...fields,
      skillIds: userSkillIds,
    });
  }

  for (const d of usersData) {
    await prisma.user.create({
      data: {
        email: d.email,
        firstName: d.firstName,
        lastName: d.lastName,
        patronymic: d.patronymic,
        password: d.password,
        avatarUrl: d.avatarUrl,
        bio: d.bio,
        dateOfBirth: d.dateOfBirth,
        university: d.university,
        faculty: d.faculty,
        course: d.course,
        contacts: d.contacts,
        skillIds: d.skillIds,
      },
    });
  }

  const userList = await prisma.user.findMany({
    where: { email: { in: emails } },
  });
  const users = emails
    .map((e) => userList.find((u) => u.email === e))
    .filter(Boolean);

  const userIds = users.map((u) => u.id);

  const followRows = [];
  for (const u of users) {
    const nFollows = rndInt(0, 20);
    const others = userIds.filter((id) => id !== u.id);
    const targets = shuffle(others).slice(0, Math.min(nFollows, others.length));
    for (const followingId of targets) {
      followRows.push({ followerId: u.id, followingId });
    }
  }
  for (let i = 0; i < followRows.length; i += 500) {
    await prisma.follows.createMany({
      data: followRows.slice(i, i + 500),
    });
  }

  const postsCreated = [];
  for (const u of users) {
    const nPosts = rndInt(1, 5);
    for (let p = 0; p < nPosts; p++) {
      const post = await prisma.post.create({
        data: {
          authorId: u.id,
          content: `${POST_SNIPPETS[(p + userIds.indexOf(u.id)) % POST_SNIPPETS.length]} #${p + 1}`,
        },
      });
      postsCreated.push(post);
    }
  }

  for (const post of postsCreated) {
    const nComments = rndInt(0, 20);
    const authorId = post.authorId;
    const pool = userIds.filter((id) => id !== authorId);
    const commenters = shuffle(pool).slice(0, Math.min(nComments, pool.length));

    for (const uid of commenters) {
      const top = await prisma.comment.create({
        data: {
          postId: post.id,
          userId: uid,
          content: COMMENT_SNIPPETS[rndInt(0, COMMENT_SNIPPETS.length - 1)],
          parentId: null,
        },
      });

      const nReplies = rndInt(0, 10);
      const replyPool = shuffle(pool.filter((id) => id !== uid)).slice(
        0,
        Math.min(nReplies, pool.length),
      );
      for (const rid of replyPool) {
        await prisma.comment.create({
          data: {
            postId: post.id,
            userId: rid,
            content: `Ответ: ${COMMENT_SNIPPETS[rndInt(0, COMMENT_SNIPPETS.length - 1)]}`,
            parentId: top.id,
          },
        });
      }
    }
  }

  const postLikeRows = [];
  for (const post of postsCreated) {
    const nLikes = rndInt(0, 30);
    const likers = pickDistinct(
      userIds.filter((id) => id !== post.authorId),
      nLikes,
    );
    for (const uid of likers) {
      postLikeRows.push({ userId: uid, postId: post.id });
    }
  }
  for (let i = 0; i < postLikeRows.length; i += 500) {
    await prisma.like.createMany({
      data: postLikeRows.slice(i, i + 500),
    });
  }

  const allPostIds = postsCreated.map((p) => p.id);
  const allComments = await prisma.comment.findMany({
    where: { postId: { in: allPostIds } },
    select: { id: true },
  });

  const commentLikeRows = [];
  for (const { id: commentId } of allComments) {
    const nLikes = rndInt(0, 30);
    const likers = pickDistinct(userIds, nLikes);
    for (const uid of likers) {
      commentLikeRows.push({ userId: uid, commentId });
    }
  }
  for (let i = 0; i < commentLikeRows.length; i += 500) {
    await prisma.commentLike.createMany({
      data: commentLikeRows.slice(i, i + 500),
    });
  }

  async function createProject(owner, extraMembers, requiredSkillIds) {
    return prisma.project.create({
      data: {
        title: `Проект ${owner.firstName}`,
        description: "Краткое описание проекта.",
        goals: "Основные цели проекта.",
        ownerId: owner.id,
        ...(requiredSkillIds.length
          ? { requiredSkillIds: { set: requiredSkillIds } }
          : {}),
        members: {
          create: [
            { userId: owner.id, role: "OWNER" },
            ...extraMembers.map((u) => ({
              userId: u.id,
              role: "MEMBER",
            })),
          ],
        },
      },
    });
  }

  function unionSkillIds(...userList) {
    const s = new Set();
    for (const u of userList) {
      for (const sid of u.skillIds || []) {
        s.add(sid);
      }
    }
    return [...s];
  }

  /** ~90% требуемых навыков из объединения навыков участников, остальное — из общего списка */
  function skillSubset90FromUnion(memberUsers, totalRequired) {
    const U = unionSkillIds(...memberUsers);
    const nInside = Math.floor(totalRequired * 0.9);
    const nOutside = totalRequired - nInside;
    const fromU = shuffle([...U]).slice(0, Math.min(nInside, U.length));
    const outsidePool = skillIds.filter((id) => !U.includes(id));
    const fromOutside = shuffle(outsidePool).slice(
      0,
      totalRequired - fromU.length,
    );
    const combined = [...fromU, ...fromOutside];
    if (combined.length < totalRequired) {
      return shuffle(skillIds).slice(0, totalRequired);
    }
    return combined.slice(0, totalRequired);
  }

  const slot = shuffle([...Array(50).keys()]);
  const [iO0, iO1, iO2, iO3, iO4, iA, iB, iC, iD, iE, iF, iG, iH, iI] = slot;

  const o0 = users[iO0];
  const o1 = users[iO1];
  const o2 = users[iO2];
  const o3 = users[iO3];
  const o4 = users[iO4];
  const A = users[iA];
  const B = users[iB];
  const C = users[iC];
  const D = users[iD];
  const E = users[iE];
  const F = users[iF];
  const G = users[iG];
  const H = users[iH];
  const I = users[iI];

  const projectUserIds = new Set([
    o0.id,
    o1.id,
    o2.id,
    o3.id,
    o4.id,
    A.id,
    B.id,
    C.id,
    D.id,
    E.id,
    F.id,
    G.id,
    H.id,
    I.id,
  ]);
  if (projectUserIds.size !== 14) {
    throw new Error(
      "Внутренняя ошибка: пересечение слотов участников проектов.",
    );
  }

  const skillPack = shuffle(skillIds);
  let sp = 0;
  for (const uid of projectUserIds) {
    const chunk = [];
    for (let k = 0; k < 8; k++) {
      chunk.push(skillPack[(sp + k) % skillPack.length]);
    }
    sp += 3;
    await prisma.user.update({
      where: { id: uid },
      data: { skillIds: [...new Set(chunk)] },
    });
  }

  const uWithSkills = await prisma.user.findMany({
    where: { id: { in: [...projectUserIds] } },
  });
  const byId = new Map(uWithSkills.map((u) => [u.id, u]));
  const reload = (u) => byId.get(u.id);

  await createProject(o0, [reload(A), reload(B)], []);
  await createProject(
    o1,
    [reload(o0), reload(C)],
    skillSubset90FromUnion([reload(o1), reload(o0), reload(C)], rndInt(8, 14)),
  );
  await createProject(
    o2,
    [reload(D), reload(E)],
    skillSubset90FromUnion([reload(o2), reload(D), reload(E)], rndInt(8, 14)),
  );
  await createProject(
    o3,
    [reload(F), reload(G)],
    skillSubset90FromUnion([reload(o3), reload(F), reload(G)], rndInt(8, 14)),
  );
  await createProject(
    o4,
    [reload(H), reload(I)],
    skillSubset90FromUnion([reload(o4), reload(H), reload(I)], rndInt(8, 14)),
  );

  const projects = await prisma.project.findMany({
    where: { ownerId: { in: [o0.id, o1.id, o2.id, o3.id, o4.id] } },
    orderBy: { createdAt: "asc" },
  });

  console.log("Демо-данные созданы:");
  console.log(`  пользователей: ${users.length}, пароль у всех: ${PASSWORD}`);
  console.log(`  подписок (Follows): ${followRows.length}`);
  console.log(`  постов: ${postsCreated.length}`);
  console.log(
    `  проектов: ${projects.length} (без требований по навыкам — один; у остальных требования на ~90% из навыков участников)`,
  );
  console.log(
    `  пересечение ролей: ${o0.email} — владелец своего проекта и участник проекта ${o1.email}`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
