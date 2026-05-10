const express = require("express");
const path = require("path");
const router = express.Router();
const multer = require("multer");
const { decodeUploadOriginalName } = require("../controllers/_utils");
const {
  UserController,
  PostController,
  CommentController,
  LikeController,
  FollowController,
  SkillController,
  ProjectController,
  ApplicationController,
  MemberController,
} = require("../controllers");
const authenticateToken = require("../middleware/auth");

const destination = "uploads";

//Показываем, место хранения файлов
const storage = multer.diskStorage({
  destination,
  filename: function (req, file, cb) {
    const decoded = decodeUploadOriginalName(file.originalname);
    let ext = path.extname(decoded);

    if (!ext) {
      ext = path.extname(file.originalname) || "";
    }

    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

const uploads = multer({ storage });

const resumeMimeAllowlist = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const profileUpload = multer({
  storage,
  limits: { fileSize: 12 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    if (file.fieldname === "resume") {
      if (!resumeMimeAllowlist.has(file.mimetype)) {
        return cb(
          new Error("Допустимы только PDF или документы Word (.doc, .docx)"),
        );
      }
    }
    cb(null, true);
  },
});

//Роуты для пользователя
router.post("/register", UserController.register);
router.post("/login", UserController.login);

router.get("/current", authenticateToken, UserController.current);
router.get("/users", authenticateToken, UserController.searchUsers);
router.get(
  "/users/:id/followers",
  authenticateToken,
  FollowController.listFollowers,
);
router.get(
  "/users/:id/following",
  authenticateToken,
  FollowController.listFollowing,
);
router.get("/users/:id", authenticateToken, UserController.getUserById);
router.put(
  "/users/:id",
  authenticateToken,
  (req, res, next) => {
    profileUpload.fields([
      { name: "avatar", maxCount: 1 },
      { name: "resume", maxCount: 1 },
    ])(req, res, (err) => {
      if (err) {
        const message =
          err.message === "File too large"
            ? "Файл слишком большой"
            : err.message || "Ошибка загрузки файла";
        return res.status(400).json({ error: message });
      }
      next();
    });
  },
  UserController.updateUser,
);

//Роуты для постов
router.post(
  "/posts",
  authenticateToken,
  uploads.array("files"),
  PostController.createPost,
);
router.get("/posts", authenticateToken, PostController.getAllPosts);
router.get("/posts/:id", authenticateToken, PostController.getPostById);
router.get(
  "/posts/:id/comments",
  authenticateToken,
  CommentController.listComments,
);
router.patch(
  "/posts/:id",
  authenticateToken,
  uploads.array("files"),
  PostController.updatePost,
);
router.delete("/posts/:id", authenticateToken, PostController.deletePost);

//Роуты для комментариев
router.post(
  "/comments",
  authenticateToken,
  uploads.array("files"),
  CommentController.createComment,
);
router.patch(
  "/comments/:id",
  authenticateToken,
  uploads.array("files"),
  CommentController.updateComment,
);
router.delete(
  "/comments/:id",
  authenticateToken,
  CommentController.deleteComment,
);
router.post(
  "/comments/:id/like",
  authenticateToken,
  CommentController.likeComment,
);
router.delete(
  "/comments/:id/like",
  authenticateToken,
  CommentController.unlikeComment,
);

//Роту для лайков
router.post("/likes", authenticateToken, LikeController.likePost);
router.delete("/likes/:id", authenticateToken, LikeController.unlikePost);

//Роту для подписок
router.post("/follow", authenticateToken, FollowController.followUser);
router.delete(
  "/unfollow/:id",
  authenticateToken,
  FollowController.unfollowUser,
);

//Роуты для навыков
router.get("/skills", authenticateToken, SkillController.list);
router.post("/skills", authenticateToken, SkillController.create);

//Роуты для проектов
router.post("/projects", authenticateToken, ProjectController.createProject);
router.get("/projects", authenticateToken, ProjectController.getAllProjects);
router.get(
  "/projects/:id",
  authenticateToken,
  ProjectController.getProjectById,
);
router.put("/projects/:id", authenticateToken, ProjectController.updateProject);
router.delete(
  "/projects/:id",
  authenticateToken,
  ProjectController.deleteProject,
);

//Роуты для заявок на проект
router.post(
  "/projects/:id/apply",
  authenticateToken,
  ApplicationController.apply,
);
router.get(
  "/projects/:id/applications",
  authenticateToken,
  ApplicationController.listApplications,
);
router.patch(
  "/applications/:id",
  authenticateToken,
  ApplicationController.decide,
);
router.delete(
  "/applications/:id",
  authenticateToken,
  ApplicationController.cancel,
);

//Роуты для участников проекта
router.get(
  "/projects/:id/members",
  authenticateToken,
  MemberController.listMembers,
);
router.delete(
  "/projects/:id/members/:userId",
  authenticateToken,
  MemberController.removeMember,
);

module.exports = router;
