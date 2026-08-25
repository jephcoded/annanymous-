const router = require("express").Router();
const postController = require("../controllers/postController");
const authMiddleware = require("../middleware/authMiddleware");
const optionalAuthMiddleware = require("../middleware/optionalAuthMiddleware");
const { createPostLimiter } = require("../middleware/rateLimiter");

router.get("/", optionalAuthMiddleware, postController.listFeed);
router.post("/", authMiddleware, createPostLimiter, postController.createPost);
router.get("/:postId", optionalAuthMiddleware, postController.getPost);
router.post("/:postId/flag", authMiddleware, postController.flagPost);
router.post(
  "/:postId/reactions",
  authMiddleware,
  postController.setReaction,
);
router.delete(
  "/:postId/reactions",
  authMiddleware,
  postController.removeReaction,
);
router.delete("/:postId", authMiddleware, postController.deletePost);

module.exports = router;
