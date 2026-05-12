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
const {
  MAX_POST_ATTACHMENTS,
  POST_ATTACHMENTS_LIMIT_ERROR,
} = require("../lib/post-attachments");
const {
  MAX_PROJECT_ATTACHMENTS,
  PROJECT_ATTACHMENTS_LIMIT_ERROR,
} = require("../lib/project-attachments");

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

function rejectSvgImageAttachments(req, file, cb) {
  if (
    file.mimetype === "image/svg+xml" ||
    /\.svg$/i.test(String(file.originalname || ""))
  ) {
    return cb(
      new Error(
        "Формат SVG для изображений не поддерживается. Загрузите PNG или JPEG.",
      ),
    );
  }
  cb(null, true);
}

const uploads = multer({ storage, fileFilter: rejectSvgImageAttachments });

const postFilesUpload = uploads.array("files", MAX_POST_ATTACHMENTS);

function handlePostFilesUpload(req, res, next) {
  postFilesUpload(req, res, (err) => {
    if (!err) {
      return next();
    }
    if (err.code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(400).json({ error: POST_ATTACHMENTS_LIMIT_ERROR });
    }
    const message =
      err.code === "LIMIT_FILE_SIZE" || err.message === "File too large"
        ? "Файл слишком большой"
        : err.message || "Ошибка загрузки файла";
    return res.status(400).json({ error: message });
  });
}

function handleUploadError(uploadMiddleware) {
  return (req, res, next) => {
    uploadMiddleware(req, res, (err) => {
      if (err) {
        const message =
          err.message === "File too large"
            ? "Файл слишком большой"
            : err.message || "Ошибка загрузки файла";
        return res.status(400).json({ error: message });
      }
      next();
    });
  };
}

const resumeMimeAllowlist = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const projectDocumentsUpload = multer({
  storage,
  limits: { fileSize: 12 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    if (file.fieldname !== "documents") {
      return cb(new Error("Некорректное поле файла"));
    }
    if (!resumeMimeAllowlist.has(file.mimetype)) {
      return cb(
        new Error("Допустимы только PDF или документы Word (.doc, .docx)"),
      );
    }
    cb(null, true);
  },
}).array("documents", MAX_PROJECT_ATTACHMENTS);

function handleProjectDocumentsUpload(req, res, next) {
  projectDocumentsUpload(req, res, (err) => {
    if (!err) {
      return next();
    }
    if (err.code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(400).json({ error: PROJECT_ATTACHMENTS_LIMIT_ERROR });
    }
    const message =
      err.code === "LIMIT_FILE_SIZE" || err.message === "File too large"
        ? "Файл слишком большой"
        : err.message || "Ошибка загрузки файла";
    return res.status(400).json({ error: message });
  });
}

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
    if (file.fieldname === "avatar") {
      if (
        file.mimetype === "image/svg+xml" ||
        /\.svg$/i.test(String(file.originalname || ""))
      ) {
        return cb(
          new Error(
            "Формат SVG для изображений не поддерживается. Загрузите PNG или JPEG.",
          ),
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
router.get(
  "/users/:id/projects",
  authenticateToken,
  UserController.listUserProjects,
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
  handlePostFilesUpload,
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
  handlePostFilesUpload,
  PostController.updatePost,
);
router.delete("/posts/:id", authenticateToken, PostController.deletePost);

//Роуты для комментариев
router.post(
  "/comments",
  authenticateToken,
  handleUploadError(uploads.array("files")),
  CommentController.createComment,
);
router.patch(
  "/comments/:id",
  authenticateToken,
  handleUploadError(uploads.array("files")),
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
router.get("/skills/resolve", authenticateToken, SkillController.resolveByIds);
router.post("/skills", authenticateToken, SkillController.create);

//Роуты для проектов
router.post(
  "/projects",
  authenticateToken,
  handleProjectDocumentsUpload,
  ProjectController.createProject,
);
router.get("/projects", authenticateToken, ProjectController.getAllProjects);
router.get(
  "/projects/managed",
  authenticateToken,
  ProjectController.listManagedProjects,
);
router.get(
  "/projects/:id",
  authenticateToken,
  ProjectController.getProjectById,
);
router.put(
  "/projects/:id",
  authenticateToken,
  handleProjectDocumentsUpload,
  ProjectController.updateProject,
);
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
router.post(
  "/projects/:id/invitations",
  authenticateToken,
  ApplicationController.inviteToProject,
);
router.get(
  "/projects/:id/applications",
  authenticateToken,
  ApplicationController.listApplications,
);
router.post(
  "/applications/:id/accept",
  authenticateToken,
  ApplicationController.acceptAsInvitee,
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
router.patch(
  "/projects/:id/members/:userId",
  authenticateToken,
  MemberController.updateMemberRole,
);
router.delete(
  "/projects/:id/members/:userId",
  authenticateToken,
  MemberController.removeMember,
);

module.exports = router;
