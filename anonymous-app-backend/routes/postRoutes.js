const router = require("express").Router();
const postController = require("../controllers/postController");
const authMiddleware = require("../middleware/authMiddleware");
const { createPostLimiter } = require("../middleware/rateLimiter");

router.get("/", postController.listFeed);
router.post("/", authMiddleware, createPostLimiter, postController.createPost);
router.get("/:postId", postController.getPost);
router.post("/:postId/flag", authMiddleware, postController.flagPost);

module.exports = router;
