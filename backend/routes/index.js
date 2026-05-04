const express = require("express");
const router = express.Router();
const multer = require("multer");
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
    cb(null, file.originalname);
  },
});

const uploads = multer({ storage });

//Роуты для пользователя
router.post("/register", UserController.register);
router.post("/login", UserController.login);
router.get("/current", authenticateToken, UserController.current);
router.get("/users", authenticateToken, UserController.searchUsers);
router.get("/users/:id", authenticateToken, UserController.getUserById);
router.put(
  "/users/:id",
  authenticateToken,
  uploads.single("avatar"),
  UserController.updateUser
);

//Роуты для постов
router.post("/posts", authenticateToken, PostController.createPost);
router.get("/posts", authenticateToken, PostController.getAllPosts);
router.get("/posts/:id", authenticateToken, PostController.getPostById);
router.delete("/posts/:id", authenticateToken, PostController.deletePost);

//Роуты для комментариев
router.post("/comments", authenticateToken, CommentController.createComment);
router.delete(
  "/comments/:id",
  authenticateToken,
  CommentController.deleteComment
);

//Роту для лайков
router.post("/likes", authenticateToken, LikeController.likePost);
router.delete("/likes/:id", authenticateToken, LikeController.unlikePost);

//Роту для подписок
router.post("/follow", authenticateToken, FollowController.followUser);
router.delete(
  "/unfollow/:id",
  authenticateToken,
  FollowController.unfollowUser
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
  ProjectController.getProjectById
);
router.put(
  "/projects/:id",
  authenticateToken,
  ProjectController.updateProject
);
router.delete(
  "/projects/:id",
  authenticateToken,
  ProjectController.deleteProject
);

//Роуты для заявок на проект
router.post(
  "/projects/:id/apply",
  authenticateToken,
  ApplicationController.apply
);
router.get(
  "/projects/:id/applications",
  authenticateToken,
  ApplicationController.listApplications
);
router.patch(
  "/applications/:id",
  authenticateToken,
  ApplicationController.decide
);
router.delete(
  "/applications/:id",
  authenticateToken,
  ApplicationController.cancel
);

//Роуты для участников проекта
router.get(
  "/projects/:id/members",
  authenticateToken,
  MemberController.listMembers
);
router.delete(
  "/projects/:id/members/:userId",
  authenticateToken,
  MemberController.removeMember
);

module.exports = router;
